import React from 'react';
import Chat from './components/Chat';
import './styles/App.css';

const App = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Magentic One - Collaborative AI Ideation</h1>
      </header>
      <main className="app-main">
        <Chat />
      </main>
    </div>
  );
};

export default App; 