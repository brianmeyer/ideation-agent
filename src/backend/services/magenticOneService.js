const config = require('../config/config');
const AgentOrchestrator = require('./agentOrchestrator');
const CommandProcessor = require('./commandProcessor');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');

class MagenticOneService {
  constructor() {
    this.agentOrchestrator = new AgentOrchestrator();
    this.commandProcessor = new CommandProcessor();
    this.activeSessions = new Map();
    this.responseCache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Clean up cache and sessions periodically
    setInterval(() => {
      this.cleanupCache();
      this.cleanupSessions();
    }, 300000); // Every 5 minutes
  }

  async processMessage(message, context = [], isIdeation = false) {
    try {
      // Check for slash commands first using the command processor
      const commandResult = this.commandProcessor.processMessage(message);
      if (commandResult) {
        return commandResult;
      }

      if (isIdeation) {
        return await this.processIdeationMessage(message, context);
      } else {
        return await this.processChatMessage(message, context);
      }
    } catch (error) {
      logger.error('Error in message processing:', error);
      throw error;
    }
  }

  async processIdeationMessage(message, context = []) {
    try {
      logger.info('Starting ideation session with AgentOrchestrator');
      const result = await this.agentOrchestrator.executeIdeationSession(message, context);
      return result.content;
    } catch (error) {
      logger.error('Error in ideation processing:', error);
      return this.generateFallbackResponse(message);
    }
  }

  async processChatMessage(message, context = []) {
    // For regular chat messages (non-ideation), generate a simple AI response
    try {
      return await this.generateDefaultResponse(message, context);
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return this.generateFallbackResponse(message);
    }
  }

  generateFallbackResponse(message) {
    return `I apologize, but I'm experiencing technical difficulties processing your request: "${message.substring(0, 100)}..."

Please try again, or use one of these commands:
• \`/ideate <topic>\` - Start a new ideation session
• \`/help\` - Get help with available commands

I'm designed to help you brainstorm ideas and analyze problems collaboratively.`;
  }

  buildEnhancedContext(context) {
    if (!context || context.length === 0) {
      return "This is the beginning of our conversation.";
    }

    // Use smart context selection for long conversations
    if (context.length > 30) {
      return this.buildSmartContext(context);
    }

    // Regular context building for shorter conversations
    return this.buildRegularContext(context);
  }

  buildSmartContext(context) {
    // Intelligent context selection for long conversations
    const selectedContext = this.selectRelevantContext(context);
    
    let contextSummary = "## Smart Context Summary\n\n";
    
    // Add conversation overview
    contextSummary += `**Conversation Length**: ${context.length} messages\n`;
    contextSummary += `**Context Selection**: Showing most relevant ${selectedContext.totalSelected} messages\n\n`;

    // Add ideation sessions
    if (selectedContext.ideationSessions.length > 0) {
      contextSummary += "### Key Ideation Sessions:\n";
      selectedContext.ideationSessions.forEach((session, i) => {
        const ideas = this.extractIdeasFromSession(session.response);
        contextSummary += `**Session ${i + 1}** (${session.timestamp}):\n`;
        contextSummary += `${ideas}\n\n`;
      });
    }

    // Add important conversation threads
    if (selectedContext.importantThreads.length > 0) {
      contextSummary += "### Important Discussion Threads:\n";
      selectedContext.importantThreads.forEach((thread, i) => {
        contextSummary += `**Thread ${i + 1}** (${thread.messages.length} exchanges):\n`;
        thread.messages.forEach(msg => {
          const truncated = msg.content.substring(0, 100);
          contextSummary += `- ${msg.role}: ${truncated}${msg.content.length > 100 ? '...' : ''}\n`;
        });
        contextSummary += `\n`;
      });
    }

    // Always include recent messages
    const recentMessages = context.slice(-6);
    contextSummary += "### Recent Messages:\n";
    recentMessages.forEach(msg => {
      const truncated = msg.content.substring(0, 120);
      contextSummary += `**${msg.role}**: ${truncated}${msg.content.length > 120 ? '...' : ''}\n`;
    });

    return contextSummary;
  }

