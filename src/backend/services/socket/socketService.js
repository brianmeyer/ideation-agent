const logger = require('../../utils/logger');
const { validateMessage } = require('../../middleware/validation');

class SocketService {
  constructor(io, magenticOneService, cacheService) {
    this.io = io;
    this.magenticOneService = magenticOneService;
    this.cacheService = cacheService;
    this.messageQueue = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info('New client connected', { socketId: socket.id });
      this.setupSocketHandlers(socket);
    });
  }

  setupSocketHandlers(socket) {
    socket.on('chat message', async (data) => {
      try {
        // Add message to queue
        await this.addToQueue(socket, data);
      } catch (error) {
        logger.error('Error handling chat message:', { 
          error: error.message,
          socketId: socket.id
        });
        socket.emit('error', { 
          message: 'An error occurred while processing your message',
          code: 'PROCESSING_ERROR'
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id });
      this.messageQueue.delete(socket.id);
    });
  }

  async addToQueue(socket, data) {
    const queue = this.messageQueue.get(socket.id) || [];
    queue.push({
      ...data,
      id: Date.now().toString(),
      socketId: socket.id,
      retries: 0
    });
    this.messageQueue.set(socket.id, queue);
    await this.processQueue(socket);
  }

  async processQueue(socket) {
    const queue = this.messageQueue.get(socket.id) || [];
    if (queue.length === 0) return;

    const message = queue[0];
    try {
      // Validate message
      const validationResult = validateMessage(message);
      if (validationResult.error) {
        socket.emit('error', { 
          message: validationResult.error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
        queue.shift();
        return this.processQueue(socket);
      }

      await this.processMessage(socket, message);
      queue.shift();
    } catch (error) {
      logger.error('Error processing message:', { 
        error: error.message,
        messageId: message.id,
        socketId: socket.id
      });

      if (message.retries < 3) {
        message.retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * message.retries));
        return this.processQueue(socket);
      } else {
        socket.emit('error', { 
          message: 'Failed to process message after multiple retries',
          code: 'PROCESSING_ERROR'
        });
        queue.shift();
      }
    }

    if (queue.length > 0) {
      await this.processQueue(socket);
    }
  }

  async processMessage(socket, message) {
    // The message has already been validated in processQueue
    const validatedMessage = message;

    // Log the message for debugging
    logger.info('Processing message:', {
      content: validatedMessage.content || validatedMessage.message,
      conversationId: validatedMessage.conversationId,
      isIdeation: validatedMessage.isIdeation
    });

    // Ensure we have the message content
    const messageContent = validatedMessage.content || validatedMessage.message;
    if (!messageContent) {
      throw new Error('Message content is missing');
    }

    // Check cache first
    const cacheKey = `message:${messageContent}:${validatedMessage.conversationId}`;
    const cachedResponse = await this.cacheService.get(cacheKey);
    
    if (cachedResponse) {
      this.io.emit('chat message', {
        role: 'assistant',
        content: cachedResponse,
        timestamp: new Date(),
        isFinal: true
      });
      return;
    }

    // Broadcast the user message
    this.io.emit('chat message', { 
      role: 'user', 
      content: messageContent,
      timestamp: new Date()
    });

    if (validatedMessage.isIdeation) {
      await this.processIdeationMessage(socket, messageContent, validatedMessage.conversationId);
    } else {
      await this.processChatMessage(socket, messageContent, validatedMessage.history || [], validatedMessage.conversationId);
    }
  }

  async processIdeationMessage(socket, message, conversationId) {
    try {
      const startTime = Date.now();
      const maxTime = 30000; // 30 seconds
      
      // Send initial status
      this.io.emit('agent_status', { 
        status: 'starting',
        agent: 'System',
        message: 'Starting collaborative ideation process...',
        progress: {
          percentage: 0,
          elapsed: 0,
          agents: [
            { name: 'Creative', type: 'creative', active: true, thinking: true },
            { name: 'Reasoning', type: 'reasoning', active: false, thinking: false },
            { name: 'Logical', type: 'logical', active: false, thinking: false }
          ]
        }
      });

      // Progress updater
      const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const percentage = Math.min((elapsed / 30) * 100, 95); // Never show 100% until done
        
        this.io.emit('agent_status', {
          agent: 'System',
          message: `Processing ideation (${elapsed}s)...`,
          progress: {
            percentage,
            elapsed,
            agents: [
              { name: 'Creative', type: 'creative', active: elapsed < 10, thinking: elapsed < 10 },
              { name: 'Reasoning', type: 'reasoning', active: elapsed >= 5 && elapsed < 20, thinking: elapsed >= 5 && elapsed < 20 },
              { name: 'Logical', type: 'logical', active: elapsed >= 10, thinking: elapsed >= 10 && elapsed < 25 }
            ]
          }
        });
      }, 1000);

      try {
        // Use the MagenticOne service's optimized ideation process
        const response = await this.magenticOneService.processIdeationMessage(message, []);
        
        clearInterval(progressInterval);
        
        // Send final message
        this.io.emit('chat message', {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          isFinal: true
        });

        // Cache the response
        await this.cacheService.set(`message:${message}:${conversationId}`, response);
        
        const totalTime = Date.now() - startTime;
        logger.info(`Ideation completed in ${totalTime}ms`);
        
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error) {
      logger.error('Error in ideation process:', { 
        error: error.message,
        socketId: socket.id
      });
      throw error;
    }
  }

  async processChatMessage(socket, message, history, conversationId) {
    try {
      this.io.emit('agent_status', {
        status: 'processing',
        agent: 'Assistant',
        message: 'Processing your message...'
      });

      const response = await this.magenticOneService.processChatMessage(message, history);
      
      this.io.emit('chat message', {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        isFinal: true
      });

      // Cache the response
      await this.cacheService.set(`message:${message}:${conversationId}`, response);
    } catch (error) {
      logger.error('Error in chat process:', { 
        error: error.message,
        socketId: socket.id
      });
      throw error;
    }
  }
}

module.exports = SocketService; 