const axios = require('axios');
const config = require('../../config/config');
const historyManager = require('../utils/historyManager');

class MagenticOneService {
  constructor() {
    this.agents = {
      reasoning: config.AGENTS.REASONING,
      creative: config.AGENTS.CREATIVE,
      logical: config.AGENTS.LOGICAL
    };
    this.models = {
      reasoning: config.MODELS.REASONING,
      creative: config.MODELS.CREATIVE,
      logical: config.MODELS.LOGICAL
    };
    this.ideationTimeLimit = config.IDEATION_TIME_LIMIT || 120; // seconds
    this.activeSessions = new Map();
    this.responseCache = new Map();
  }

  async processMessage(message) {
    try {
      const history = await historyManager.getHistory();
      const startTime = Date.now();
      
      // Initial brainstorming with creative agent
      console.log('Getting initial brainstorming ideas...');
      const brainstormingPrompt = `You are in brainstorming mode. Your task is to generate multiple diverse ideas using a mindmap model, and focusing on edge or almost impossible solutions or ideas in response to this question:

"${message}"

CRITICAL REQUIREMENTS:
1. You MUST provide at least 3 COMPLETELY DIFFERENT ideas
2. Each idea must be unique and not related to the others
3. Do not combine multiple ideas into one
4. Follow the exact structure below for EACH idea

For each idea, use this EXACT structure:

IDEA #[number]: [Title]
- Core Concept: [One sentence description]
- Key Features:
  * [Feature 1]
  * [Feature 2]
  * [Feature 3]
- Potential Benefits:
  * [Benefit 1]
  * [Benefit 2]
- Edge Case/Innovation: [What makes this idea unique or seemingly impossible?]

Remember:
- You MUST provide at least 3 ideas
- Each idea must be completely different
- Use the exact structure above
- Number each idea (IDEA #1, IDEA #2, etc.)
- Focus on edge cases and seemingly impossible solutions
- Think outside the box and avoid conventional ideas`;
      
      const creativeIdeas = await this.getAgentResponse('creative', brainstormingPrompt, history, 'brainstorming');
      
      // Add a small delay to ensure proper sequencing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store creative response in history
      const updatedHistory = [
        ...history,
        { role: 'assistant', content: creativeIdeas }
      ];

      // Create array of remaining agents and shuffle them
      const remainingAgents = ['reasoning', 'logical'];
      const shuffledAgents = this.shuffleArray(remainingAgents);
      
      // Process remaining agents in shuffled order
      let previousResponses = { creative: creativeIdeas };
      let lastAgent = 'creative';

      for (const agentType of shuffledAgents) {
        console.log(`Getting ${agentType} agent response...`);
        const context = this.buildCollaborationContext(previousResponses, agentType);
        const fullContext = `Original message: ${message}\n\n${context}`;
        const response = await this.getAgentResponse(agentType, fullContext, updatedHistory, `${agentType}_analysis`);
        
        // Add a small delay between agent responses
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        previousResponses[agentType] = response;
        updatedHistory.push({ role: 'assistant', content: response });
        lastAgent = agentType;
      }
      
      // Collaborative iteration
      while (true) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= this.ideationTimeLimit) {
          console.log(`Time limit reached after ${elapsedTime} seconds`);
          break;
        }
        
        console.log(`Starting new iteration (${elapsedTime.toFixed(1)}s elapsed)...`);
        
        // Get each agent's perspective in random order, avoiding last agent and creative agent
        const availableAgents = Object.keys(this.agents)
          .filter(agent => agent !== lastAgent && agent !== 'creative');
        const shuffledIterationAgents = this.shuffleArray(availableAgents);
        
        // Process agents sequentially instead of in parallel
        const agentResponses = [];
        for (const agentType of shuffledIterationAgents) {
          const context = this.buildCollaborationContext(previousResponses, agentType);
          const fullContext = `Original message: ${message}\n\n${context}`;
          const response = await this.getAgentResponse(agentType, fullContext, updatedHistory, `iteration_${Math.floor(elapsedTime)}`);
          
          // Add a small delay between agent responses
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          agentResponses.push({ agent: agentType, response });
          previousResponses[agentType] = response;
          updatedHistory.push({ role: 'assistant', content: response });
          lastAgent = agentType;
        }
        
        // Check if we've reached consensus
        if (this.hasReachedConsensus(agentResponses)) {
          console.log('Consensus reached, ending iteration');
          break;
        }
      }
      
