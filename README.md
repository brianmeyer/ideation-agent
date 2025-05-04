# Ideation Agent

A collaborative AI system that uses multiple specialized agents to generate, analyze, and refine innovative ideas.

## Overview

Ideation Agent employs three specialized AI agents working together to generate and refine ideas:

- **Creative Agent**: Generates innovative ideas and explores novel concepts
- **Reasoning Agent**: Analyzes ideas for feasibility and potential impact
- **Logical Agent**: Evaluates practical implementation and identifies risks

## Features

- **Multi-Agent Collaboration**: Three specialized agents work together to generate and refine ideas
- **Real-time Interaction**: WebSocket-based communication for immediate feedback
- **Model Rotation**: Randomly selects from available models for each agent response
- **Structured Output**: Clear, actionable recommendations with key insights and practical considerations

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/brianmeyer/ideation-agent.git
   cd ideation-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the application:
   - Copy `config.example.js` to `config.js`
   - Update the configuration with your API keys and settings

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8081`

## Configuration

The `config.js` file contains all necessary configuration:

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

Available scripts:
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Run linter

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Brian Meyer - [@brianmeyer](https://github.com/brianmeyer) 