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
        emoji: '💡'
      },
      reasoning: {
        name: 'Reasoning',
        emoji: '🧠'
      },
      logical: {
        name: 'Logical',
        emoji: '⚖️'
      }
    };

    // All agents can use any available model randomly
    this.availableModels = config.AVAILABLE_MODELS || [
      'deepseek-r1-distill-llama-70b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'moonshotai/kimi-k2-instruct',
      'openai/gpt-oss-120b',
      'qwen/qwen3-32b',
      'llama-3.3-70b-versatile',
      'gemma2-9b-it'
    ];

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
      logger.info('Starting 4-phase ideation session', {
        prompt: prompt.substring(0, 100),
        contextLength: context.length,
        timeLimit: this.timeLimit
      });

      let sessionResults = { 
        phase1: null, 
        phase2: [], 
        phase3: null, 
        final: null 
      };

      // Phase 1: Fixed sequence - Creative → Logical → Reasoning
      logger.info('=== PHASE 1: INITIAL IDEATION (Creative → Logical → Reasoning) ===');
      sessionResults.phase1 = await this.executePhase1(prompt, context);
      
      // Phase 2: 60-second randomized agents (no back-to-back repeats)
      logger.info('=== PHASE 2: RANDOMIZED EXPANSION (60 seconds) ===');
      const phase2StartTime = Date.now();
      sessionResults.phase2 = await this.executePhase2(prompt, context, sessionResults.phase1, phase2StartTime);
      
      // Phase 3: Fixed sequence refinement - Creative → Logical → Reasoning  
      logger.info('=== PHASE 3: REFINEMENT (Creative → Logical → Reasoning) ===');
      sessionResults.phase3 = await this.executePhase3(prompt, context, sessionResults.phase1, sessionResults.phase2);
      
      // Phase 4: Final Summary Agent
      logger.info('=== PHASE 4: FINAL EVALUATION & SYNTHESIS ===');
      const finalResult = await this.executeFinalSummary(prompt, context, sessionResults);

      return finalResult;

    } catch (error) {
      logger.error('Ideation session failed', { 
        message: error.message,
        name: error.name
      });
      throw new Error(`Ideation session failed: ${error.message}`);
    }
  }

  /**
   * Phase 1: Creative → Logical → Reasoning (fixed sequence)
   */
  async executePhase1(prompt, context) {
    let results = { creative: null, logical: null, reasoning: null };
    
    // Step 1: Creative Agent generates initial ideas
    logger.info('Phase 1.1: Creative Agent - Initial brainstorming');
    results.creative = await this.executeAgent('creative', 'phase1_creative', prompt, context);
    
    // Step 2: Logical Agent evaluates creative ideas
    logger.info('Phase 1.2: Logical Agent - Initial evaluation');
    const logicalPrompt = `Original request: "${prompt}"\n\nCreative Agent's Initial Ideas:\n${results.creative || 'No creative output'}\n\nProvide logical evaluation, feasibility assessment, and identify potential challenges.`;
    results.logical = await this.executeAgent('logical', 'phase1_logical', logicalPrompt, context);
    
    // Step 3: Reasoning Agent analyzes everything
    logger.info('Phase 1.3: Reasoning Agent - Analytical reasoning');
    const reasoningPrompt = `Original request: "${prompt}"\n\nCreative Ideas:\n${results.creative || 'No creative output'}\n\nLogical Evaluation:\n${results.logical || 'No logical evaluation'}\n\nProvide structured analytical reasoning and identify implementation pathways.`;
    results.reasoning = await this.executeAgent('reasoning', 'phase1_reasoning', reasoningPrompt, context);
    
    return results;
  }

  /**
   * Phase 2: 60 seconds of randomized agents (no back-to-back repeats)
   */
  async executePhase2(prompt, context, phase1Results, startTime) {
    const phase2TimeLimit = 60000; // 60 seconds
    let expansionResults = [];
    let lastAgent = null;
    let iterationCount = 0;
    
    const agents = ['creative', 'logical', 'reasoning'];
    
    while (Date.now() - startTime < phase2TimeLimit && iterationCount < 10) {
      iterationCount++;
      
      // Select random agent (different from last one)
      let availableAgents = agents.filter(agent => agent !== lastAgent);
      const selectedAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
      
      logger.info(`Phase 2.${iterationCount}: ${selectedAgent.toUpperCase()} Agent - Expansion iteration`);
      
      // Build comprehensive context with all previous work
      let expansionContext = this.buildExpansionContext(prompt, phase1Results, expansionResults);
      
      const response = await this.executeAgent(selectedAgent, `phase2_${selectedAgent}`, expansionContext, context);
      
      if (response) {
        expansionResults.push({
          agent: selectedAgent,
          iteration: iterationCount,
          content: response,
          timestamp: Date.now() - startTime
        });
      }
      
      lastAgent = selectedAgent;
    }
    
    logger.info(`Phase 2 completed with ${expansionResults.length} expansion iterations in ${(Date.now() - startTime)/1000}s`);
    return expansionResults;
  }

  /**
   * Phase 3: Creative → Logical → Reasoning (refinement sequence) 
   */
  async executePhase3(prompt, context, phase1Results, phase2Results) {
    let results = { creative: null, logical: null, reasoning: null };
    
    // Build comprehensive context from phases 1 and 2
    const refinementContext = this.buildRefinementContext(prompt, phase1Results, phase2Results);
    
    // Step 1: Creative Agent refines and polishes ideas
    logger.info('Phase 3.1: Creative Agent - Final refinement');
    const creativePrompt = refinementContext + '\n\nRefine and polish the creative concepts with final innovative touches.';
    results.creative = await this.executeAgent('creative', 'phase3_creative', creativePrompt, context);
    
    // Step 2: Logical Agent provides final evaluation
    logger.info('Phase 3.2: Logical Agent - Final logical assessment');
    const logicalPrompt = refinementContext + `\n\nRefined Creative Concepts:\n${results.creative || 'No refined creative output'}\n\nProvide final logical assessment with detailed implementation recommendations.`;
    results.logical = await this.executeAgent('logical', 'phase3_logical', logicalPrompt, context);
    
    // Step 3: Reasoning Agent provides comprehensive analysis
    logger.info('Phase 3.3: Reasoning Agent - Final analytical synthesis');
    const reasoningPrompt = refinementContext + `\n\nRefined Creative:\n${results.creative || 'No creative output'}\n\nFinal Logical Assessment:\n${results.logical || 'No logical assessment'}\n\nProvide comprehensive analytical synthesis and structured recommendations.`;
    results.reasoning = await this.executeAgent('reasoning', 'phase3_reasoning', reasoningPrompt, context);
    
    return results;
  }

  /**
   * Build expansion context for Phase 2
   */
  buildExpansionContext(prompt, phase1Results, expansionResults) {
    let context = `Original Request: "${prompt}"\n\n`;
    
    context += '=== PHASE 1 FOUNDATION ===\n';
    if (phase1Results.creative) context += `Creative Foundation:\n${phase1Results.creative}\n\n`;
    if (phase1Results.logical) context += `Logical Foundation:\n${phase1Results.logical}\n\n`;
    if (phase1Results.reasoning) context += `Reasoning Foundation:\n${phase1Results.reasoning}\n\n`;
    
    if (expansionResults.length > 0) {
      context += '=== PHASE 2 EXPANSIONS ===\n';
      expansionResults.forEach((result, index) => {
        context += `${result.agent.toUpperCase()} Expansion ${result.iteration}:\n${result.content}\n\n`;
      });
    }
    
    context += 'Build upon ALL the above work. Expand, enhance, and add new dimensions to the evolving ideas.';
    return context;
  }

  /**
   * Build refinement context for Phase 3
   */
  buildRefinementContext(prompt, phase1Results, phase2Results) {
    let context = `Original Request: "${prompt}"\n\n`;
    
    context += '=== COMPLETE IDEATION HISTORY ===\n\n';
    
    context += 'PHASE 1 - FOUNDATION:\n';
    if (phase1Results.creative) context += `Creative: ${phase1Results.creative}\n\n`;
    if (phase1Results.logical) context += `Logical: ${phase1Results.logical}\n\n`;
    if (phase1Results.reasoning) context += `Reasoning: ${phase1Results.reasoning}\n\n`;
    
    if (phase2Results.length > 0) {
      context += 'PHASE 2 - EXPANSIONS:\n';
      phase2Results.forEach((result) => {
        context += `${result.agent.toUpperCase()} (${result.timestamp}ms): ${result.content}\n\n`;
      });
    }
    
    return context;
  }

  /**
   * Phase 4: Final Summary Agent - Feasibility/Innovation evaluation, picks 1-2 ideas, full summary
   */
  async executeFinalSummary(prompt, context, sessionResults) {
    logger.info('Phase 4: Final Summary Agent - Comprehensive evaluation and synthesis');
    
    // Build the ultimate context with ALL session data
    let summaryContext = `Original Request: "${prompt}"\n\n`;
    
    summaryContext += '=== COMPLETE 3-PHASE IDEATION SESSION ===\n\n';
    
    // Phase 1 data
    summaryContext += 'PHASE 1 (Creative → Logical → Reasoning):\n';
    if (sessionResults.phase1?.creative) summaryContext += `Creative: ${sessionResults.phase1.creative}\n\n`;
    if (sessionResults.phase1?.logical) summaryContext += `Logical: ${sessionResults.phase1.logical}\n\n`;
    if (sessionResults.phase1?.reasoning) summaryContext += `Reasoning: ${sessionResults.phase1.reasoning}\n\n`;
    
    // Phase 2 data
    if (sessionResults.phase2.length > 0) {
      summaryContext += 'PHASE 2 (60-second Randomized Expansion):\n';
      sessionResults.phase2.forEach((result) => {
        summaryContext += `${result.agent.toUpperCase()} Agent: ${result.content}\n\n`;
      });
    }
    
    // Phase 3 data  
    summaryContext += 'PHASE 3 (Final Refinement - Creative → Logical → Reasoning):\n';
    if (sessionResults.phase3?.creative) summaryContext += `Creative Refinement: ${sessionResults.phase3.creative}\n\n`;
    if (sessionResults.phase3?.logical) summaryContext += `Logical Refinement: ${sessionResults.phase3.logical}\n\n`;
    if (sessionResults.phase3?.reasoning) summaryContext += `Reasoning Refinement: ${sessionResults.phase3.reasoning}\n\n`;
    
    // Final prompt for summary agent
    summaryContext += `=== YOUR TASK AS FINAL SUMMARY AGENT ===

You are the Final Summary Agent responsible for synthesizing this entire 4-phase collaborative ideation session. Provide a COMPREHENSIVE and DETAILED final report that includes:

## 1. EXECUTIVE SUMMARY
- Brief overview of the collaborative ideation process
- Key themes and patterns that emerged across all phases

## 2. PHASE-BY-PHASE BREAKDOWN
### Phase 1 - Initial Ideation (Creative → Logical → Reasoning):
- Summarize each agent's key contributions
- Highlight initial concepts and core ideas generated

### Phase 2 - Randomized Expansion (60 seconds, 10 iterations):
- Describe how ideas evolved through random agent interactions
- Note key expansions, pivots, or new dimensions added
- Explain the collaborative build-up of concepts

### Phase 3 - Refinement (Creative → Logical → Reasoning):
- Show how agents refined and polished the concepts
- Detail final improvements and critical assessments made

## 3. COMPREHENSIVE IDEA DESCRIPTIONS
For each major idea that emerged:
- **Detailed Description**: What it is, how it works, key features
- **Innovation Assessment**: What makes it innovative or unique
- **Feasibility Analysis**: Technical, market, and implementation considerations
- **Market Potential**: Target audience, market size, business model
- **Implementation Complexity**: Development timeline, resources needed

## 4. FINAL RECOMMENDATIONS
- **Selected Ideas**: Choose 1-2 ideas with detailed justification
- **Why These Ideas**: Comprehensive reasoning for selections
- **Implementation Roadmap**: Specific phases, milestones, timelines
- **Resource Requirements**: Team, funding, partnerships needed
- **Risk Assessment**: Major risks and mitigation strategies

## 5. NEXT STEPS & ACTION PLAN
- **Immediate Actions (0-3 months)**: Specific steps to begin
- **Medium-term Milestones (3-12 months)**: Development phases
- **Long-term Vision (1-3 years)**: Scale and expansion strategy
- **Success Metrics**: How to measure progress and success

Make this comprehensive, detailed, and actionable. This is the culmination of extensive AI collaboration and should reflect that depth.`;

    const finalSummary = await this.executeAgent('reasoning', 'final_summary', summaryContext, context);
    
    return {
      content: finalSummary,
      sessionData: sessionResults,
      totalPhases: 4
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
    if (!agent) {
      throw new Error(`Agent ${agentType} not configured`);
    }

    if (!this.availableModels.length) {
      throw new Error('No available models configured');
    }

    // Select random model from the full available models list
    const model = this.availableModels[Math.floor(Math.random() * this.availableModels.length)];
    
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
        max_tokens: phase === 'final_summary' ? 4000 : 1500,
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
      
      logger.info(`Received response for ${agentType} agent using model ${model} (${cleanContent.length} characters)`);
      return cleanContent;

    } catch (error) {
      logger.error(`Error executing ${agentType} agent:`, { 
        message: error.message, 
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
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
      phase1_creative: 'Phase 1: Generate initial innovative ideas without limitations.',
      phase1_logical: 'Phase 1: Evaluate creative ideas for feasibility and identify challenges.',
      phase1_reasoning: 'Phase 1: Provide structured analytical reasoning on ideas and evaluation.',
      
      phase2_creative: 'Phase 2 Expansion: Build upon existing ideas with new creative dimensions.',
      phase2_logical: 'Phase 2 Expansion: Expand logical evaluation with additional implementation strategies.',  
      phase2_reasoning: 'Phase 2 Expansion: Deepen analytical insights and identify new considerations.',
      
      phase3_creative: 'Phase 3 Refinement: Polish and perfect creative concepts with final innovations.',
      phase3_logical: 'Phase 3 Refinement: Provide comprehensive final logical assessment.',
      phase3_reasoning: 'Phase 3 Refinement: Synthesize all analysis into structured recommendations.',
      
      final_summary: 'Final Summary Agent: Evaluate all phases, select best 1-2 ideas, summarize process, provide actionable next steps.'
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
   * Get appropriate temperature for agent and phase
   * @param {string} agentType - Type of agent
   * @param {string} phase - Phase of ideation
   * @returns {number} Temperature value
   */
  getTemperatureForPhase(agentType, phase) {
    const temperatures = {
      creative: 0.9,
      reasoning: 0.6,
      logical: 0.4
    };

    return temperatures[agentType] || 0.7;
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
}

module.exports = AgentOrchestrator;
