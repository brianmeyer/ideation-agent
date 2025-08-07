import React, { useState, useEffect, useRef } from 'react';
import AgentStatusIndicator from './AgentStatusIndicator';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatInterface.css';

const ChatInterface = ({ conversation, onNewConversation, onIdeaExtracted }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState({});

  useEffect(() => {
    if (conversation) {
      loadMessages();
    }
  }, [conversation]);

  const loadMessages = async () => {
    if (!conversation) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (message) => {
    if (!conversation) {
      // Create new conversation if none exists
      const newConv = await onNewConversation('New Chat');
      if (!newConv) return;
    }

    const userMessage = {
      id: Date.now(),
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Check if this is an ideation command
    const isIdeationCommand = message.trim().toLowerCase().startsWith('/ideate') ||
                             message.trim().toLowerCase().startsWith('/brainstorm') ||
                             message.trim().toLowerCase().startsWith('/analyze') ||
                             message.trim().toLowerCase().startsWith('/synthesize');
    
    // Set agent status to simulate ideation process
    if (isIdeationCommand) {
      // Start with all agents thinking
      setAgentStatus({
        creative: 'thinking',
        reasoning: 'thinking', 
        logical: 'thinking'
      });
      
      // Simulate agent progression
      setTimeout(() => {
        setAgentStatus({
          creative: 'active',
          reasoning: 'thinking',
          logical: 'thinking'
        });
      }, 1000);
      
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'active',
          logical: 'thinking'
        });
      }, 3000);
      
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'complete',
          logical: 'active'
        });
      }, 5000);
    }

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          content: data.response,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          metadata: data.metadata
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Complete all agents if this was an ideation session
        if (isIdeationCommand) {
          setAgentStatus({
            creative: 'complete',
            reasoning: 'complete',
            logical: 'complete'
          });
          
          // Reset to idle after a delay
          setTimeout(() => {
            setAgentStatus({});
          }, 3000);
        }
        
        // Check if ideas were extracted
        if (data.ideasExtracted) {
          onIdeaExtracted?.();
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      
      // Reset agent status on error
      if (isIdeationCommand) {
        setTimeout(() => {
          setAgentStatus({});
        }, 1000);
      }
    }
  };

  if (!conversation) {
    return (
      <div className="chat-interface no-conversation">
        <div className="welcome-message">
          <h2>🚀 Welcome to Ideation Agent</h2>
          <p>Create a new conversation to start ideating!</p>
          <div className="command-hints">
            <h3>💡 Try these commands:</h3>
            <ul>
              <li><code>/ideate sustainable energy</code> - Full ideation session</li>
              <li><code>/brainstorm mobile apps</code> - Quick brainstorming</li>
              <li><code>/analyze blockchain technology</code> - Deep analysis</li>
              <li><code>/help</code> - Show all commands</li>
            </ul>
          </div>
          <button 
            className="cta-button"
            onClick={() => onNewConversation()}
          >
            Start Your First Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="conversation-info">
          <h2>{conversation.title}</h2>
          <span className="conversation-id">ID: {conversation.id}</span>
        </div>
        <AgentStatusIndicator status={agentStatus} />
      </div>

      <MessageList 
        messages={messages}
        isLoading={isLoading}
        agentStatus={agentStatus}
      />

      <MessageInput 
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  );
};

export default ChatInterface;