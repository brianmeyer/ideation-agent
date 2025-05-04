import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import config from '../../config/config';
import '../styles/Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState({ agent: '', message: '' });
  const chatHistoryRef = useRef(null);
  const socketRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Improved auto-scroll function with smooth scrolling
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatHistoryRef.current) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set a new timeout to ensure content is rendered
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollHeight = chatHistoryRef.current.scrollHeight;
        const height = chatHistoryRef.current.clientHeight;
        const maxScrollTop = scrollHeight - height;

        if (smooth) {
          chatHistoryRef.current.scrollTo({
            top: maxScrollTop > 0 ? maxScrollTop : 0,
            behavior: 'smooth'
          });
        } else {
          chatHistoryRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
        }
      }, 100); // Small delay to ensure content is rendered
    }
  }, []);

  // Scroll on new messages with smooth scrolling
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  // Scroll on status updates with smooth scrolling
  useEffect(() => {
    scrollToBottom(true);
  }, [agentStatus, scrollToBottom]);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('chat message', (data) => {
      setMessages(prev => [...prev, {
        role: data.role,
        content: data.content,
        timestamp: new Date(data.timestamp),
        isFinal: data.isFinal
      }]);

      if (data.isFinal) {
        setIsProcessing(false);
        setAgentStatus({ agent: '', message: '' });
      }
    });

    socketRef.current.on('agent_message', (data) => {
      setMessages(prev => [...prev, {
        role: data.role,
        content: data.content,
        timestamp: new Date(data.timestamp),
        isFinal: false
      }]);
    });

    socketRef.current.on('agent_status', (data) => {
      setAgentStatus({
        agent: getAgentDisplayName(data.agent),
        message: data.message
      });
    });

    socketRef.current.on('error', (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${data.message}`,
        timestamp: new Date(),
        isFinal: true
      }]);
      setIsProcessing(false);
      setAgentStatus({ agent: '', message: '' });
    });

    // Initial scroll to bottom
    scrollToBottom(false);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      socketRef.current.disconnect();
    };
  }, [scrollToBottom]);

  const getAgentDisplayName = (agent) => {
    switch(agent) {
      case 'Reasoning Agent':
        return config.AGENTS.REASONING.name;
      case 'Creative Agent':
        return config.AGENTS.CREATIVE.name;
      case 'Logical Agent':
        return config.AGENTS.LOGICAL.name;
      default:
        return agent;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const message = inputMessage.trim();
    if (message && !isProcessing) {
      setIsProcessing(true);
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date(),
        isFinal: true
      }]);
      socketRef.current.emit('chat message', message);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role} ${msg.isFinal ? 'final' : ''}`}>
            <div className="message-header">
              <span className="message-role">
                {msg.role === 'user' ? 'You' : getAgentDisplayName(msg.role)}
              </span>
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
      
      {isProcessing && (
        <div className="agent-status">
          <div className="status-header">{agentStatus.agent || 'Collaborative Ideation'}</div>
          <div className="status-message">{agentStatus.message}</div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isProcessing}
          className="message-input"
        />
        <button 
          type="submit" 
          disabled={isProcessing || !inputMessage.trim()}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat; 