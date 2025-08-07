const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const logger = require('../utils/logger');

// Sanitization options
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'target']
  },
  allowedIframeHostnames: []
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Message validation schema
const messageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(4000)
    .required()
    .custom((value, helpers) => {
      if (value.includes('<script>') || value.includes('javascript:')) {
        return helpers.error('string.potentiallyHarmful');
      }
      return value;
    }, 'sanitize-html')
    .messages({
      'string.potentiallyHarmful': 'Message contains potentially harmful content',
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message is too long (max 4000 characters)'
    }),
  conversationId: Joi.string()
    .pattern(UUID_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Invalid conversation ID format'
    })
});

// Conversation creation schema
const conversationCreationSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .default('New Conversation')
    .custom((value, helpers) => {
      return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    })
});

// Conversation update schema
const conversationUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .custom((value, helpers) => {
      return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    }),
  status: Joi.string()
    .valid('active', 'archived', 'deleted'),
  metadata: Joi.object()
}).min(1);

// Validate and sanitize message (helper function)
const validateMessageHelper = (message) => {
  try {
    // Normalize the message structure
    const normalizedMessage = {
      ...message,
      content: message.content || message.message || '',  // Try both possible content fields
      conversationId: message.conversationId || 'default',
      isIdeation: message.isIdeation || false,
      history: message.history || []
    };

    // First sanitize the input
    const sanitizedMessage = {
      ...normalizedMessage,
      content: sanitizeHtml(normalizedMessage.content, sanitizeOptions)
    };

    // Then validate the sanitized message
    const { error, value } = messageSchema.validate(sanitizedMessage, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Message validation failed:', {
        errors: error.details.map(detail => detail.message),
        messageId: message.id,
        originalMessage: message  // Log the original message for debugging
      });
      return { error };
    }

    return { value: sanitizedMessage };
  } catch (err) {
    logger.error('Message validation error:', {
      error: err.message,
      messageId: message.id,
      originalMessage: message  // Log the original message for debugging
    });
    return { error: { details: [{ message: 'Invalid message format' }] } };
  }
};

// Middleware functions
const validateMessage = (req, res, next) => {
  const { error, value } = messageSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

const validateConversationCreation = (req, res, next) => {
  const { error, value } = conversationCreationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

const validateConversationUpdate = (req, res, next) => {
  const { error, value } = conversationUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

const validateConversationId = (req, res, next) => {
  const conversationId = req.query.conversationId || req.params.id;
  
  if (!conversationId) {
    return res.status(400).json({
      success: false,
      error: 'Conversation ID is required'
    });
  }
  
  if (!UUID_REGEX.test(conversationId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid conversation ID format'
    });
  }
  
  next();
};

const validateUUID = (req, res, next) => {
  const id = req.params.id;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'ID parameter is required'
    });
  }
  
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }
  
  next();
};

// Socket.IO middleware for message validation
const validateSocketMessage = (socket, next) => {
  try {
    const { error, value } = messageSchema.validate(socket.data, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return next(new Error(error.details[0].message));
    }
    
    socket.data = value;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  validateMessage,
  validateMessageHelper,
  validateConversationCreation,
  validateConversationUpdate,
  validateConversationId,
  validateUUID,
  validateSocketMessage,
  messageSchema,
  conversationCreationSchema,
  conversationUpdateSchema
}; 