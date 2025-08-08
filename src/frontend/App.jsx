import React, { useState, useEffect } from 'react';
import ConversationList from './components/ConversationList';
import ChatInterface from './components/ChatInterface';
import IdeaRepository from './components/IdeaRepository';
import apiClient from './services/apiClient';
import { useToast } from './components/Toast.jsx';
import './styles/App.css';

const App = () => {
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' or 'ideas'

  const { show } = useToast();

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
      const list = data.data || [];
      setConversations(list);
      // Restore last active conversation if available
      const lastId = localStorage.getItem('lastActiveConversationId');
      if (lastId) {
        const found = list.find(c => c.id === lastId);
        if (found) {
          setActiveConversation(found);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      show(error.getUserMessage ? error.getUserMessage() : 'Failed to load conversations', { type: 'error' });
    }
  };

  const loadIdeas = async () => {
    try {
      const data = await apiClient.getIdeas();
      setIdeas(data.ideas || []);
    } catch (error) {
      console.error('Failed to load ideas:', error);
      show(error.getUserMessage ? error.getUserMessage() : 'Failed to load ideas', { type: 'error' });
    }
  };

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
    localStorage.setItem('lastActiveConversationId', conversation.id);
    setView('chat');
  };

  const handleNewConversation = async (title = 'New Conversation') => {
    try {
      const data = await apiClient.createConversation(title);
      const newConversation = data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      localStorage.setItem('lastActiveConversationId', newConversation.id);
      setView('chat');
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      show(error.getUserMessage ? error.getUserMessage() : 'Failed to create conversation', { type: 'error' });
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
        localStorage.removeItem('lastActiveConversationId');
      }
      show('Conversation deleted', { type: 'success', duration: 2000 });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      show(error.getUserMessage ? error.getUserMessage() : 'Failed to delete conversation', { type: 'error' });
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
