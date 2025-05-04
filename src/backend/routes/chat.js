const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { validateMessageMiddleware } = require('../middleware/validation');

// Get chat history
router.get('/history', chatController.getChatHistory);

// Send a new message
router.post('/message', validateMessageMiddleware, chatController.sendMessage);

// Clear chat history
router.delete('/history', chatController.clearChatHistory);

module.exports = router; 