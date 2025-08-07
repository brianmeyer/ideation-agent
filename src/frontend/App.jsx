import React, { useState, useEffect } from 'react';
import ConversationList from './components/ConversationList';
import ChatInterface from './components/ChatInterface';
import IdeaRepository from './components/IdeaRepository';
import apiClient from './services/apiClient';
import './styles/App.css';

const App = () => {
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' or 'ideas'

  useEffect(() => {
    // Skip Socket.IO for now to avoid hanging
    setIsConnected(true);

    // Load initial conversations
    loadConversations();
    loadIdeas();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await apiClient.getConversations();
      setConversations(data.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error.getUserMessage());
    }
  };

  const loadIdeas = async () => {
    try {
      const data = await apiClient.getIdeas();
      setIdeas(data.ideas || []);
    } catch (error) {
      console.error('Failed to load ideas:', error.getUserMessage());
    }
  };

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
    setView('chat');
  };

  const handleNewConversation = async (title = 'New Conversation') => {
    try {
      const data = await apiClient.createConversation(title);
      const newConversation = data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setView('chat');
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error.getUserMessage());
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await apiClient.deleteConversation(conversationId);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If deleted conversation was active, clear active conversation
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error.getUserMessage());
      throw error; // Re-throw so the component can handle it
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🚀 Ideation Agent</h1>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <nav className="header-nav">
          <button 
            className={`nav-button ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`nav-button ${view === 'ideas' ? 'active' : ''}`}
            onClick={() => setView('ideas')}
          >
            💡 Ideas
          </button>
        </nav>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            onSelect={handleConversationSelect}
            onNew={handleNewConversation}
            onRefresh={loadConversations}
            onDelete={handleDeleteConversation}
          />
        </aside>

        <section className="main-content">
          {view === 'chat' ? (
            <ChatInterface
              conversation={activeConversation}
              onNewConversation={handleNewConversation}
              onIdeaExtracted={loadIdeas}
            />
          ) : (
            <IdeaRepository
              ideas={ideas}
              onRefresh={loadIdeas}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;