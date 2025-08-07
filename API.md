# 📡 Ideation Agent API Documentation

> **RESTful API for Multi-Agent Ideation System**

This document provides comprehensive documentation for the Ideation Agent REST API, including endpoints, request/response formats, error handling, and usage examples.

## 🎯 Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

Currently, the API does not require authentication for development. For production deployments, implement your preferred authentication strategy.

## 📋 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }  // Only in development
}
```

## 🚨 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTH_ERROR` | 401 | Authentication required |
| `FORBIDDEN_ERROR` | 403 | Access denied |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_API_ERROR` | 500 | External API (Groq) error |
| `NETWORK_ERROR` | - | Client-side network error |

## 📚 API Endpoints

### 💬 Conversations

#### List Conversations
```http
GET /api/conversations
```

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "title": "Sustainable Transportation Ideas",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:15:00.000Z",
      "status": "active",
      "metadata": null
    }
  ],
  "count": 10
}
```

#### Create Conversation
```http
POST /api/conversations
```

**Request Body:**
```json
{
  "title": "My New Conversation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid-string",
    "title": "My New Conversation",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "status": "active",
    "metadata": null
  }
}
```

#### Get Conversation
```http
GET /api/conversations/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conversation-uuid",
    "title": "Conversation Title",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:15:00.000Z",
    "status": "active",
    "metadata": null
  }
}
```

#### Update Conversation
```http
PUT /api/conversations/:id
```

**Request Body:**
```json
{
  "title": "Updated Conversation Title",
  "status": "archived"
}
```

#### Delete Conversation
```http
DELETE /api/conversations/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

#### Get Conversation Messages
```http
GET /api/conversations/:id/messages
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "conversation_id": "uuid-string",
      "role": "user",
      "content": "/ideate sustainable transportation",
      "created_at": "2025-01-01T00:00:00.000Z",
      "agent_type": null,
      "metadata": null
    },
    {
      "id": 2,
      "conversation_id": "uuid-string",
      "role": "assistant",
      "content": "# 🚀 Multi-Agent Ideation Results...",
      "created_at": "2025-01-01T00:00:15.000Z",
      "agent_type": "multi-agent",
      "metadata": null
    }
  ]
}
```

### 🤖 Chat

#### Send Message
```http
POST /api/chat/message
```

**Request Body:**
```json
{
  "conversationId": "uuid-string",
  "message": "/ideate Create a mobile app for productivity"
}
```

**Response:**
```json
{
  "success": true,
  "response": "# 🚀 Multi-Agent Ideation Results\n\n## 💡 Creative Perspective...",
  "conversationId": "uuid-string"
}
```

#### Create Chat Conversation
```http
POST /api/chat/conversation
```

**Request Body:**
```json
{
  "title": "New Chat Session"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "new-uuid",
  "conversation": {
    "id": "new-uuid",
    "title": "New Chat Session",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "status": "active",
    "metadata": null
  }
}
```

#### Get Chat History
```http
GET /api/chat/history?conversationId=uuid-string
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "role": "user",
      "content": "Hello, I need help with ideation",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "agentType": null,
      "metadata": null
    }
  ],
  "conversation": {
    "id": "uuid-string",
    "title": "Conversation Title",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:15:00.000Z"
  }
}
```

#### Clear Chat History
```http
DELETE /api/chat/history?conversationId=uuid-string
```

**Response:**
```json
{
  "success": true,
  "message": "Chat history cleared"
}
```

### 💡 Ideas

#### List All Ideas
```http
GET /api/ideas
```

**Query Parameters:**
- `limit` (optional): Number of ideas to return (default: 100)
- `category` (optional): Filter by idea category

**Response:**
```json
{
  "success": true,
  "ideas": [
    {
      "id": 1,
      "title": "Smart Traffic Management",
      "description": "AI-powered traffic light optimization system",
      "category": "technology",
      "tags": "[\"AI\", \"transportation\", \"smart-city\"]",
      "source_message_id": 123,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "count": 25
}
```

#### Get Conversation Ideas
```http
GET /api/ideas/conversation/:conversationId
```

**Response:**
```json
{
  "success": true,
  "ideas": [
    {
      "id": 1,
      "title": "Electric Scooter Network",
      "description": "City-wide electric scooter sharing system",
      "category": "product",
      "tags": "[\"transportation\", \"sharing-economy\"]",
      "source_message_id": 456,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "count": 5
}
```

### ⚙️ System

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "service": "ideation-agent-api"
}
```

#### System Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConversations": 150,
    "totalMessages": 1250,
    "totalIdeas": 340,
    "averageMessagesPerConversation": 8.3,
    "averageIdeasPerConversation": 2.3,
    "topCategories": [
      { "category": "technology", "count": 45 },
      { "category": "business", "count": 38 },
      { "category": "product", "count": 32 }
    ]
  }
}
```

## 🎯 Slash Commands

The `/api/chat/message` endpoint supports special slash commands that trigger different AI behaviors:

### Available Commands

#### `/ideate <topic>`
Triggers a full multi-agent ideation session with Creative, Reasoning, and Logical agents.

**Example:**
```json
{
  "conversationId": "uuid",
  "message": "/ideate Create a sustainable transportation solution for urban areas"
}
```

#### `/brainstorm <topic>`
Focuses on creative brainstorming and idea generation.

**Example:**
```json
{
  "conversationId": "uuid",
  "message": "/brainstorm New social media features for content creators"
}
```

#### `/analyze <problem>`
Provides analytical reasoning and systematic problem breakdown.

**Example:**
```json
{
  "conversationId": "uuid",
  "message": "/analyze The challenges of remote work adoption in traditional companies"
}
```

#### `/synthesize <ideas>`
Evaluates and synthesizes multiple ideas or options.

**Example:**
```json
{
  "conversationId": "uuid",
  "message": "/synthesize Compare the pros and cons of electric vs hydrogen vs gas vehicles"
}
```

#### `/help [command]`
Shows available commands or detailed help for a specific command.

**Examples:**
```json
{
  "conversationId": "uuid",
  "message": "/help"
}
```

```json
{
  "conversationId": "uuid",
  "message": "/help ideate"
}
```

## 📊 Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Window**: 15 minutes (900,000ms)
- **Max Requests**: 100 per window per IP
- **Headers**: Rate limit information is included in response headers

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

When rate limit is exceeded:
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_ERROR"
}
```

## 🔧 Configuration

### Environment Variables
The API behavior can be configured using environment variables:

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window

# Ideation Settings
IDEATION_TIME_LIMIT=60000        # 60 seconds max per session

# AI Configuration
GROQ_API_KEY=your_api_key
GROQ_API_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
```

## 📝 Usage Examples

### JavaScript/Node.js
```javascript
const apiClient = {
  async sendMessage(conversationId, message) {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message })
    });
    return response.json();
  }
};

