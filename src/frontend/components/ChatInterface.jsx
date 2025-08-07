import React, { useState, useEffect, useRef } from 'react';
import AgentStatusIndicator from './AgentStatusIndicator';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatInterface.css';

const ChatInterface = ({ conversation, onNewConversation, onIdeaExtracted }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState({});
  const [activeTimeouts, setActiveTimeouts] = useState([]);

  useEffect(() => {
    if (conversation) {
      loadMessages();
    } else {
      // Clear messages when no conversation is selected
      setMessages([]);
    }
  }, [conversation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      activeTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [activeTimeouts]);

  const loadMessages = async () => {
    if (!conversation) return;
    
    // Clear messages first to ensure clean state
    setMessages([]);
    
    try {
      const response = await fetch(`/api/chat/history?conversationId=${conversation.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.history || []);
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
    
    // Set agent status to simulate realistic ideation process based on actual server timing
    if (isIdeationCommand) {
      // Phase 1: Creative → Logical → Reasoning (roughly 15s total)
      setAgentStatus({
        creative: 'active',
        reasoning: 'thinking', 
        logical: 'thinking'
      });
      
      // Creative completes, Logical starts (after ~3s)
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'thinking',
          logical: 'active'
        });
      }, 3000);
      
      // Logical completes, Reasoning starts (after ~9s total)
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'active',
          logical: 'complete'
        });
      }, 9000);
      
      // Phase 1 complete, start Phase 2 randomization (after ~15s)
      setTimeout(() => {
        setAgentStatus({
          creative: 'thinking',
          reasoning: 'thinking',
          logical: 'thinking'
        });
      }, 15000);
      
      // Phase 2: Show randomized activity for 60s (15s-75s)
      let phase2Interval;
      setTimeout(() => {
        phase2Interval = setInterval(() => {
          const agents = ['creative', 'reasoning', 'logical'];
          const activeAgent = agents[Math.floor(Math.random() * agents.length)];
          
          setAgentStatus({
            creative: activeAgent === 'creative' ? 'active' : 'thinking',
            reasoning: activeAgent === 'reasoning' ? 'active' : 'thinking',
            logical: activeAgent === 'logical' ? 'active' : 'thinking'
          });
        }, 4000); // Change every 4s for more dynamic feel
      }, 15000);
      
      // End Phase 2, start Phase 3 refinement (after ~75s)
      setTimeout(() => {
        if (phase2Interval) clearInterval(phase2Interval);
        setAgentStatus({
          creative: 'active',
          reasoning: 'thinking',
          logical: 'thinking'
        });
      }, 75000);
      
      // Phase 3 progression (75s-110s)
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'thinking',
          logical: 'active'
        });
      }, 85000);
      
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'active',
          logical: 'complete'
        });
      }, 95000);
      
      // Phase 4: Final Summary (110s-120s)
      setTimeout(() => {
        setAgentStatus({
          creative: 'complete',
          reasoning: 'active',
          logical: 'complete'
        });
      }, 110000);
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
          // Final completion state - all agents complete
          setTimeout(() => {
            setAgentStatus({
              creative: 'complete',
              reasoning: 'complete',
              logical: 'complete'
            });
            
            // Reset to idle after showing completion
            setTimeout(() => {
              setAgentStatus({});
            }, 5000);
          }, 100);
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