import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import './MessageList.css';

const MessageList = ({ messages, isLoading, agentStatus }) => {
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const detectMemoryUsage = (content) => {
    const memoryPatterns = [
      /building on our previous/i,
      /from our earlier/i,
      /based on what we discussed/i,
      /continuing from/i,
      /as mentioned before/i,
      /from our conversation/i,
      /previously discussed/i,
      /earlier ideation/i
    ];
    
    return memoryPatterns.some(pattern => pattern.test(content));
  };

  const detectSlashCommand = (content) => {
    return content.trim().startsWith('/');
  };

  const detectIdeationSession = (content) => {
    const sessionPatterns = [
      /Creative Agent.*perspective/i,
      /Reasoning Agent.*analysis/i,
      /Logical Agent.*approach/i,
      /Multi-Agent Ideation/i,
      /## (Creative|Reasoning|Logical) Agent/i
    ];
    
    return sessionPatterns.some(pattern => pattern.test(content));
  };

  const getAgentFromContent = (content) => {
    if (/Creative Agent|## Creative Agent/i.test(content)) return 'creative';
    if (/Reasoning Agent|## Reasoning Agent/i.test(content)) return 'reasoning';
    if (/Logical Agent|## Logical Agent/i.test(content)) return 'logical';
    return null;
  };

  return (
    <div className="message-list">
      {messages.map(message => {
        const hasMemory = detectMemoryUsage(message.content);
        const isCommand = message.sender === 'user' && detectSlashCommand(message.content);
        const isIdeationSession = detectIdeationSession(message.content);
        const agentType = getAgentFromContent(message.content);

        return (
          <div 
            key={message.id} 
            className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-header">
              <span className="message-sender">
                {message.sender === 'user' ? '👤 You' : '🤖 AI Assistant'}
                {agentType && (
                  <span className={`agent-badge ${agentType}`}>
                    {agentType.charAt(0).toUpperCase() + agentType.slice(1)}
                  </span>
                )}
              </span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            
            <div className="message-content">
              {isCommand && (
                <div className="command-badge">
                  <span>⚡ Command</span>
                </div>
              )}
              
              {hasMemory && (
                <div className="memory-indicator">
                  <span>🧠 Using conversation memory</span>
                </div>
              )}
              
              {isIdeationSession && (
                <div className="session-badge">
                  <span>✨ Multi-Agent Ideation</span>
                </div>
              )}

              <div className="message-text">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    // Custom rendering for better formatting
                    h2: ({children}) => <h2 className="message-heading">{children}</h2>,
                    h3: ({children}) => <h3 className="message-subheading">{children}</h3>,
                    code: ({inline, children}) => 
                      inline ? <code className="inline-code">{children}</code> 
                             : <code className="code-block">{children}</code>,
                    ul: ({children}) => <ul className="message-list-items">{children}</ul>,
                    li: ({children}) => <li className="message-list-item">{children}</li>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {message.metadata && (
                <div className="message-metadata">
                  {message.metadata.ideasExtracted && (
                    <div className="ideas-extracted">
                      💡 {message.metadata.ideasExtracted} ideas extracted
                    </div>
                  )}
                  {message.metadata.model && (
                    <div className="model-info">
                      Model: {message.metadata.model}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {isLoading && (
        <div className="message ai loading">
          <div className="message-header">
            <span className="message-sender">🤖 AI Assistant</span>
          </div>
          <div className="message-content">
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>Thinking...</span>
            </div>
            {Object.keys(agentStatus).length > 0 && (
              <div className="agent-activity">
                {Object.entries(agentStatus).map(([agent, status]) => (
                  <div key={agent} className={`agent-status ${status}`}>
                    <span className={`agent-indicator ${agent}`}></span>
                    {agent} Agent: {status}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;