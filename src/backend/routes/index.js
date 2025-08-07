const express = require('express');
const router = express.Router();

// This will be initialized in server.js with dependency injection
let chatRoutes;
let conversationRoutes;
let ideasRoutes;

const initializeRoutes = (databaseService) => {
  chatRoutes = require('./chat')(databaseService);
  conversationRoutes = require('./conversations')(databaseService);
  ideasRoutes = require('./ideas')(databaseService);
  
  // Mount routes
  router.use('/chat', chatRoutes);
  router.use('/conversations', conversationRoutes);
  router.use('/ideas', ideasRoutes);
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ideation-agent-api'
  });
});

// Stats endpoint
router.get('/stats', async (req, res) => {
  try {
    if (!req.db) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database service not available' 
      });
    }
    
    const stats = await req.db.getConversationStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

module.exports = { router, initializeRoutes }; 