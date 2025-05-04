# Magentic One Web Chat

A collaborative ideation platform powered by multiple AI agents, featuring a modern dark-themed interface with real-time chat capabilities. The platform uses a unique multi-agent system where specialized AI agents work together to generate, evaluate, and refine innovative ideas.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/brianmeyer/magentic-one-web-chat.git

# Navigate to the project directory
cd magentic-one-web-chat

# Install dependencies
npm install

# Start the development server
npm run dev
```

## ✨ Key Features

- 🤖 **Multi-Agent Collaboration**
  - Creative Agent: Generates innovative ideas with structured format
  - Reasoning Agent: Analyzes and evaluates ideas
  - Logical Agent: Assesses feasibility and implementation
  - Collaborative iteration with randomized agent order
  - 10-second time limit for rapid ideation

- 💡 **Structured Ideation Process**
  - Initial brainstorming with multiple distinct ideas
  - Sequential agent analysis and feedback
  - Consensus-based iteration
  - Final synthesis with actionable recommendations

- 🎨 **Modern Interface**
  - Dark theme with intuitive design
  - Real-time updates and animations
  - Responsive across all devices
  - Smooth scrolling and message history

## 📚 Documentation

For detailed information about:
- Complete setup instructions
- Technical architecture
- Agent capabilities and roles
- Troubleshooting
- Contributing guidelines

Please refer to [DOCUMENTATION.md](DOCUMENTATION.md)

## 🛠️ Tech Stack

- **Frontend**
  - React
  - Socket.IO for real-time communication
  - Modern CSS with smooth animations

- **Backend**
  - Node.js
  - Express
  - Socket.IO for real-time communication
  - Groq API integration

- **AI Models**
  - Creative: Qwen QWQ-32B
  - Reasoning: DeepSeek R1 Distill Llama 70B
  - Logical: Gemma 2 9B IT

## ⚙️ Configuration

The application is configured through `src/config/config.js`. Key settings include:

```javascript
// Application settings
PORT: 3000
NODE_ENV: 'development'

// API configuration
API_ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions'
API_KEY: 'your_api_key_here'

// Ideation settings
IDEATION_TIME_LIMIT: 10 // seconds

// Model configuration
MODELS: {
  REASONING: 'deepseek-r1-distill-llama-70b',
  CREATIVE: 'qwen-qwq-32b',
  LOGICAL: 'gemma2-9b-it'
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 📞 Contact

For questions or support, please open an issue in the repository. 