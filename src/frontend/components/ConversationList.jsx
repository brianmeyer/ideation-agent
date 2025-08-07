import React, { useState } from 'react';
import './ConversationList.css';

const ConversationList = ({ 
  conversations, 
  activeConversation, 
  onSelect, 
  onNew, 
  onRefresh,
  onDelete 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      await onNew(newTitle.trim());
      setNewTitle('');
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (conversationId, e) => {
    e.stopPropagation(); // Prevent triggering onSelect
    
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await onDelete(conversationId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationPreview = (conversation) => {
    // Extract preview from metadata or use default
    if (conversation.metadata) {
      try {
        const metadata = JSON.parse(conversation.metadata);
        return metadata.preview || 'No messages yet';
      } catch (e) {
        return 'No messages yet';
      }
    }
    return 'No messages yet';
  };

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h3>Conversations</h3>
        <button 
          className="refresh-button"
          onClick={onRefresh}
          title="Refresh conversations"
        >
          🔄
        </button>
      </div>

      <form className="new-conversation-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Start new conversation..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          disabled={isCreating}
        />
        <button 
          type="submit" 
          disabled={isCreating || !newTitle.trim()}
          className="create-button"
        >
          {isCreating ? '⏳' : '💬'}
        </button>
      </form>

      <div className="conversations">
        {conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <p className="hint">Create your first conversation above!</p>
          </div>
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                activeConversation?.id === conversation.id ? 'active' : ''
              }`}
              onClick={() => onSelect(conversation)}
            >
              <div className="conversation-header">
                <h4 className="conversation-title">{conversation.title}</h4>
                <div className="conversation-actions">
                  <span className="conversation-date">
                    {formatDate(conversation.updated_at || conversation.created_at)}
                  </span>
                  <button
                    className="delete-button"
                    onClick={(e) => handleDelete(conversation.id, e)}
                    title="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="conversation-preview">
                {getConversationPreview(conversation)}
              </p>
              {conversation.status === 'ideating' && (
                <div className="status-badge ideating">
                  <span className="pulse"></span>
                  Ideating...
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;