  buildRegularContext(context) {
    // Original context building for shorter conversations
    const ideationSessions = [];
    const regularMessages = [];
    let currentSession = null;

    context.forEach(msg => {
      if (msg.role === 'assistant' && (msg.content.includes('🤔 Chain of Thought:') || msg.content.includes('💡 Ideas Summary:'))) {
        if (currentSession) ideationSessions.push(currentSession);
        currentSession = { 
          trigger: regularMessages[regularMessages.length - 1]?.content || 'Initial message',
          response: msg.content 
        };
      } else if (msg.role === 'assistant' && currentSession) {
        ideationSessions.push(currentSession);
        currentSession = null;
        regularMessages.push(msg);
      } else {
        regularMessages.push(msg);
      }
    });

    if (currentSession) ideationSessions.push(currentSession);

    let contextSummary = "## Conversation Context\n\n";

    if (ideationSessions.length > 0) {
      contextSummary += "### Previous Ideation Sessions:\n";
      ideationSessions.forEach((session, i) => {
        const ideas = this.extractIdeasFromSession(session.response);
        contextSummary += `**Session ${i + 1}** (Trigger: "${session.trigger.substring(0, 100)}..."):\n`;
        contextSummary += `${ideas}\n\n`;
      });
    }

    const recentMessages = context.slice(-10);
    if (recentMessages.length > 0) {
      contextSummary += "### Recent Conversation:\n";
      recentMessages.forEach(msg => {
        const truncatedContent = msg.content.substring(0, 150);
        contextSummary += `**${msg.role}**: ${truncatedContent}${msg.content.length > 150 ? '...' : ''}\n`;
      });
    }

    return contextSummary;
  }

  selectRelevantContext(context) {
    const result = {
      ideationSessions: [],
      importantThreads: [],
      totalSelected: 0
    };

    // Extract all ideation sessions
    let currentSession = null;
    const allSessions = [];
    
    context.forEach((msg, index) => {
      if (msg.role === 'assistant' && (msg.content.includes('🤔 Chain of Thought:') || msg.content.includes('💡 Ideas Summary:'))) {
        if (currentSession) allSessions.push(currentSession);
        currentSession = { 
          trigger: context[index - 1]?.content || 'Initial message',
          response: msg.content,
          index: index,
          timestamp: this.formatRelativeTime(index, context.length)
        };
      }
    });
    if (currentSession) allSessions.push(currentSession);

    // Select most recent and significant ideation sessions
    result.ideationSessions = allSessions.slice(-3); // Last 3 sessions
    result.totalSelected += result.ideationSessions.length;

    // Identify important conversation threads (high engagement areas)
    const threads = this.identifyConversationThreads(context);
    result.importantThreads = threads
      .filter(thread => thread.engagement > 0.3) // High engagement threshold
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 2); // Top 2 threads

    result.totalSelected += result.importantThreads.reduce((sum, thread) => sum + thread.messages.length, 0);

