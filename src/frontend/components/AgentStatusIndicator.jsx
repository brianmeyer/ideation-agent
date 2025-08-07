import React from 'react';
import './AgentStatusIndicator.css';

const AgentStatusIndicator = ({ status = {} }) => {
  const agents = [
    { name: 'creative', icon: '🎨', label: 'Creative' },
    { name: 'reasoning', icon: '🧠', label: 'Reasoning' },
    { name: 'logical', icon: '⚡', label: 'Logical' }
  ];

  const getStatusDisplay = (agentStatus) => {
    switch (agentStatus) {
      case 'thinking':
        return { text: 'Thinking...', class: 'thinking' };
      case 'active':
        return { text: 'Active', class: 'active' };
      case 'complete':
        return { text: 'Complete', class: 'complete' };
      default:
        return { text: 'Idle', class: 'idle' };
    }
  };

  const hasActiveAgents = Object.keys(status).length > 0 && 
    Object.values(status).some(s => s === 'thinking' || s === 'active');

  return (
    <div className={`agent-status-container ${hasActiveAgents ? 'active' : ''}`}>
      {hasActiveAgents && (
        <div className="ideation-progress">
          <span className="progress-indicator">✨ Multi-Agent Ideation in Progress</span>
        </div>
      )}
      
      <div className="agents-status">
        {agents.map(agent => {
          const agentStatus = status[agent.name] || 'idle';
          const statusInfo = getStatusDisplay(agentStatus);
          
          return (
            <div 
              key={agent.name}
              className={`agent-indicator ${agent.name} ${statusInfo.class}`}
              title={`${agent.label} Agent: ${statusInfo.text}`}
            >
              <span className="agent-icon">{agent.icon}</span>
              <span className="agent-label">{agent.label}</span>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span className="status-text">{statusInfo.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentStatusIndicator;