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

  async processIdeationMessage(message, context) {
    try {
      const startTime = Date.now();
      
      // Initial brainstorming with creative agent
      console.log('Getting initial brainstorming ideas...');
      const brainstormingPrompt = `You are in brainstorming mode. Your task is to generate multiple diverse ideas that range from practical solutions to innovative research directions. For each idea, indicate whether it's:
- "Practical Now": Implementable with current technology
- "Near Future": Requires some technological advancement (1-5 years)
- "Research Direction": Novel concept requiring significant research

"${message}"

CRITICAL REQUIREMENTS:
1. You MUST provide at least 3 COMPLETELY DIFFERENT ideas
2. Each idea must be unique and not related to the others
3. Do not combine multiple ideas into one
4. Include a mix of practical and research-oriented ideas
5. Follow the exact structure below for EACH idea

For each idea, use this EXACT structure:

IDEA #[number]: [Title]
- Implementation Timeline: [Practical Now / Near Future / Research Direction]
- Core Concept: [One sentence description]
- Key Features:
  * [Feature 1]
  * [Feature 2]
  * [Feature 3]
- Potential Benefits:
  * [Benefit 1]
  * [Benefit 2]
- Innovation/Research Aspects:
  * [What makes this idea unique or groundbreaking]
  * [Required technological advancements or research areas]
  * [Potential breakthroughs or discoveries needed]`;
      
      // Run agents in parallel for initial phase (major performance improvement)
      const [creativeResponse, reasoningResponsePromise, logicalResponsePromise] = await Promise.all([
        this.getAgentResponse('creative', brainstormingPrompt, context, 'brainstorming'),
        // Start other agents immediately with base context
        this.getAgentResponse('reasoning', `Analyze the following request: "${message}"\n\nProvide structured analysis focusing on feasibility and implementation.`, context, 'initial_analysis'),
        this.getAgentResponse('logical', `Evaluate the following request: "${message}"\n\nProvide critical evaluation focusing on practical constraints and risks.`, context, 'initial_evaluation')
      ]);
      
      // Wait for all responses
      const [reasoningResponse, logicalResponse] = await Promise.all([
        reasoningResponsePromise,
        logicalResponsePromise
      ]);
      
      // Build comprehensive response context
      let previousResponses = {
        creative: creativeResponse.content,
        reasoning: reasoningResponse.content,
        logical: logicalResponse.content
      };
      
      // Single refinement iteration instead of continuous looping
      const elapsedTime = (Date.now() - startTime) / 1000;
      if (elapsedTime < this.ideationTimeLimit - 5) { // Leave 5 seconds for synthesis
        console.log(`Running refinement iteration (${elapsedTime.toFixed(1)}s elapsed)...`);
        
        // Run refinement in parallel
        const refinementPromises = Object.keys(this.agents).map(async (agentType) => {
          const agentContext = this.buildCollaborationContext(previousResponses, agentType);
          const fullContext = `Original message: ${message}\n\n${agentContext}\n\nProvide refined insights based on other agents' perspectives.`;
          const response = await this.getAgentResponse(agentType, fullContext, context, `refinement_${agentType}`);
          return { agent: agentType, response: response.content };
        });
        
        const refinementResponses = await Promise.all(refinementPromises);
        
        // Update previous responses with refinements
        refinementResponses.forEach(({ agent, response }) => {
          previousResponses[agent] = response;
        });
      }
      
      // Generate final synthesis
      return await this.generateFinalResponse(previousResponses);
      
    } catch (error) {
      console.error('Error in collaborative processing:', error);
      throw error;
    }
  }

  async getAgentResponse(agentType, message, history = [], phase) {
    try {
      if (!this.agents[agentType]) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      if (!config.API.key) {
        throw new Error('API key is not configured. Please check your environment variables.');
      }

      // Ensure message is not empty
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }

      // Check cache first
      const cacheKey = `${agentType}:${Buffer.from(message).toString('base64').slice(0, 32)}:${phase}`;
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log(`[${agentType.toUpperCase()}] Using cached response for phase: ${phase}`);
        return cachedResponse;
      }

      const agent = this.agents[agentType];
      const model = config.AVAILABLE_MODELS[Math.floor(Math.random() * config.AVAILABLE_MODELS.length)];
      
      // Limit history to recent messages to reduce token usage
      const validHistory = history
        .filter(msg => 
          msg && 
          msg.role && 
          msg.content && 
          typeof msg.content === 'string' && 
          msg.content.trim().length > 0
        )
        .slice(-5); // Only keep last 5 messages

      // Add specific instructions for reasoning agent
      let systemMessage = agent.role;
      if (agentType === 'reasoning') {
        systemMessage += '\n\nIMPORTANT: You MUST provide a complete analysis with all sections filled out. Do not leave any sections empty or incomplete.';
      }

      const messages = [
        { role: 'system', content: systemMessage },
        ...validHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message.trim() }
      ];

      console.log(`[${agentType.toUpperCase()}] Using model: ${model} for phase: ${phase}`);
      
      // Reduce max_tokens for better performance and cost
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages,
        temperature: agent.temperature,
        max_tokens: 2000, // Reduced from 4000
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.API.key}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000 // Reduced timeout
      });

      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      let content = response.data.choices[0].message.content;
      
      // Filter out <think> portions
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // Validate reasoning agent response (skip retry for performance)
      if (agentType === 'reasoning' && !this.validateReasoningResponse(content)) {
        console.warn('Reasoning agent response validation failed, using as-is for performance');
      }
      
      console.log(`Received response for ${agentType} agent using model ${model} (${content.length} characters)`);
      
      const result = {
        content,
        model,
        agentType
      };
      
      // Cache the response
      this.setCachedResponse(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`Error in getAgentResponse for ${agentType}:`, error.response?.data || error.message);
      
      // Return a fallback response instead of throwing
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          content: `[${agentType} agent temporarily unavailable - request timed out]`,
          model: 'fallback',
          agentType
        };
      }
      
      throw error;
    }
  }

  validateReasoningResponse(content) {
    // Check if the response contains all required sections
    const requiredSections = [
      'Key Components',
      'Analysis',
      'Conclusions'
    ];
    
    return requiredSections.every(section => 
      content.includes(section) && 
      content.split(section)[1].trim().length > 0
    );
  }

  buildCollaborationContext(previousResponses, currentAgent) {
    const agentContexts = Object.entries(previousResponses)
      .filter(([agent]) => agent !== currentAgent)
      .map(([agent, response]) => {
        const agentName = this.agents[agent].name;
        const role = this.agents[agent].role.split('\n')[0]; // Get first line of role description
        return `${agentName} (${role}):\n${response}`;
      })
      .join('\n\n');

    // Special prompt for creative agent during iterations
    if (currentAgent === 'creative') {
      return `Previous agent perspectives:\n\n${agentContexts}\n\nAs the Creative Agent, your role in this iteration is to:
1. Build upon the existing startup ideas
2. Suggest creative improvements or modifications to the ideas
3. Identify novel connections between different aspects of the ideas
4. Propose innovative ways to enhance the ideas

Please provide your creative insights and suggestions based on the perspectives above, focusing on improving the startup ideas.`;
    }

    return `Previous agent perspectives:\n\n${agentContexts}\n\nBased on these perspectives, please provide your analysis as the ${this.agents[currentAgent].name}, focusing on evaluating and improving the startup ideas.`;
  }

  hasReachedConsensus(agentResponses) {
    if (agentResponses.length < 2) return false;

    // Extract key points from each response
    const responsePoints = agentResponses.map(({ response }) => {
      return response
        .split(/[.!?]\s+/)
        .map(point => point.toLowerCase().trim())
        .filter(point => point.length > 10);
    });

    // Check for overlapping ideas
    const commonIdeas = responsePoints.reduce((common, points, i) => {
      if (i === 0) return points;
      return common.filter(point =>
        points.some(p => 
          p.includes(point.substring(0, Math.floor(point.length * 0.7))) ||
          point.includes(p.substring(0, Math.floor(p.length * 0.7)))
        )
      );
    }, []);

    return commonIdeas.length >= 2;
  }

  async generateFinalResponse(previousResponses) {
    try {
      // First, process and structure the agent responses
      const agentInsights = Object.entries(previousResponses).map(([agent, response]) => {
        const agentName = this.agents[agent].name;
        return {
          agent: agentName,
          content: response,
          insights: this.extractKeyInsights(response)
        };
      });

      const synthesisPrompt = `Based on the collaborative ideation process, provide a final synthesis that shows the complete chain of thought and all ideas discussed.

Previous Agent Responses:
${agentInsights.map(insight => 
  `${insight.agent}:\n${insight.content}\n\nKey Insights:\n${insight.insights.join('\n')}`
).join('\n\n')}

Please structure your response EXACTLY as follows:

🤔 Chain of Thought:
- Creative Agent's Contribution:
  * [Key insights and ideas generated]
  * [How these ideas address the original question]
- Reasoning Agent's Analysis:
  * [Key analysis points]
  * [How this analysis shapes the ideas]
- Logical Agent's Evaluation:
  * [Key evaluation points]
  * [How this evaluation refines the ideas]

💡 Ideas Summary:
[For each idea discussed, provide:
- Title
- Core concept
- Key features
- Potential impact
- Implementation timeline]

🎯 Final Recommendation:
- Primary Recommendation: [Which idea(s) to pursue]
- Rationale: [Why these ideas are the best options]
- Expected Impact: [How these ideas address the original question]
- Key Benefits: [Main advantages of pursuing these ideas]

⚖️ Practical Next Steps:
1. [First concrete step]
2. [Second concrete step]
3. [Third concrete step]
4. [Fourth concrete step]
5. [Fifth concrete step]

CRITICAL REQUIREMENTS:
1. You MUST include ALL four sections (Chain of Thought, Ideas Summary, Final Recommendation, Practical Next Steps)
2. Each section MUST be clearly labeled with the emoji and title
3. The response MUST be properly formatted with line breaks between sections
4. The Ideas Summary MUST include ALL ideas that were discussed
5. The Chain of Thought MUST show how each agent contributed to the final ideas
6. The Final Recommendation MUST be specific and actionable
7. The Practical Next Steps MUST be concrete and sequential
8. DO NOT include any placeholder text like [Summary of ideas from all agents] or [Based on agent insights]
9. You MUST provide actual content for each section based on the agent responses`;

      const model = config.AVAILABLE_MODELS[Math.floor(Math.random() * config.AVAILABLE_MODELS.length)];
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages: [
          { role: 'system', content: 'You are a synthesis agent that combines multiple perspectives into clear, actionable insights. You must provide complete, specific content for each section and never use placeholder text.' },
          { role: 'user', content: synthesisPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
      
      // Filter out <think> portions from synthesis response
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // Ensure the response has all required sections with proper formatting
      if (!this.validateResponseFormat(content)) {
        content = this.generateDefaultResponse(agentInsights);
      }

      return content;
    } catch (error) {
      console.error('Error generating final response:', error);
      throw error;
    }
  }

  extractKeyInsights(response) {
    // Extract key points from the response
    const lines = response.split('\n');
    return lines
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.trim());
  }

  validateResponseFormat(content) {
    const requiredSections = [
      '🤔 Chain of Thought:',
      '💡 Ideas Summary:',
      '🎯 Final Recommendation:',
      '⚖️ Practical Next Steps:'
    ];
    
    return requiredSections.every(section => content.includes(section));
  }

  generateDefaultResponse(agentInsights) {
    // Extract key ideas from agent insights
    const allIdeas = [];
    agentInsights.forEach(insight => {
      insight.insights.forEach(point => {
        if (point.length > 10 && !point.includes('analysis') && !point.includes('approach')) {
          allIdeas.push(point);
        }
      });
    });

    const topIdeas = allIdeas.slice(0, 5);
    const primaryIdea = topIdeas[0] || 'Explore innovative solutions in this domain';
    
    return `🤔 Chain of Thought:
${agentInsights.map(insight => 
  `- ${insight.agent}'s Contribution:\n  * ${insight.insights.join('\n  * ')}`
).join('\n\n')}

