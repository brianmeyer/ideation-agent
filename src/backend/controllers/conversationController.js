const logger = require('../utils/logger');

class ConversationController {
  constructor(databaseService) {
    this.db = databaseService;
    
    // Bind methods to preserve 'this' context
    this.getConversations = this.getConversations.bind(this);
    this.getConversation = this.getConversation.bind(this);
    this.createConversation = this.createConversation.bind(this);
    this.updateConversation = this.updateConversation.bind(this);
    this.deleteConversation = this.deleteConversation.bind(this);
    this.searchConversations = this.searchConversations.bind(this);
    this.exportConversation = this.exportConversation.bind(this);
    this.getStats = this.getStats.bind(this);
  }

  // Get all conversations
  async getConversations(req, res) {
    try {
      console.log('getConversations called, db:', !!this.db);
      const limit = parseInt(req.query.limit) || 50;
      console.log('Calling db.getConversations with limit:', limit);
      const conversations = await this.db.getConversations(limit);
      console.log('Got conversations:', conversations.length);
      
      res.json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      console.error('Error in getConversations:', error);
      logger.error('Error fetching conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations'
      });
    }
  }

  // Get single conversation with messages
  async getConversation(req, res) {
    try {
      const { id } = req.params;
      const conversation = await this.db.getConversationWithMessages(id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error fetching conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation'
      });
    }
  }

  // Create new conversation
  async createConversation(req, res) {
    try {
      const { title } = req.body;
      const conversationId = await this.db.createConversation(title);
      
      const conversation = await this.db.getConversation(conversationId);
      
      res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error creating conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create conversation'
      });
    }
  }

  // Update conversation
  async updateConversation(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await this.db.updateConversation(id, updates);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      const conversation = await this.db.getConversation(id);
      
      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error updating conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update conversation'
      });
    }
  }

  // Delete conversation
  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      const result = await this.db.deleteConversation(id);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete conversation'
      });
    }
  }

  // Search conversations
  async searchConversations(req, res) {
    try {
      const { q: query, limit = 20 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const conversations = await this.db.searchConversations(query, parseInt(limit));
      
      res.json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      logger.error('Error searching conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search conversations'
      });
    }
  }

  // Export conversation
  async exportConversation(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;
      
      const conversation = await this.db.getConversationWithMessages(id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      if (format === 'json') {
        res.json({
          success: true,
          data: conversation
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        });
      }
    } catch (error) {
      logger.error('Error exporting conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export conversation'
      });
    }
  }

  // Get conversation statistics
  async getStats(req, res) {
    try {
      const stats = await this.db.getConversationStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching conversation stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = ConversationController;