      // Generate final synthesis
      const finalResponse = await this.generateFinalResponse(previousResponses);
      return finalResponse;
      
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

      if (!config.API_KEY) {
        throw new Error('API key is not configured. Please check your environment variables.');
      }

      const agent = this.agents[agentType];
      const model = this.models[agentType];
      const messages = [
        { role: 'system', content: agent.role },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ];

      console.log(`Making API call for ${agentType} agent using model ${model}...`);
      
      const response = await axios.post(config.API_ENDPOINT, {
        model: model,
        messages,
        temperature: agent.temperature,
        max_tokens: 4000, // Increased from default to ensure complete responses
        top_p: config.DEFAULT_PARAMS.top_p,
        frequency_penalty: config.DEFAULT_PARAMS.frequency_penalty,
        presence_penalty: config.DEFAULT_PARAMS.presence_penalty,
        stream: false // Ensure we get the complete response
      }, {
        headers: {
          'Authorization': `Bearer ${config.API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      let content = response.data.choices[0].message.content;
      
      // Filter out <think> portions
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      console.log(`Received complete response for ${agentType} agent (${content.length} characters)`);
      
      // Ensure we have the complete response
      if (content.length >= 4000) {
        console.warn(`Response from ${agentType} agent may be truncated (${content.length} characters)`);
      }

      return content;
    } catch (error) {
      console.error(`Error in getAgentResponse for ${agentType}:`, error.response?.data || error.message);
      
      // Provide more specific error messages
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid API key. Please check your GROQ_API_KEY environment variable.');
        } else if (error.response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.response.status === 404) {
          throw new Error('Model not found. Please check your model configuration.');
        } else {
          throw new Error(`API error: ${error.response.data?.error?.message || error.message}`);
        }
      } else if (error.request) {
        throw new Error('No response received from API. Please check your internet connection.');
      } else {
        throw new Error(`Error making request: ${error.message}`);
      }
    }
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

    return `Previous agent perspectives:\n\n${agentContexts}\n\nBased on these perspectives, please provide your analysis as the ${this.agents[currentAgent].name}.`;
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
      // First, get a creative synthesis of the ideas
      const creativeContext = Object.entries(previousResponses)
        .map(([agent, response]) => `${this.agents[agent].name}'s perspective:\n${response}`)
        .join('\n\n');
      
      const creativePrompt = `As a creative synthesizer, identify the most innovative and unique elements from these perspectives. Focus on novel combinations and unexpected insights:\n\n${creativeContext}`;
      const creativeSynthesis = await this.getAgentResponse('creative', creativePrompt, [], 'creative_synthesis');

      // Then, get a logical evaluation of the synthesis
      const logicalPrompt = `Evaluate this creative synthesis for feasibility and practical implementation. Identify strengths and potential challenges:\n\n${creativeSynthesis}`;
      const logicalEvaluation = await this.getAgentResponse('logical', logicalPrompt, [], 'logical_evaluation');

      // Get the original question from the first message in history
      const history = await historyManager.getHistory();
      const originalQuestion = history.length > 0 ? history[0].content : '';

      // Finally, get a reasoned final recommendation
      const finalPrompt = `Original Question: "${originalQuestion}"

Based on the creative synthesis and logical evaluation, provide a concise final recommendation (max 3 paragraphs) that balances innovation with practicality.

Before providing your recommendation, please:
1. Review the original question above and ensure your answer directly addresses it
2. Check that all aspects of the question have been covered
3. Verify that the answer is complete and doesn't leave any key points unaddressed
4. Confirm that the response maintains relevance to the original query
5. If the response doesn't fully address the question, explain what aspects need more attention

Creative Synthesis:
${creativeSynthesis}

Logical Evaluation:
${logicalEvaluation}

Please provide a clear, concise final recommendation (max 3 paragraphs) that fully answers the original question while incorporating both creative insights and practical considerations. Focus on the most important points and actionable next steps.`;
      const finalRecommendation = await this.getAgentResponse('reasoning', finalPrompt, [], 'final_recommendation');

      // Format the final response to include all perspectives and question relevance
      return `🎯 Final Recommendation:\n\n${finalRecommendation}\n\n💡 Key Insights:\n${creativeSynthesis}\n\n⚖️ Practical Considerations:\n${logicalEvaluation}`;
    } catch (error) {
      console.error('Error generating final response:', error);
      throw error;
    }
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
}

// Create a singleton instance
const magenticOneService = new MagenticOneService();

module.exports = MagenticOneService; 