💡 Ideas Summary:
${topIdeas.map((idea, index) => `${index + 1}. ${idea}`).join('\n') || 'Multiple innovative concepts were explored across creative, reasoning, and logical perspectives.'}

🎯 Final Recommendation:
- Primary Recommendation: ${primaryIdea}
- Rationale: This recommendation combines the most viable insights from all three agent perspectives
- Expected Impact: Addresses the core challenge through multi-faceted approach

⚖️ Practical Next Steps:
1. Research market opportunity and competitive landscape
2. Develop proof-of-concept or prototype
3. Validate assumptions with target users or stakeholders
4. Create detailed implementation plan and timeline
5. Secure necessary resources and partnerships

*Triggered by: /ideate command*`;
  }

  startIdeationSession(agentType) {
    const sessionId = Date.now().toString();
    this.activeSessions.set(sessionId, {
      agentType,
      startTime: Date.now(),
      timer: setTimeout(() => {
        this.endIdeationSession(sessionId);
      }, this.ideationTimeLimit * 1000)
    });
    return sessionId;
  }

  endIdeationSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      clearTimeout(session.timer);
      this.activeSessions.delete(sessionId);
    }
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  // Helper method to shuffle array
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Cleanup methods for memory management
  cleanupCache() {
    const maxCacheSize = 100;
    if (this.responseCache.size > maxCacheSize) {
      const entries = Array.from(this.responseCache.entries());
      // Remove oldest half of entries
      for (let i = 0; i < Math.floor(entries.length / 2); i++) {
        this.responseCache.delete(entries[i][0]);
      }
      console.log(`Cache cleaned up. Size: ${this.responseCache.size}`);
    }
  }
  
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > maxAge) {
        this.endIdeationSession(sessionId);
      }
    }
  }
  
  // Enhanced caching with TTL
  getCachedResponse(key) {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return cached.response;
    }
    if (cached) {
      this.responseCache.delete(key); // Remove expired
    }
    return null;
  }
  
  setCachedResponse(key, response) {
    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }
}

module.exports = MagenticOneService; 