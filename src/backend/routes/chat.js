const express = require('express');
const ChatController = require('../controllers/chatController');
const validation = require('../middleware/validation');

module.exports = (databaseService) => {
  const router = express.Router();
  const chatController = new ChatController(databaseService);

  // Add database service to request object for middleware access
  router.use((req, res, next) => {
    req.db = databaseService;
    next();
  });

  // Add route logging middleware
  router.use((req, res, next) => {
    console.log(`[Chat Route] ${req.method} ${req.path}`);
    next();
  });

  // Create a new conversation
  router.post('/conversation', validation.validateConversationCreation, chatController.createConversation);

  // Get chat history for a conversation
  router.get('/history', validation.validateConversationId, chatController.getChatHistory);

  // Send a new message
  router.post('/message', validation.validateMessage, chatController.sendMessage);

  // Clear chat history for a conversation
  router.delete('/history', validation.validateConversationId, chatController.clearChatHistory);

  return router;
}; 