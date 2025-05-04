const Joi = require('joi');
const logger = require('../utils/logger');

const messageSchema = Joi.object({
  content: Joi.string().required().min(1).max(1000),
  type: Joi.string().valid('text', 'markdown').default('text'),
  metadata: Joi.object().optional()
});

// Express middleware for REST API
const validateMessageMiddleware = (req, res, next) => {
  const { error } = messageSchema.validate(req.body);
  
  if (error) {
    logger.warn('Validation error', { error: error.details[0].message });
    return res.status(400).json({
      error: 'Invalid message format',
      details: error.details[0].message
    });
  }
  
  next();
};

// Socket.IO message validation
const validateMessage = (message) => {
  try {
    // For socket messages, we wrap the content in an object to match schema
    const messageObj = {
      content: message,
      type: 'text'
    };
    
    const result = messageSchema.validate(messageObj, { abortEarly: false });
    
    if (result.error) {
      logger.warn('Socket message validation error', { 
        error: result.error.details[0].message,
        message: message 
      });
      return { error: result.error };
    }
    
    return { value: result.value };
  } catch (error) {
    logger.error('Unexpected validation error', { error: error.message });
    return { error: new Error('Invalid message format') };
  }
};

module.exports = {
  validateMessage,
  validateMessageMiddleware
}; 