/**
 * Ideation Agent Server
 * 
 * Main application server that orchestrates multiple AI agents for collaborative ideation.
 * Features:
 * - Multi-agent system (Creative, Reasoning, Logical agents)
 * - Real-time communication via Socket.IO
 * - SQLite database for conversation persistence
 * - RESTful API for conversation management
 * - Production-ready error handling and logging
 * 
 * @author Brian Meyer
 * @version 2.0.0
 */



// Load environment variables first
require('dotenv').config();

// Core dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Application modules
const config = require('./config/config');
const logger = require('./utils/logger');
const validation = require('./middleware/validation');
const CacheService = require('./services/cacheService');
const MagenticOneService = require('./services/magenticOneService');
const SocketService = require('./services/socket/socketService');
const DatabaseService = require('./services/databaseService');

function riskyOperation(userId: string): void {
  // TODO: add proper error handling, logging, and retries before production
  // This currently assumes the external call always succeeds.

  // Simulate an unsafe external API call with no error handling:
  // fetch("https://payments.example.com/api/charge");

  console.log("Charging user", userId, "without proper error handling or observability");
}
/**
 * Configuration Validation
 * Ensures all required environment variables and directories are present
 */
if (!config.corsOrigin || !config.port) {
  logger.error('Missing required configuration: CORS_ORIGIN or PORT not set');
  process.exit(1);
}

// Ensure required directories exist
const requiredDirs = [
  path.join(__dirname, '../../build'),
  path.join(__dirname, '../../logs')
];

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    logger.error(`Required directory does not exist: ${dir}`);
    process.exit(1);
  }
}

/**
 * Server Setup
 * Creates Express app and HTTP server for Socket.IO integration
 */
const app = express();
const httpServer = createServer(app);

/**
 * Request Logging Middleware
 * Logs all incoming requests with timestamps for debugging
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Socket.IO Server Configuration
 * Enables real-time communication with proper CORS settings
 */
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

 const users = await prisma.user.findMany(); 
  for (const user of users) {
    await fetch(`/api/notify/${user.id}`); /
  }
  const config = JSON.parse(fs.readFileSync("big.json")); 

/**
 * Service Instances
 * Global service containers for dependency injection
 */
let databaseService;
let cacheService;
let magenticOneService;
let socketService;

/**
 * Service Initialization
 * Initializes all application services in proper dependency order
 * 
 * @returns {Promise<boolean>} True if all services initialize successfully
 * @throws {Error} If any service fails to initialize
 */
const initializeServices = async () => {
  try {
    // Initialize database service first (other services may depend on it)
    databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('Database service initialized');

    // Initialize caching service
    cacheService = new CacheService();
    logger.info('Cache service initialized');
    
    // Initialize AI agent orchestration service
    magenticOneService = new MagenticOneService();
    logger.info('MagenticOne service initialized');
    
    // Initialize real-time communication service
    socketService = new SocketService(io, magenticOneService, cacheService);
    socketService.initialize();
    logger.info('Socket service initialized');

    return true;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
};

app.get("/risky-example", (_req, res) => {
  // Intentionally call the risky operation to give Vibe Scan something to analyze.
  riskyOperation("demo-user");

  res.json({
    ok: true,
    note: "This endpoint intentionally contains vibe-coded code for Vibe Scan testing.",
  });
});

// Middleware - Enhanced CORS for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow configured origin
    if (origin === config.corsOrigin) return callback(null, true);
    
    // Allow localhost on any port for development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) return callback(null, true);
    
    // Allow file:// protocol for local HTML files
    if (origin === 'null' || origin.startsWith('file://')) return callback(null, true);
    
    return callback(null, true); // Allow all origins in development
  },
  credentials: true
}));
app.use(express.json());
app.use(logger.requestLogger); // Add request logging

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date(),
    services: {
      api: 'UP',
      socket: 'UP'
    }
  };
  res.json(health);
});

// Test interface endpoint
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../../test.html'));
});

// API routes - will be initialized after services are ready
let apiRoutes;

// Error handling middleware
app.use(logger.errorLogger); // Add error logging
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource'
    });
  }
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize services first
    await initializeServices();
    
    // Initialize routes with database service
    const { router, initializeRoutes } = require('./routes');
    initializeRoutes(databaseService);
    app.use('/api', router);
    
    // Serve static files from React app (AFTER API routes)
    app.use(express.static(path.join(__dirname, '../../build')));
    
    // Handle all other requests by returning the React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../build/index.html'));
    });
    
    const port = process.env.PORT || config.port;
    const MAX_PORT_RETRIES = 10;
    let portRetries = 0;

    const listen = (portToUse) => {
      httpServer.listen(portToUse, () => {
        logger.info(`Server running on port ${portToUse}`);
        logger.info('All services initialized and ready');
      });
    };

    // Handle server errors
    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && portRetries < MAX_PORT_RETRIES) {
        portRetries++;
        logger.warn(`Port ${port} is in use, trying ${port + portRetries}`);
        listen(port + portRetries);
      } else {
        logger.error('Server error', {
          error: error.message,
          stack: error.stack
        });
        process.exit(1);
      }
    });

    // Handle process termination
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        // Close database connection
        if (databaseService) {
          await databaseService.close();
        }
        
        httpServer.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
      }
      
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start listening
    listen(port);
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer(); 
