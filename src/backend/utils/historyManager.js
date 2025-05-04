const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../../data/chat_history.json');

class HistoryManager {
  constructor() {
    this.history = [];
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
      const data = await fs.readFile(HISTORY_FILE, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it
        await this.saveHistory();
      } else {
        console.error('Error initializing history:', error);
      }
    }
  }

  async saveHistory() {
    try {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  }

  async addMessage(role, content) {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    this.history.push(message);
    await this.saveHistory();
  }

  async getHistory() {
    return this.history;
  }

  async clearHistory() {
    this.history = [];
    await this.saveHistory();
  }
}

// Create a singleton instance
const historyManager = new HistoryManager();

module.exports = historyManager; 