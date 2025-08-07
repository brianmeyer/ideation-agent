import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const [showCommandHints, setShowCommandHints] = useState(false);
  const textareaRef = useRef(null);

  const commands = [
    { command: '/help', description: 'Show available commands' },
    { command: '/ideate', description: 'Full ideation session (e.g., /ideate sustainable energy)' },
    { command: '/brainstorm', description: 'Quick brainstorming (e.g., /brainstorm mobile apps)' },
    { command: '/analyze', description: 'Deep analysis (e.g., /analyze blockchain)' },
    { command: '/synthesize', description: 'Combine insights from previous ideas' }
  ];

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      setShowCommandHints(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Show command hints when user types '/'
    if (value.trim().startsWith('/') && value.trim().length > 1) {
      setShowCommandHints(true);
    } else {
      setShowCommandHints(false);
    }
  };

  const insertCommand = (command) => {
    setMessage(command + ' ');
    setShowCommandHints(false);
    textareaRef.current?.focus();
  };

  const filteredCommands = commands.filter(cmd => 
    cmd.command.startsWith(message.trim())
  );

  return (
    <div className="message-input-container">
      {showCommandHints && filteredCommands.length > 0 && (
        <div className="command-hints">
          <div className="hints-header">💡 Available Commands:</div>
          {filteredCommands.map(cmd => (
            <div 
              key={cmd.command}
              className="command-hint"
              onClick={() => insertCommand(cmd.command)}
            >
              <code>{cmd.command}</code>
              <span>{cmd.description}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (try /help for commands)"
            disabled={disabled}
            rows={1}
            className="message-textarea"
          />
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="send-button"
            title="Send message (Enter)"
          >
            {disabled ? '⏳' : '🚀'}
          </button>
        </div>
      </form>

      <div className="quick-commands">
        <button 
          onClick={() => insertCommand('/help')}
          className="quick-command"
          disabled={disabled}
        >
          /help
        </button>
        <button 
          onClick={() => insertCommand('/ideate')}
          className="quick-command"
          disabled={disabled}
        >
          /ideate
        </button>
        <button 
          onClick={() => insertCommand('/brainstorm')}
          className="quick-command"
          disabled={disabled}
        >
          /brainstorm
        </button>
      </div>
    </div>
  );
};

export default MessageInput;