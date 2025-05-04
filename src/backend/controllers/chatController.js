const magenticOneService = require('../services/magenticOneService');
const historyManager = require('../utils/historyManager');

const chatController = {
  // Get the chat history
  getChatHistory: async (req, res) => {
    try {
      const history = await historyManager.getHistory();
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  },

  // Send a new message and get response
  sendMessage: async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Add message to history
      await historyManager.addMessage('user', message);

      // Process message through orchestration service
      const response = await magenticOneService.processMessage(message);

      // Add response to history
      await historyManager.addMessage('assistant', response);

      res.json({ response });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  },

  // Clear the chat history
  clearChatHistory: async (req, res) => {
    try {
      await historyManager.clearHistory();
      res.json({ message: 'Chat history cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear chat history' });
    }
  }
};

module.exports = chatController; 