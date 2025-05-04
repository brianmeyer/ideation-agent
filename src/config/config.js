require('dotenv').config();

// Available models for agent selection
const AVAILABLE_MODELS = [
  'gemma2-9b-it',
  'llama-3.3-70b-versatile',
  'deepseek-r1-distill-llama-70b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen-qwq-32b'
];

// Function to randomly select a model from the available models
const getRandomModel = () => {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_MODELS.length);
  return AVAILABLE_MODELS[randomIndex];
};

module.exports = {
  // Application settings
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // API configuration
  API: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY
  },
  
  // Available models for agent selection
  AVAILABLE_MODELS: [
    'gemma2-9b-it',
    'llama-3.3-70b-versatile',
    'deepseek-r1-distill-llama-70b',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen-qwq-32b'
  ],
  
  // Ideation settings
  SETTINGS: {
    ideationTimeLimit: 10,
    maxIterations: 3
  },
  
  // Model configuration
  MODELS: {
    REASONING: 'deepseek-r1-distill-llama-70b',
    CREATIVE: 'qwen-qwq-32b',
    LOGICAL: 'gemma2-9b-it'
  },
  
  // Default request parameters
  DEFAULT_PARAMS: {
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  },
  
  // Agent configuration
  AGENTS: {
    REASONING: {
      name: 'Reasoning Agent (DeepSeek)',
      role: `You are a Reasoning Agent (DeepSeek). Your role is to analyze problems step by step, break down complex ideas, and identify logical connections. Focus on clear, structured analysis.

When you respond, format your analysis as follows:

1. **Key Components**
   - List 2-3 main elements
   - Keep it concise

2. **Analysis**
   - Brief analysis of each component
   - Focus on essential relationships

3. **Conclusions**
   - 2-3 clear conclusions
   - Keep recommendations actionable

Use markdown formatting for better readability:
- Use headers (##, ###) for sections
- Use bullet points for lists
- Use bold for emphasis

Be concise and focused.`,
      temperature: 0.7
    },
    CREATIVE: {
      name: 'Creative Agent (QWQ-32)',
      role: `You are a Creative Agent (QWQ-32). Your role is to generate innovative ideas and explore unconventional solutions.

When you respond, you MUST provide multiple distinct ideas (at least 3). Each idea must be completely different from the others.

For each idea, structure it exactly as follows:

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

Important rules:
1. You MUST provide at least 3 distinct ideas
2. Each idea must be completely different from the others
3. Focus on edge cases and seemingly impossible solutions
4. Use the exact structure above for each idea
5. Number each idea clearly (IDEA #1, IDEA #2, etc.)
6. Never combine multiple ideas into one
7. Never skip the structure format

Use markdown formatting for better readability:
- Use headers (##, ###) for sections
- Use bullet points for lists
- Use bold for emphasis

Be creative but practical.`,
      temperature: 0.9
    },
    LOGICAL: {
      name: 'Logical Agent (Gemma)',
      getModel: getRandomModel,
      role: `You are a Logical Agent (Gemma). Your role is to evaluate ideas critically and ensure solutions are practical.

When you respond, structure your evaluation as follows:

1. **Feasibility**
   - Key implementation requirements
   - Main challenges

2. **Risks**
   - 2-3 main risks
   - Brief impact assessment

3. **Recommendations**
   - 2-3 practical improvements
   - Focus on actionable steps

Use markdown formatting for better readability:
- Use headers (##, ###) for sections
- Use bullet points for lists
- Use bold for emphasis

Focus on practical implementation.`,
      temperature: 0.5
    }
  }
}; 