// Start an ideation session
const result = await apiClient.sendMessage(
  'conversation-uuid',
  '/ideate Create a sustainable energy solution'
);
```

### Python
```python
import requests

def send_message(conversation_id, message):
    response = requests.post(
        'http://localhost:3000/api/chat/message',
        json={'conversationId': conversation_id, 'message': message}
    )
    return response.json()

# Start brainstorming session
result = send_message('conversation-uuid', '/brainstorm Mobile app monetization strategies')
```

### cURL
```bash
# Create new conversation
curl -X POST http://localhost:3000/api/chat/conversation \
  -H "Content-Type: application/json" \
  -d '{"title": "My Ideation Session"}'

# Send ideation message
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "your-conversation-id",
    "message": "/ideate Design a smart home automation system"
  }'
```

## 🚀 WebSocket Support (Future)

*Coming Soon*: Real-time WebSocket support for live ideation sessions and collaborative brainstorming.

## 🛠️ Development Tools

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Get system stats
curl http://localhost:3000/api/stats

# List conversations
curl http://localhost:3000/api/conversations
```

### Response Validation
All responses include a `success` field to indicate whether the operation completed successfully. Always check this field before processing the response data.

## 📞 Support & Feedback

- **Issues**: Report API bugs on [GitHub Issues](https://github.com/your-username/ideation-agent/issues)
- **Feature Requests**: Use [GitHub Discussions](https://github.com/your-username/ideation-agent/discussions)
- **Documentation**: Additional docs in the [docs/](docs/) directory

---

Built with ❤️ for developers who want to integrate AI-powered ideation into their applications.