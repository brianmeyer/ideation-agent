const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const config = require('../config/config');
const logger = require('./utils/logger');
const container = require('./utils/container');
const { healthCheckMiddleware, checkHealth } = require('./middleware/healthCheck');
const { validateMessage, validateMessageMiddleware } = require('./middleware/validation');
const { apiLimiter, chatLimiter } = require('./middleware/rateLimiter');
const CacheService = require('./services/cacheService');
const MagenticOneService = require('./services/magenticOneService');

// Import routes
const chatRoutes = require('./routes/chat');

// Initialize services
const cacheService = new CacheService();
const magenticOneService = new MagenticOneService();

// Register services in container
container.register('cacheService', CacheService);
container.register('magenticOneService', MagenticOneService, ['cacheService']);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));
app.use(healthCheckMiddleware);

// API versioning with rate limiting
app.use('/api/v1', apiLimiter, chatRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await checkHealth();
  res.json(health);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Socket.IO connection handling with rate limiting
io.on('connection', (socket) => {
  logger.info('New client connected', { socketId: socket.id });

  // Apply rate limiting to socket events
  const messageQueue = [];
  let isProcessing = false;

  const processMessageQueue = async () => {
    if (isProcessing || messageQueue.length === 0) return;
    
    isProcessing = true;
    const message = messageQueue.shift();
    
    try {
      // Validate message
      const validationResult = validateMessage(message);
      if (validationResult.error) {
        socket.emit('error', { message: validationResult.error.details[0].message });
        isProcessing = false;
        processMessageQueue();
        return;
      }

      // Use the validated message content
      const validatedMessage = validationResult.value.content;

      // Check cache first
      const cacheKey = `message:${validatedMessage}`;
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        io.emit('chat message', {
          role: 'assistant',
          content: cachedResponse,
          timestamp: new Date(),
          isFinal: true
        });
        isProcessing = false;
        processMessageQueue();
        return;
      }

      // Broadcast the user message
      io.emit('chat message', { 
        role: 'user', 
        content: validatedMessage,
        timestamp: new Date()
      });
      
      // Start collaborative ideation
      io.emit('agent_status', { 
        status: 'brainstorming',
        agent: 'Creative Agent',
        message: 'Generating ideas...'
      });
      
      const creativeIdeas = await magenticOneService.getAgentResponse('creative', validatedMessage, [], 'brainstorming');
      
      io.emit('agent_message', {
        role: 'creative',
        content: creativeIdeas,
        timestamp: new Date()
      });
      
      io.emit('agent_status', {
        status: 'analyzing',
        agent: 'Reasoning Agent',
        message: 'Breaking down the problem...'
      });
      
      const initialAnalysis = await magenticOneService.getAgentResponse('reasoning', creativeIdeas, [], 'initial_analysis');
      
      io.emit('agent_message', {
        role: 'reasoning',
        content: initialAnalysis,
        timestamp: new Date()
      });
      
      io.emit('agent_status', {
        status: 'evaluating',
        agent: 'Logical Agent',
        message: 'Evaluating solutions...'
      });
      
      const logicalEvaluation = await magenticOneService.getAgentResponse('logical', initialAnalysis, [], 'evaluation');
      
      io.emit('agent_message', {
        role: 'logical',
        content: logicalEvaluation,
        timestamp: new Date()
      });
      
      // Start collaborative iteration
      let previousResponses = {
        creative: creativeIdeas,
        reasoning: initialAnalysis,
        logical: logicalEvaluation
      };
      
      const startTime = Date.now();
      const IDEATION_TIME_LIMIT = config.IDEATION_TIME_LIMIT;
      
      while (true) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= IDEATION_TIME_LIMIT) {
          break;
        }
        
        io.emit('agent_status', {
          status: 'collaborating',
          message: `Time remaining: ${Math.ceil(IDEATION_TIME_LIMIT - elapsedTime)}s`
        });
        
        const agentResponses = await Promise.all(
          Object.keys(magenticOneService.agents).map(async (agentType) => {
            const context = magenticOneService.buildCollaborationContext(previousResponses, agentType);
            const response = await magenticOneService.getAgentResponse(agentType, context, [], `iteration_${Math.floor(elapsedTime)}`);
            
            io.emit('agent_message', {
              role: agentType,
              content: response,
              timestamp: new Date()
            });
            
            return { agent: agentType, response };
          })
        );
        
        agentResponses.forEach(({ agent, response }) => {
          previousResponses[agent] = response;
        });
        
        // Add a small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Generate final response using the improved synthesis method
      const finalResponse = await magenticOneService.generateFinalResponse(previousResponses);
      
      // Emit final response
      io.emit('chat message', {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date(),
        isFinal: true
      });
      
      // Cache the final response
      await cacheService.set(cacheKey, finalResponse);
      
    } catch (error) {
      logger.error('Error processing message:', { error: error.message, stack: error.stack });
      socket.emit('error', { message: 'An error occurred while processing your message' });
    } finally {
      isProcessing = false;
      processMessageQueue();
    }
  };

  // Handle incoming messages with rate limiting
  socket.on('chat message', async (message) => {
    try {
      // Apply rate limiting
      const canProceed = await chatLimiter.check(socket.id);
      if (!canProceed) {
        socket.emit('error', { message: 'Rate limit exceeded. Please wait a moment.' });
        return;
      }
      
      messageQueue.push(message);
      processMessageQueue();
    } catch (error) {
      logger.error('Error handling chat message:', { error: error.message, stack: error.stack });
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'An error occurred while processing your message';
      if (error.message.includes('API key')) {
        errorMessage = 'API configuration error. Please contact support.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message.includes('Model not found')) {
        errorMessage = 'Service configuration error. Please contact support.';
      } else if (error.message.includes('No response')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      socket.emit('error', { message: errorMessage });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Start server with port fallback
const startServer = (port) => {
  server.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use, trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      logger.error('Server error:', { error: err.message, stack: err.stack });
    }
  });
};

startServer(config.PORT); 