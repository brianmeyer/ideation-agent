# Magentic One Web Chat Documentation

## Overview
Magentic One Web Chat is a multiagent orchestration system designed for collaborative ideation and brainstorming. The system employs three specialized AI agents working together in a structured process to generate, analyze, and evaluate innovative ideas in real-time.

## Architecture

### Backend Structure
```
src/backend/
├── server.js           # Main Express server
├── services/          # Business logic services
│   └── magenticOneService.js  # Core agent orchestration
├── utils/            # Utility functions
│   └── historyManager.js     # Chat history management
└── config/          # Configuration files
    └── config.js    # Application settings and agent roles
```

### Frontend Structure
```
src/frontend/
├── components/      # React components
│   ├── Chat.jsx    # Main chat interface
│   └── Message.jsx # Message component
├── styles/         # CSS files
│   └── Chat.css    # Chat interface styles
├── App.jsx         # Main application component
└── index.jsx       # Entry point
```

## Multi-Agent System

### Agent Roles

#### Creative Agent (QWQ-32B)
- Generates multiple distinct ideas (minimum 3)
- Uses structured format for each idea
- Focuses on edge cases and innovative solutions
- Temperature: 0.9 for maximum creativity

#### Reasoning Agent (DeepSeek R1)
- Analyzes and evaluates ideas
- Provides structured analysis
- Identifies key components and relationships
- Temperature: 0.7 for balanced reasoning

#### Logical Agent (Gemma 2)
- Assesses feasibility and implementation
- Evaluates risks and challenges
- Provides practical recommendations
- Temperature: 0.5 for conservative evaluation

### Ideation Process

1. **Initial Brainstorming**
   - Creative Agent generates multiple ideas
   - Each idea follows structured format
   - Ideas are completely distinct

2. **Sequential Analysis**
   - Reasoning and Logical agents analyze in random order
   - Each agent builds on previous responses
   - No agent is called twice in succession

3. **Collaborative Iteration**
   - 10-second time limit for rapid ideation
   - Agents iterate based on previous responses
   - Consensus-based decision making

4. **Final Synthesis**
   - Concise final recommendation
   - Incorporates all agent perspectives
   - Focuses on actionable insights

## Real-time Communication

### WebSocket Events

#### Client to Server
- `chat message`: Send a new message
- `disconnect`: Client disconnection

#### Server to Client
- `chat message`: New message from any agent
- `agent_message`: Message from a specific agent
- `agent_status`: Status update from an agent
- `error`: Error notification

## Configuration

### Core Settings (config.js)
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

## Development

### Setup
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Run linter

## Deployment

### Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Groq API key

### Docker Support
```bash
docker build -t magentic-one-web-chat .
docker run -p 3000:3000 magentic-one-web-chat
```

## Error Handling

### API Errors
- 400: Bad Request
- 401: Invalid API Key
- 429: Rate Limit Exceeded
- 500: Internal Server Error

### WebSocket Errors
- Invalid message format
- Processing errors
- Timeout errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License