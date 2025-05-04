# Ideation Agent

A powerful multiagent system for collaborative ideation and brainstorming, leveraging AI to generate and refine innovative ideas.

## Features

- 🤖 **Multi-Agent Collaboration**: Three specialized AI agents working together:
  - Creative Agent: Generates innovative ideas
  - Reasoning Agent: Analyzes and refines concepts
  - Logical Agent: Evaluates feasibility and implementation
- 💡 **Dynamic Ideation**: Real-time idea generation and refinement
- 🔄 **Interactive Process**: Collaborative iteration between agents
- ⚡ **Real-time Updates**: Live feedback and idea evolution
- 🎯 **Structured Output**: Clear, actionable recommendations

## Tech Stack

- **Frontend**: React, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **AI**: Groq API
- **Testing**: Jest
- **Build Tools**: Webpack, Babel

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

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:8081](http://localhost:8081) in your browser

## Configuration

The system is configured through `src/config/config.js`. Key settings include:

- API endpoints and keys
- Agent roles and parameters
- System prompts and templates
- Timeouts and limits

## Documentation

For detailed documentation, see [DOCUMENTATION.md](DOCUMENTATION.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Brian Meyer - [@brianmeyer](https://github.com/brianmeyer) 