const express = require('express');
const ConversationController = require('../controllers/conversationController');
const validation = require('../middleware/validation');

module.exports = (databaseService) => {
  const router = express.Router();
  const conversationController = new ConversationController(databaseService);

  // Add database service to request object for middleware access
  router.use((req, res, next) => {
    req.db = databaseService;
    next();
  });

  // Get all conversations
  router.get('/', conversationController.getConversations);

  // Get single conversation with messages
  router.get('/:id', validation.validateUUID, conversationController.getConversation);

  // Create new conversation
  router.post('/', validation.validateConversationCreation, conversationController.createConversation);

  // Update conversation
  router.put('/:id', validation.validateUUID, validation.validateConversationUpdate, conversationController.updateConversation);

  // Delete conversation
  router.delete('/:id', validation.validateUUID, conversationController.deleteConversation);

  // Search conversations
  router.get('/search/query', conversationController.searchConversations);

  // Export conversation
  router.get('/:id/export', validation.validateUUID, conversationController.exportConversation);

  // Get conversation statistics
  router.get('/stats/overview', conversationController.getStats);

  return router;
};