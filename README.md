Test PR for webhook 4
# 🚀 Ideation Agent

> **Multi-Agent AI System for Collaborative Ideation and Brainstorming**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18%2B-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5%2B-purple.svg)](https://vitejs.dev/)

A sophisticated AI-powered ideation system that leverages multiple specialized agents (Creative 💡, Reasoning 🧠, Logical ⚖️) to provide comprehensive brainstorming and analysis capabilities. Built with React, Node.js, and integrated with Groq's fast AI models.

## ✨ Features

### 🤖 Multi-Agent AI System
- **Creative Agent (💡)**: Generates innovative, out-of-the-box ideas
- **Reasoning Agent (🧠)**: Provides analytical reasoning and structured thinking  
- **Logical Agent (⚖️)**: Evaluates feasibility and practical implementation

### 💬 Interactive Chat Interface
- **Real-time conversations** with persistent history
- **Slash commands** for triggering specific ideation modes
- **Dark theme** with purple/blue aesthetics and green accents
- **Message persistence** with SQLite database

### 🎯 Slash Commands
- `/ideate <topic>` - Full multi-agent ideation session
- `/brainstorm <topic>` - Creative-focused brainstorming
- `/analyze <problem>` - Analytical reasoning and breakdown
- `/synthesize <ideas>` - Logical evaluation and synthesis
- `/help` - View all available commands

### 💡 Idea Management
- **Automatic idea extraction** from ideation sessions
- **Searchable idea repository** with filtering and categorization
- **Tagged ideas** for easy organization
- **Export capabilities** for ideas and conversations

### 🔧 Advanced Features
- **Conversation management** with auto-generated titles
- **Response caching** for improved performance
- **Rate limiting** and request queuing
- **Comprehensive error handling** and logging
- **RESTful API** with full CRUD operations

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Groq API key** (sign up at [Groq Console](https://console.groq.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ideation-agent.git
   cd ideation-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   # Groq API Configuration
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_API_ENDPOINT=https://api.groq.com/openai/v1/chat/completions

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Ideation Settings
   IDEATION_TIME_LIMIT=60000  # 60 seconds

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

### Backend Services
- **AgentOrchestrator**: Manages AI agent coordination and execution
- **CommandProcessor**: Handles slash command parsing and routing
- **DatabaseService**: SQLite database operations and persistence
- **CacheService**: Response caching for performance optimization
- **IdeaExtractionService**: Automatic extraction and categorization of ideas

### Frontend Components
- **ChatInterface**: Real-time chat with AI agents
- **ConversationList**: Sidebar with conversation history and management
- **IdeaRepository**: Searchable collection of extracted ideas
- **APIClient**: Centralized HTTP client with error handling

### Database Schema
```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  metadata TEXT
);

-- Messages table
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  agent_type TEXT,
  metadata TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations (id)
);

-- Ideas table
CREATE TABLE ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  source_message_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_message_id) REFERENCES messages (id)
);
```

## 🎮 Usage Examples

### Basic Ideation Session
```
/ideate Create a sustainable transportation solution for urban areas
```

### Focused Brainstorming
```
/brainstorm Mobile app features for productivity
```

### Analytical Deep Dive
```
/analyze The challenges of remote work adoption in traditional companies
```

### Idea Synthesis
```
/synthesize Compare the pros and cons of electric vs hydrogen vehicles
```

## 📡 API Reference

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/:id/messages` - Get conversation messages

### Chat
- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/history` - Get chat history for conversation
- `DELETE /api/chat/history` - Clear conversation history
- `POST /api/chat/conversation` - Create new conversation

### Ideas
- `GET /api/ideas` - List all extracted ideas
- `GET /api/ideas/conversation/:id` - Get ideas from specific conversation

### System
- `GET /api/health` - Health check endpoint
- `GET /api/stats` - System statistics

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key | Required |
| `GROQ_API_ENDPOINT` | Groq API endpoint URL | `https://api.groq.com/openai/v1/chat/completions` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `IDEATION_TIME_LIMIT` | Max ideation session time (ms) | `60000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### AI Model Configuration
The system uses multiple Groq models for different agent types:

**Creative Models**: `deepseek-r1-distill-llama-70b`, `meta-llama/llama-4-scout-17b-16e-instruct`
**Reasoning Models**: `openai/gpt-oss-120b`, `gemma2-9b-it`  
**Logical Models**: `qwen/qwen3-32b`, `meta-llama/llama-4-scout-17b-16e-instruct`

## 🧪 Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Building for Production
```bash
# Build frontend assets
npm run build:client

# Start production server
npm start
```

### Docker Support
```bash
# Build Docker image
docker build -t ideation-agent .

# Run with Docker Compose
docker-compose up -d
```

## 📁 Project Structure

```
ideation-agent/
├── src/
│   ├── backend/                # Node.js server
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic services
│   │   └── utils/           # Utility functions
│   └── frontend/              # React application
│       ├── components/       # React components
│       ├── services/        # API client services
│       └── styles/         # CSS stylesheets
├── data/                      # SQLite database files
├── logs/                      # Application logs
├── docs/                      # Additional documentation
└── tests/                     # Test files
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** for providing fast AI model inference
- **React Team** for the excellent frontend framework
- **Vite** for lightning-fast build tooling
- **SQLite** for reliable embedded database

## 📞 Support

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-username/ideation-agent/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/your-username/ideation-agent/discussions)

---

Built with ❤️ for creative collaboration and innovative problem-solving.
