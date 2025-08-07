/**
 * Agent Orchestrator Service
 * 
 * Manages the coordination and execution of multiple AI agents
 * (Creative, Reasoning, Logical) for ideation sessions.
 * 
 * @author Brian Meyer
 * @version 1.0.0
 */

const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');

class AgentOrchestrator {
  constructor() {
    this.agents = {
      creative: {
        name: 'Creative',
        emoji: '💡',
        models: config.MODELS?.creative || [
          'deepseek-r1-distill-llama-70b',
          'meta-llama/llama-4-scout-17b-16e-instruct'
        ]
      },
      reasoning: {
        name: 'Reasoning',
        emoji: '🧠',
        models: config.MODELS?.reasoning || [
          'openai/gpt-oss-120b',
          'gemma2-9b-it'
        ]
      },
      logical: {
        name: 'Logical',
        emoji: '⚖️',
        models: config.MODELS?.logical || [
          'qwen/qwen3-32b',
          'meta-llama/llama-4-scout-17b-16e-instruct'
        ]
      }
    };

    this.timeLimit = parseInt(process.env.IDEATION_TIME_LIMIT) || 60000; // 60 seconds default
  }

  /**
   * Execute ideation session with all agents
   * @param {string} prompt - User prompt for ideation
   * @param {Array} context - Conversation context
   * @returns {Promise<Object>} Ideation results from all agents
   */
  async executeIdeationSession(prompt, context = []) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting ideation session', {
        prompt: prompt.substring(0, 100),
        contextLength: context.length
      });

      // Phase 1: Initial brainstorming (parallel)
      const initialResults = await this.executeBrainstormingPhase(prompt, context);
      
      // Check time limit
      if (Date.now() - startTime > this.timeLimit * 0.7) {
        logger.warn('Ideation session approaching time limit, skipping refinement');
        return this.synthesizeResults(initialResults, startTime);
      }

      // Phase 2: Refinement (parallel)
      const refinedResults = await this.executeRefinementPhase(prompt, context, initialResults);
      
      // Phase 3: Synthesis
      return this.synthesizeResults(refinedResults || initialResults, startTime);

    } catch (error) {
      logger.error('Ideation session failed', error);
      throw new Error(`Ideation session failed: ${error.message}`);
    }
  }

  /**
   * Execute initial brainstorming phase with all agents
   * @param {string} prompt - User prompt
   * @param {Array} context - Conversation context
   * @returns {Promise<Object>} Results from all agents
   */
  async executeBrainstormingPhase(prompt, context) {
    const tasks = [
      this.executeAgent('creative', 'brainstorming', prompt, context),
      this.executeAgent('reasoning', 'initial_analysis', prompt, context),
      this.executeAgent('logical', 'initial_evaluation', prompt, context)
    ];

    const results = await Promise.allSettled(tasks);
    
    return {
      creative: this.extractResult(results[0], 'creative'),
      reasoning: this.extractResult(results[1], 'reasoning'),
      logical: this.extractResult(results[2], 'logical')
    };
  }

  /**
   * Execute refinement phase with all agents
   * @param {string} prompt - User prompt
   * @param {Array} context - Conversation context
   * @param {Object} initialResults - Results from brainstorming phase
   * @returns {Promise<Object>} Refined results from all agents
   */
  async executeRefinementPhase(prompt, context, initialResults) {
    // Create refinement context including initial results
    const refinementContext = this.buildRefinementContext(prompt, initialResults);

    const tasks = [
      this.executeAgent('creative', 'refinement_creative', refinementContext, context),
      this.executeAgent('reasoning', 'refinement_reasoning', refinementContext, context),
      this.executeAgent('logical', 'refinement_logical', refinementContext, context)
    ];

    const results = await Promise.allSettled(tasks);
    
    return {
      creative: this.extractResult(results[0], 'creative') || initialResults.creative,
      reasoning: this.extractResult(results[1], 'reasoning') || initialResults.reasoning,
      logical: this.extractResult(results[2], 'logical') || initialResults.logical
    };
  }

  /**
   * Execute a single agent with specified phase
   * @param {string} agentType - Type of agent (creative, reasoning, logical)
   * @param {string} phase - Phase of ideation
   * @param {string} prompt - Prompt for the agent
   * @param {Array} context - Conversation context
   * @returns {Promise<string>} Agent response
   */
  async executeAgent(agentType, phase, prompt, context) {
    const agent = this.agents[agentType];
    if (!agent || !agent.models.length) {
      throw new Error(`Agent ${agentType} not configured or has no models`);
    }

    // Select random model for this agent
    const model = agent.models[Math.floor(Math.random() * agent.models.length)];
    
    logger.info(`[${agent.name.toUpperCase()}] Using model: ${model} for phase: ${phase}`);

    try {
      const systemPrompt = this.buildSystemPrompt(agentType, phase);
      const userPrompt = this.buildUserPrompt(prompt, context, phase);

      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.getTemperatureForPhase(agentType, phase),
        max_tokens: 1500,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.API.key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI model');
      }

      // Clean up response
      const cleanContent = this.cleanResponse(content);
      
      if (!this.validateResponse(cleanContent, agentType)) {
        logger.warn(`${agent.name} agent response validation failed, using as-is for performance`);
      }

      logger.info(`Received response for ${agentType} agent using model ${model} (${cleanContent.length} characters)`);
      return cleanContent;

    } catch (error) {
      logger.error(`Error executing ${agentType} agent:`, error);
      
      // Return fallback response instead of throwing
      return this.getFallbackResponse(agentType, phase, prompt);
    }
  }

  /**
   * Build system prompt for specific agent and phase
   * @param {string} agentType - Type of agent
   * @param {string} phase - Phase of ideation
   * @returns {string} System prompt
   */
  buildSystemPrompt(agentType, phase) {
    const basePrompts = {
      creative: 'You are a highly creative ideation agent focused on generating innovative, out-of-the-box ideas and solutions.',
      reasoning: 'You are an analytical reasoning agent focused on logical analysis, feasibility assessment, and structured thinking.',
      logical: 'You are a logical evaluation agent focused on systematic evaluation, risk assessment, and practical implementation.'
    };

    const phaseModifiers = {
      brainstorming: 'Focus on generating diverse, creative ideas without limitation.',
      initial_analysis: 'Focus on analyzing the problem and identifying key considerations.',
      initial_evaluation: 'Focus on evaluating feasibility and potential challenges.',
      refinement_creative: 'Build upon and enhance the existing ideas with creative improvements.',
      refinement_reasoning: 'Deepen the analysis and provide more structured reasoning.',
      refinement_logical: 'Refine the evaluation with more detailed logical assessment.'
    };

    return `${basePrompts[agentType]} ${phaseModifiers[phase] || ''}

Always provide substantive, detailed responses that demonstrate deep thinking. Avoid generic or superficial content.`;
  }

  /**
   * Build user prompt for agent execution
   * @param {string} prompt - Original user prompt
   * @param {Array} context - Conversation context
   * @param {string} phase - Current phase
   * @returns {string} User prompt
   */
  buildUserPrompt(prompt, context, phase) {
    let userPrompt = prompt;

    // Add context if available
    if (context && context.length > 0) {
      const recentContext = context.slice(-3); // Last 3 messages
      const contextStr = recentContext.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      userPrompt = `Context:\n${contextStr}\n\nCurrent Request: ${prompt}`;
    }

    return userPrompt;
  }

  /**
   * Build refinement context including initial results
   * @param {string} prompt - Original prompt
   * @param {Object} initialResults - Initial brainstorming results
   * @returns {string} Refinement context
   */
  buildRefinementContext(prompt, initialResults) {
    return `Original Prompt: ${prompt}

Previous Ideas Generated:

Creative Perspective:
${initialResults.creative || 'No creative input available'}

Reasoning Analysis:
${initialResults.reasoning || 'No reasoning analysis available'}

Logical Evaluation:
${initialResults.logical || 'No logical evaluation available'}

Now refine and improve these ideas with additional insights.`;
  }

  /**
   * Get appropriate temperature for agent and phase
   * @param {string} agentType - Type of agent
   * @param {string} phase - Phase of ideation
   * @returns {number} Temperature value
   */
  getTemperatureForPhase(agentType, phase) {
    const temperatures = {
      creative: { brainstorming: 0.9, refinement_creative: 0.8 },
      reasoning: { initial_analysis: 0.6, refinement_reasoning: 0.5 },
      logical: { initial_evaluation: 0.4, refinement_logical: 0.3 }
    };

    return temperatures[agentType]?.[phase] || 0.7;
  }

  /**
   * Clean AI response content
   * @param {string} content - Raw AI response
   * @returns {string} Cleaned content
   */
  cleanResponse(content) {
    return content
      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove thinking blocks
      .replace(/\*\*Note:.*$/gm, '') // Remove note sections
      .replace(/^(Human|Assistant):\s*/gm, '') // Remove role prefixes
      .trim();
  }

  /**
   * Validate agent response quality
   * @param {string} content - Agent response content
   * @param {string} agentType - Type of agent
   * @returns {boolean} Is response valid
   */
  validateResponse(content, agentType) {
    if (!content || content.length < 50) return false;
    
    // Check for minimum expected content based on agent type
    const expectedPatterns = {
      creative: /idea|innovation|creative|solution/i,
      reasoning: /analysis|because|therefore|reason/i,
      logical: /evaluate|assess|pros|cons|feasible/i
    };

    return expectedPatterns[agentType]?.test(content) || true;
  }

  /**
   * Extract result from Promise.allSettled result
   * @param {Object} result - Promise result
   * @param {string} agentType - Type of agent for fallback
   * @returns {string|null} Extracted result or null
   */
  extractResult(result, agentType) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error(`${agentType} agent failed:`, result.reason);
      return null;
    }
  }

  /**
   * Get fallback response for failed agent
   * @param {string} agentType - Type of agent
   * @param {string} phase - Phase of ideation
   * @param {string} prompt - Original prompt
   * @returns {string} Fallback response
   */
  getFallbackResponse(agentType, phase, prompt) {
    const fallbacks = {
      creative: `I apologize, but I'm experiencing technical difficulties. However, for "${prompt}", consider exploring unconventional approaches, cross-industry inspiration, and innovative combinations of existing solutions.`,
      reasoning: `Technical issues prevented detailed analysis. For "${prompt}", I recommend systematic problem breakdown, stakeholder analysis, and evidence-based evaluation of options.`,
      logical: `Unable to provide full evaluation due to technical issues. For "${prompt}", consider implementation feasibility, resource requirements, and potential risks before proceeding.`
    };

    return fallbacks[agentType] || 'Technical difficulties prevented response generation.';
  }

  /**
   * Synthesize results from all agents into final response
   * @param {Object} results - Results from all agents
   * @param {number} startTime - Session start time
   * @returns {Object} Synthesized response
   */
  synthesizeResults(results, startTime) {
    const duration = Date.now() - startTime;
    const durationSeconds = (duration / 1000).toFixed(1);

    // Build the final ideation response
    let response = `# 🚀 Multi-Agent Ideation Results\n\n`;

    if (results.creative) {
      response += `## 💡 Creative Perspective\n${results.creative}\n\n`;
    }

    if (results.reasoning) {
      response += `## 🧠 Reasoning Analysis\n${results.reasoning}\n\n`;
    }

    if (results.logical) {
      response += `## ⚖️ Logical Evaluation\n${results.logical}\n\n`;
    }

    response += `---\n*Ideation completed in ${durationSeconds}s using multi-agent AI collaboration*`;

    return {
      content: response,
      duration,
      agents: {
        creative: !!results.creative,
        reasoning: !!results.reasoning,
        logical: !!results.logical
      }
    };
  }
}

module.exports = AgentOrchestrator;