    return result;
  }

  identifyConversationThreads(context) {
    const threads = [];
    let currentThread = [];
    
    for (let i = 0; i < context.length - 6; i += 4) { // Sample every 4 messages
      const segment = context.slice(i, Math.min(i + 6, context.length));
      
      // Calculate engagement score
      let engagement = 0;
      let totalLength = 0;
      
      segment.forEach(msg => {
        totalLength += msg.content.length;
        
        // Higher engagement for questions, exclamations, lists
        if (msg.content.includes('?')) engagement += 0.2;
        if (msg.content.includes('!')) engagement += 0.1;
        if (msg.content.includes('\n-') || msg.content.includes('\n*')) engagement += 0.2;
        if (msg.role === 'user' && msg.content.length > 100) engagement += 0.1;
      });
      
      // Average message length factor
      const avgLength = totalLength / segment.length;
      if (avgLength > 200) engagement += 0.2;
      if (avgLength > 500) engagement += 0.3;
      
      // Normalize engagement
      engagement = Math.min(engagement, 1.0);
      
      if (engagement > 0.2) { // Only include threads with some engagement
        threads.push({
          messages: segment,
          engagement: engagement,
          startIndex: i
        });
      }
    }
    
    return threads;
  }

  formatRelativeTime(messageIndex, totalMessages) {
    const position = messageIndex / totalMessages;
    if (position > 0.8) return 'recent';
    if (position > 0.5) return 'mid-conversation';
    return 'early';
  }

  extractIdeasFromSession(sessionContent) {
    // Extract key ideas from ideation session content
    const lines = sessionContent.split('\n');
    let inIdeasSection = false;
    let ideas = [];

    lines.forEach(line => {
      if (line.includes('💡 Ideas Summary:')) {
        inIdeasSection = true;
        return;
      }
      if (inIdeasSection && (line.includes('🎯 Final Recommendation:') || line.includes('⚖️ Practical Next Steps:'))) {
        inIdeasSection = false;
        return;
      }
      if (inIdeasSection && line.trim() && (line.includes('IDEA') || line.includes('-') || line.includes('*'))) {
        ideas.push(line.trim());
      }
    });

    return ideas.length > 0 ? ideas.slice(0, 5).join('\n') : 'Various creative ideas and analyses were discussed.';
  }

  async processChatMessage(message, context) {
    try {
      // Enhanced context processing
      const enhancedContext = this.buildEnhancedContext(context);
      
      const chatPrompt = `You are a helpful AI assistant with excellent memory and contextual understanding. You have access to the full conversation history, including collaborative ideation sessions, previous ideas, and ongoing discussions.

${enhancedContext}

Current user message: "${message}"

Please provide a thoughtful response that:
1. Directly addresses the user's current message
2. **Leverages relevant context** from previous exchanges, especially:
   - Key ideas from ideation sessions (marked with 💡)
   - Ongoing themes and discussion threads
   - Previously mentioned preferences, constraints, or requirements
3. **References specific previous points** when relevant (e.g., "Building on the electric vehicle idea we discussed...")
4. Maintains natural conversation flow while showing you remember and understand the context
5. Offers actionable insights or next steps when appropriate
6. If the user asks about something discussed before, provide a comprehensive answer that shows full awareness of the previous discussion

Be conversational but show that you're building on our shared context and previous work together.`;

      const model = config.AVAILABLE_MODELS[Math.floor(Math.random() * config.AVAILABLE_MODELS.length)];
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that maintains context and provides relevant responses, building upon previous ideation sessions when appropriate.' },
          ...context.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.API.key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      let content = response.data.choices[0].message.content;
      
      // Filter out <think> portions from chat response
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      return content;
    } catch (error) {
      console.error('Error in chat message processing:', error);
      throw error;
    }
  }

  generateFallbackResponse(message) {
    return `I apologize, but I'm experiencing technical difficulties with the ideation system. However, regarding "${message}", I can suggest approaching this systematically by:

1. **Breaking down the core problem** into smaller, manageable components
2. **Researching existing solutions** and identifying gaps or improvement opportunities  
3. **Considering multiple perspectives** - technical feasibility, user needs, market dynamics
4. **Prototyping and testing** ideas quickly to validate assumptions
5. **Iterating based on feedback** to refine and improve the solution

Please try your ideation request again, or feel free to ask specific questions about any aspect of your idea.`;
  }

  cleanupCache() {
    const now = Date.now();
    const cacheTimeout = 60000; // 1 minute
    
    for (const [key, entry] of this.responseCache.entries()) {
      if (now - entry.timestamp > cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  cleanupSessions() {
    const now = Date.now();
    const sessionTimeout = 300000; // 5 minutes
    
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.startTime > sessionTimeout) {
        this.activeSessions.delete(key);
      }
    }
  }
}

module.exports = MagenticOneService;
