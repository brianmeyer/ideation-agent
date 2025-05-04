# Ideation Agent Documentation

## Overview

Ideation Agent is a collaborative AI system that uses three specialized agents to generate, analyze, and refine innovative ideas. The system employs a multi-agent architecture where each agent has a specific role in the ideation process.

## Architecture

### Directory Structure
```
src/
├── backend/
│   ├── services/
│   │   ├── magenticOneService.js    # Core agent interaction logic
│   │   └── cacheService.js          # Response caching
│   ├── middleware/
│   │   ├── validation.js            # Message validation
│   │   ├── rateLimiter.js          # Rate limiting
│   │   └── healthCheck.js          # Health monitoring
│   ├── utils/
│   │   ├── logger.js               # Logging utility
│   │   └── container.js            # Dependency injection
│   └── server.js                   # Express server setup
├── frontend/
│   ├── components/
│   │   └── Chat.jsx                # Main chat interface
│   └── styles/
│       └── Chat.css                # Chat styling
└── config/
    └── config.js                   # Configuration settings
```

### Multi-Agent System

The system employs three specialized agents:

1. **Creative Agent**
   - Role: Generates innovative ideas and explores novel concepts
   - Temperature: 0.9 (Higher creativity)
   - Focus: Idea generation and creative exploration

2. **Reasoning Agent**
   - Role: Analyzes ideas for feasibility and potential impact
   - Temperature: 0.7 (Balanced analysis)
   - Focus: Critical analysis and feasibility assessment

3. **Logical Agent**
   - Role: Evaluates practical implementation and identifies risks
   - Temperature: 0.5 (More conservative)
   - Focus: Risk assessment and implementation planning

### Model Selection

The system uses a pool of advanced language models that are randomly selected for each agent interaction:

- `gemma2-9b-it`: Google's efficient 9B parameter model
- `llama-3.3-70b-versatile`: Meta's versatile large language model
- `deepseek-r1-distill-llama-70b`: Distilled version of Llama 70B
- `meta-llama/llama-4-maverick-17b-128e-instruct`: Meta's instruction-tuned model
- `meta-llama/llama-4-scout-17b-16e-instruct`: Meta's scouting model
- `qwen-qwq-32b`: Alibaba's 32B parameter model

Each agent call randomly selects a model from this pool, ensuring diverse perspectives and capabilities across iterations.

### Ideation Process

1. **Initial Brainstorming**
   - Creative Agent generates initial ideas
   - Ideas are structured with clear sections and requirements

2. **Analysis Phase**
   - Reasoning Agent analyzes the ideas
   - Focuses on feasibility and potential impact

3. **Evaluation Phase**
   - Logical Agent evaluates implementation
   - Identifies risks and practical considerations

4. **Collaborative Refinement**
   - Agents iterate on ideas based on each other's feedback
   - Process continues until time limit or consensus

### Real-time Communication

The system uses WebSocket events for real-time communication:

- `chat message`: User messages and final responses
- `agent_status`: Current agent status and progress
- `agent_message`: Individual agent responses
- `error`: Error notifications

## Configuration

The `config.js` file contains all system configuration:

```javascript
module.exports = {
  API: {
    key: 'your-api-key',
    endpoint: 'your-api-endpoint'
  },
  AGENTS: {
    creative: {
      name: 'Creative Agent',
      role: 'You are a creative agent...',
      temperature: 0.9
    },
    reasoning: {
      name: 'Reasoning Agent',
      role: 'You are a reasoning agent...',
      temperature: 0.7
    },
    logical: {
      name: 'Logical Agent',
      role: 'You are a logical agent...',
      temperature: 0.5
    }
  },
  AVAILABLE_MODELS: [
    'gemma2-9b-it',
    'llama-3.3-70b-versatile',
    'deepseek-r1-distill-llama-70b',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen-qwq-32b'
  ],
  SETTINGS: {
    ideationTimeLimit: 10 // seconds
  }
};
```

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the application:
   - Copy `config.example.js` to `config.js`
   - Update with your API keys and settings

3. Start development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Run linter

## Error Handling

The system handles various error types:

1. **API Errors**
   - Invalid API key
   - Rate limiting
   - Network issues

2. **Validation Errors**
   - Invalid message format
   - Missing required fields

3. **Processing Errors**
   - Timeout errors
   - Invalid response format

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.