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
    this.ideationTimeLimit = config.SETTINGS.ideationTimeLimit || 10; // seconds
    this.activeSessions = new Map();
    this.responseCache = new Map();
  }

  async processMessage(message) {
    try {
      const history = await historyManager.getHistory();
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
  * [Potential breakthroughs or discoveries needed]

Remember:
- You MUST provide at least 3 ideas
- Each idea must be completely different
- Use the exact structure above
- Include at least one practical solution
- Include at least one research direction
- Think both inside and outside current technological constraints
- Consider both immediate applications and future possibilities`;
      
      const creativeResponse = await this.getAgentResponse('creative', brainstormingPrompt, history, 'brainstorming');
      
      // Add a small delay to ensure proper sequencing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store creative response in history
      const updatedHistory = [
        ...history,
        { role: 'assistant', content: creativeResponse.content }
      ];

      // Create array of remaining agents and shuffle them
      const remainingAgents = ['reasoning', 'logical'];
      const shuffledAgents = this.shuffleArray(remainingAgents);
      
      // Process remaining agents in shuffled order
      let previousResponses = { creative: creativeResponse.content };
      let lastAgent = 'creative';

      for (const agentType of shuffledAgents) {
        console.log(`Getting ${agentType} agent response...`);
        const context = this.buildCollaborationContext(previousResponses, agentType);
        const fullContext = `Original message: ${message}\n\n${context}`;
        const response = await this.getAgentResponse(agentType, fullContext, updatedHistory, `${agentType}_analysis`);
        
        // Add a small delay between agent responses
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        previousResponses[agentType] = response.content;
        updatedHistory.push({ role: 'assistant', content: response.content });
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
        
        // Get each agent's perspective in random order, excluding creative agent
        const availableAgents = Object.keys(this.agents)
          .filter(agent => agent !== 'creative');
        const shuffledIterationAgents = this.shuffleArray(availableAgents);
        
        // Process agents sequentially instead of in parallel
        const agentResponses = [];
        for (const agentType of shuffledIterationAgents) {
          const context = this.buildCollaborationContext(previousResponses, agentType);
          const fullContext = `Original message: ${message}\n\n${context}`;
          const response = await this.getAgentResponse(agentType, fullContext, updatedHistory, `iteration_${Math.floor(elapsedTime)}`);
          
          // Add a small delay between agent responses
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          agentResponses.push({ agent: agentType, response: response.content });
          previousResponses[agentType] = response.content;
          updatedHistory.push({ role: 'assistant', content: response.content });
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

      if (!config.API.key) {
        throw new Error('API key is not configured. Please check your environment variables.');
      }

      const agent = this.agents[agentType];
      const model = config.AVAILABLE_MODELS[Math.floor(Math.random() * config.AVAILABLE_MODELS.length)];
      const messages = [
        { role: 'system', content: agent.role },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ];

      console.log(`Making API call for ${agentType} agent using model ${model}...`);
      
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages,
        temperature: agent.temperature,
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
      
      // Filter out <think> portions
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      console.log(`Received complete response for ${agentType} agent using model ${model} (${content.length} characters)`);
      
      // Ensure we have the complete response
      if (content.length >= 4000) {
        console.warn(`Response from ${agentType} agent may be truncated (${content.length} characters)`);
      }

      return {
        content,
        model,
        agentType
      };
    } catch (error) {
      console.error(`Error in getAgentResponse for ${agentType}:`, error.response?.data || error.message);
      throw error;
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
      const synthesisPrompt = `Based on the collaborative ideation process, provide a final synthesis that:

1. Summarizes the key ideas and insights
2. Identifies the most promising solutions
3. Outlines practical next steps

Previous Responses:
${Object.entries(previousResponses)
  .map(([agent, response]) => `${this.agents[agent].name}:\n${response}`)
  .join('\n\n')}

Please structure your response EXACTLY as follows:

🎯 Final Recommendation:
[Your main recommendation or conclusion, must answer the original quesiton with enough context]

💡 Key Insights:
[3-5 key insights or findings]

⚖️ Practical Considerations:
[3-5 practical steps or considerations for implementation]

CRITICAL REQUIREMENTS:
1. You MUST include ALL three sections (Final Recommendation, Key Insights, Practical Considerations)
2. Each section MUST be clearly labeled with the emoji and title
3. The response MUST be properly formatted with line breaks between sections
4. The content MUST be concise and actionable`;

      const model = config.AVAILABLE_MODELS[Math.floor(Math.random() * config.AVAILABLE_MODELS.length)];
      const response = await axios.post(config.API.endpoint, {
        model: model,
        messages: [
          { role: 'system', content: 'You are a synthesis agent that combines multiple perspectives into clear, actionable insights.' },
          { role: 'user', content: synthesisPrompt }
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
      
      // Ensure the response has all required sections
      if (!content.includes('🎯 Final Recommendation:') || 
          !content.includes('💡 Key Insights:') || 
          !content.includes('⚖️ Practical Considerations:')) {
        content = `🎯 Final Recommendation:\n${content}\n\n💡 Key Insights:\n- Key insight 1\n- Key insight 2\n- Key insight 3\n\n⚖️ Practical Considerations:\n- Consideration 1\n- Consideration 2\n- Consideration 3`;
      }

      return content;
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