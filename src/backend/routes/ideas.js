const express = require('express');

module.exports = (databaseService) => {
  const router = express.Router();

  // Add database service to request object for middleware access
  router.use((req, res, next) => {
    req.db = databaseService;
    next();
  });

  // Get all ideas
  router.get('/', async (req, res) => {
    try {
      const { limit = 100, category } = req.query;
      const ideas = await databaseService.getAllIdeas(parseInt(limit), category);
      
      res.json({
        success: true,
        ideas: ideas || [],
        count: ideas ? ideas.length : 0
      });
    } catch (error) {
      console.error('Error fetching ideas:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ideas'
      });
    }
  });

  // Get ideas for a specific conversation
  router.get('/conversation/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const ideas = await databaseService.getIdeasByConversation(conversationId);
      
      res.json({
        success: true,
        ideas: ideas || [],
        count: ideas ? ideas.length : 0
      });
    } catch (error) {
      console.error('Error fetching ideas for conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ideas for conversation'
      });
    }
  });

  return router;
};