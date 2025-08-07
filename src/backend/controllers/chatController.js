const MagenticOneService = require('../services/magenticOneService');
const IdeaExtractionService = require('../services/ideaExtractionService');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config/config');

class ChatController {
  constructor(databaseService) {
    this.db = databaseService;
    this.magenticOneService = new MagenticOneService();
    this.ideaExtractionService = new IdeaExtractionService(databaseService);
  }

  // Get the chat history for a specific conversation
  getChatHistory = async (req, res) => {
    try {
      const { conversationId } = req.query;
      
      if (!conversationId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Conversation ID is required' 
        });
      }

      const conversation = await this.db.getConversationWithMessages(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversation not found' 
        });
      }

      // Format messages for compatibility with existing frontend
      const history = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        agentType: msg.agent_type,
        metadata: msg.metadata
      }));

      res.json({ 
        success: true,
        history,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve chat history:', { error: error.message });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve chat history' 
      });
    }
  };

  // Create a new conversation
  createConversation = async (req, res) => {
    try {
      const { title = 'New Conversation' } = req.body;
      const conversationId = await this.db.createConversation(title);
      
      const conversation = await this.db.getConversation(conversationId);
      
      res.status(201).json({ 
        success: true,
        conversationId,
        conversation
      });
    } catch (error) {
      logger.error('Failed to create new conversation:', { error: error.message });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create new conversation' 
      });
    }
  };

  // Send a new message and get response
  sendMessage = async (req, res) => {
    try {
      const { message, conversationId } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message is required' 
        });
      }

      if (!conversationId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Conversation ID is required' 
        });
      }

      // Verify conversation exists
      const conversation = await this.db.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversation not found' 
        });
      }

      // Add user message to database
      await this.db.addMessage(conversationId, 'user', message);

      // Get conversation context
      const messages = await this.db.getMessages(conversationId);
      const context = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        agentType: msg.agent_type
      }));

      let response;
      const userMessages = messages.filter(msg => msg.role === 'user');
      
      // Process the message (includes slash command detection)
      const result = await this.magenticOneService.processMessage(message, context, false);
      
      // Handle command responses
      if (result && typeof result === 'object' && result.type === 'command') {
        if (result.shouldTriggerIdeation && result.message) {
          // Process the command's message through ideation
          response = await this.magenticOneService.processIdeationMessage(result.message, context);
          
          // Add a command indicator to the response
          const commandInfo = result.action === 'help' ? '' : `\n\n*Triggered by: /${result.action} command*`;
          response = `${response}${commandInfo}`;
        } else {
          // Direct command response (like /help)
          response = result.message;
        }
      } else {
        // All non-command messages are handled as normal chat
        response = result;
      }

      // Add response to database
      const messageId = await this.db.addMessage(conversationId, 'assistant', response);

      // Extract ideas from ideation sessions (async, don't wait)
      if (typeof response === 'string' && this.ideaExtractionService.isIdeationSession(response)) {
        this.ideaExtractionService.extractIdeasFromSession(conversationId, response, messageId)
          .then(extractedIdeas => {
            if (extractedIdeas.length > 0) {
              logger.info(`Extracted ${extractedIdeas.length} ideas from conversation ${conversationId}`);
            }
          })
          .catch(error => {
            logger.error('Background idea extraction failed:', error);
          });
      }

      // Auto-generate title from first exchange if still default
      if (conversation.title === 'New Conversation' && userMessages.length === 1) {
        try {
          const title = await this.generateConversationTitle(message, response);
          await this.db.updateConversation(conversationId, { title });
        } catch (error) {
          console.error('Error updating conversation title:', error);
          // Continue without title update
        }
      }

      res.json({ 
        success: true, 
        response, 
        conversationId 
      });
    } catch (error) {
      logger.error('Error processing message:', { error: error.message });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process message' 
      });
    }
  };

  // Clear the chat history for a specific conversation
  clearChatHistory = async (req, res) => {
    try {
      const { conversationId } = req.query;
      
      if (!conversationId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Conversation ID is required' 
        });
      }

      // Delete all messages for the conversation
      await this.db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
      
      // Reset conversation title
      await this.db.updateConversation(conversationId, { 
        title: 'New Conversation' 
      });

      res.json({ 
        success: true, 
        message: 'Chat history cleared' 
      });
    } catch (error) {
      logger.error('Failed to clear chat history:', { error: error.message });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to clear chat history' 
      });
    }
  };

  // Generate a conversation title from the first message and response
  async generateConversationTitle(userMessage, assistantResponse = null) {
    try {
      // If we have a response, use both user message and assistant response for better context
      let titlePrompt;
      
      if (assistantResponse) {
        // Extract key themes from the assistant response
        const themes = this.extractThemesFromResponse(assistantResponse);
        titlePrompt = `Generate a concise, descriptive title (max 50 characters) for a conversation about:

User's question: "${userMessage}"
Key themes discussed: ${themes}

The title should be:
- Professional and clear
- Capture the main topic/domain
- 3-6 words maximum
- No quotes or special formatting

Examples:
"Sustainable Transportation Ideas"
"Mobile App Development"
"AI Marketing Strategies"
"Green Energy Solutions"

Title:`;
      } else {
        // Fallback to basic extraction if no response yet
        titlePrompt = `Generate a concise title (max 50 characters) for this topic:

"${userMessage}"

Make it professional, 3-6 words, capturing the main subject.

Title:`;
      }

      // Use a lightweight model for title generation
      const model = 'gemma2-9b-it'; // Fastest model for simple tasks
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates concise, professional conversation titles.' },
          { role: 'user', content: titlePrompt }
        ],
        temperature: 0.3,
        max_tokens: 20,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.API.key}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data?.choices?.[0]?.message?.content) {
        const generatedTitle = response.data.choices[0].message.content
          .trim()
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
          .substring(0, 50);
        
        return generatedTitle || this.fallbackTitleGeneration(userMessage);
      }
    } catch (error) {
      console.error('Error generating AI title:', error.message);
    }
    
    // Fallback to original method
    return this.fallbackTitleGeneration(userMessage);
  }

  extractThemesFromResponse(response) {
    // Extract key themes from ideation response
    if (response.includes('💡 Ideas Summary:')) {
      const ideasSection = response.split('💡 Ideas Summary:')[1]?.split('🎯 Final Recommendation:')[0];
      if (ideasSection) {
        // Extract first few key concepts
        const concepts = ideasSection
          .split('\n')
          .filter(line => line.trim() && (line.includes('-') || line.includes('*')))
          .slice(0, 3)
          .map(line => line.replace(/[-*]/g, '').trim())
          .join(', ');
        return concepts.substring(0, 100);
      }
    }
    
    // Extract from first paragraph
    const firstParagraph = response.split('\n\n')[0];
    return firstParagraph.substring(0, 100);
  }

  fallbackTitleGeneration(message) {
    // Enhanced fallback method
    const stopWords = new Set(['the', 'and', 'but', 'for', 'are', 'with', 'they', 'this', 'that', 'from', 'have', 'been', 'will', 'can', 'could', 'should', 'would', 'how', 'what', 'when', 'where', 'why', 'who', 'help', 'need', 'want', 'looking', 'about']);
    
    // Handle slash commands
    if (message.startsWith('/')) {
      const parts = message.split(' ');
      const command = parts[0].replace('/', '');
      const topic = parts.slice(1).join(' ');
      return `${command.charAt(0).toUpperCase() + command.slice(1)}: ${topic.substring(0, 30)}`;
    }
    
    const words = message.toLowerCase()
      .split(' ')
      .filter(word => 
        word.length > 3 && 
        !stopWords.has(word) &&
        /^[a-zA-Z]+$/.test(word) // Only letters
      )
      .slice(0, 4);
    
    if (words.length === 0) {
      return 'New Conversation';
    }
    
    // Capitalize first letter of each word
    const title = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  }
}

module.exports = ChatController; 