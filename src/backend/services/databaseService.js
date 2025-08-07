/**
 * Database Service
 * 
 * Handles all database operations for the Ideation Agent system using SQLite.
 * Provides CRUD operations for conversations, messages, and sessions with
 * proper error handling and data validation.
 * 
 * Features:
 * - Conversation management with auto-generated titles
 * - Message storage with agent type tracking
 * - Session management with automatic cleanup
 * - Search functionality across conversations and messages
 * - Export capabilities for conversation data
 * - Analytics and statistics tracking
 * 
 * @class DatabaseService
 * @author Brian Meyer
 * @version 2.0.0
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../../data/ideation.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createTables = [
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        metadata TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        agent_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        session_data TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        status TEXT DEFAULT 'active',
        rating INTEGER DEFAULT 0,
        implementation_timeline TEXT,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        source_message_id TEXT,
        metadata TEXT,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS idea_relationships (
        id TEXT PRIMARY KEY,
        idea1_id TEXT,
        idea2_id TEXT,
        relationship_type TEXT,
        strength REAL DEFAULT 0.5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(idea1_id) REFERENCES ideas(id),
        FOREIGN KEY(idea2_id) REFERENCES ideas(id)
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ideas_conversation_id ON ideas(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category)`,
      `CREATE INDEX IF NOT EXISTS idx_ideas_extracted_at ON ideas(extracted_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_idea_relationships_idea1 ON idea_relationships(idea1_id)`,
      `CREATE INDEX IF NOT EXISTS idx_idea_relationships_idea2 ON idea_relationships(idea2_id)`
    ];

    for (const sql of createTables) {
      await this.run(sql);
    }
    
    logger.info('Database tables initialized');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Conversation methods
  async createConversation(title = 'New Conversation') {
    const id = uuidv4();
    await this.run(
      'INSERT INTO conversations (id, title) VALUES (?, ?)',
      [id, title]
    );
    return id;
  }

  async getConversation(id) {
    return await this.get(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
  }

  async getConversations(limit = 50) {
    return await this.all(
      'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
  }

  async updateConversation(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.title) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    if (updates.metadata) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    return await this.run(
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteConversation(id) {
    // Delete related records first due to foreign key constraints
    await this.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    await this.run('DELETE FROM ideas WHERE conversation_id = ?', [id]);
    return await this.run('DELETE FROM conversations WHERE id = ?', [id]);
  }

  // Message methods
  async addMessage(conversationId, role, content, agentType = null, metadata = null) {
    const id = uuidv4();
    await this.run(
      'INSERT INTO messages (id, conversation_id, role, content, agent_type, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversationId, role, content, agentType, metadata ? JSON.stringify(metadata) : null]
    );
    
    // Update conversation timestamp
    await this.updateConversation(conversationId, {});
    
    return id;
  }

  async getMessages(conversationId, limit = 100) {
    return await this.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?',
      [conversationId, limit]
    );
  }

  async getConversationWithMessages(id) {
    const conversation = await this.getConversation(id);
    if (!conversation) return null;
    
    const messages = await this.getMessages(id);
    return {
      ...conversation,
      messages: messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    };
  }

  // Session methods
  async createSession(sessionData, expiresAt) {
    const id = uuidv4();
    await this.run(
      'INSERT INTO sessions (id, session_data, expires_at) VALUES (?, ?, ?)',
      [id, JSON.stringify(sessionData), expiresAt]
    );
    return id;
  }

  async getSession(id) {
    const session = await this.get(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP',
      [id]
    );
    
    if (session && session.session_data) {
      return {
        ...session,
        session_data: JSON.parse(session.session_data)
      };
    }
    
    return null;
  }

  async updateSession(id, sessionData, expiresAt) {
    return await this.run(
      'UPDATE sessions SET session_data = ?, expires_at = ? WHERE id = ?',
      [JSON.stringify(sessionData), expiresAt, id]
    );
  }

  async deleteSession(id) {
    return await this.run('DELETE FROM sessions WHERE id = ?', [id]);
  }

  async cleanupExpiredSessions() {
    return await this.run('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
  }

  // Analytics methods
  async getConversationStats() {
    const totalConversations = await this.get('SELECT COUNT(*) as count FROM conversations');
    const totalMessages = await this.get('SELECT COUNT(*) as count FROM messages');
    const recentConversations = await this.get(
      'SELECT COUNT(*) as count FROM conversations WHERE created_at > datetime("now", "-7 days")'
    );
    
    return {
      totalConversations: totalConversations.count,
      totalMessages: totalMessages.count,
      recentConversations: recentConversations.count
    };
  }

  // Idea methods
  async addIdea(conversationId, title, description, category = null, tags = [], implementationTimeline = null, sourceMessageId = null, metadata = null) {
    const id = uuidv4();
    await this.run(
      'INSERT INTO ideas (id, conversation_id, title, description, category, tags, implementation_timeline, source_message_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, conversationId, title, description, category, tags.join(','), implementationTimeline, sourceMessageId, metadata ? JSON.stringify(metadata) : null]
    );
    return id;
  }

  async getIdea(id) {
    const idea = await this.get(
      'SELECT * FROM ideas WHERE id = ?',
      [id]
    );
    
    if (idea && idea.tags) {
      idea.tags = idea.tags.split(',').filter(tag => tag.trim());
    }
    
    if (idea && idea.metadata) {
      idea.metadata = JSON.parse(idea.metadata);
    }
    
    return idea;
  }

  async getIdeasByConversation(conversationId) {
    const ideas = await this.all(
      'SELECT * FROM ideas WHERE conversation_id = ? ORDER BY extracted_at DESC',
      [conversationId]
    );
    
    return ideas.map(idea => ({
      ...idea,
      tags: idea.tags ? idea.tags.split(',').filter(tag => tag.trim()) : [],
      metadata: idea.metadata ? JSON.parse(idea.metadata) : null
    }));
  }

  async getAllIdeas(limit = 100, category = null) {
    let query = 'SELECT i.*, c.title as conversation_title FROM ideas i LEFT JOIN conversations c ON i.conversation_id = c.id';
    let params = [];
    
    if (category) {
      query += ' WHERE i.category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY i.extracted_at DESC LIMIT ?';
    params.push(limit);
    
    const ideas = await this.all(query, params);
    
    return ideas.map(idea => ({
      ...idea,
      tags: idea.tags ? idea.tags.split(',').filter(tag => tag.trim()) : [],
      metadata: idea.metadata ? JSON.parse(idea.metadata) : null
    }));
  }

  async updateIdea(id, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'tags' && Array.isArray(updates[key])) {
        fields.push('tags = ?');
        values.push(updates[key].join(','));
      } else if (key === 'metadata' && updates[key]) {
        fields.push('metadata = ?');
        values.push(JSON.stringify(updates[key]));
      } else if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    values.push(id);
    
    return await this.run(
      `UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteIdea(id) {
    // Delete relationships first
    await this.run('DELETE FROM idea_relationships WHERE idea1_id = ? OR idea2_id = ?', [id, id]);
    return await this.run('DELETE FROM ideas WHERE id = ?', [id]);
  }

  async searchIdeas(query, limit = 20) {
    return await this.all(
      `SELECT i.*, c.title as conversation_title FROM ideas i
       LEFT JOIN conversations c ON i.conversation_id = c.id
       WHERE i.title LIKE ? OR i.description LIKE ? OR i.tags LIKE ? OR i.category LIKE ?
       ORDER BY i.extracted_at DESC LIMIT ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit]
    );
  }

  async getIdeaStats() {
    const totalIdeas = await this.get('SELECT COUNT(*) as count FROM ideas');
    const categoryCounts = await this.all(
      'SELECT category, COUNT(*) as count FROM ideas WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC'
    );
    const recentIdeas = await this.get(
      'SELECT COUNT(*) as count FROM ideas WHERE extracted_at > datetime("now", "-7 days")'
    );
    
    return {
      totalIdeas: totalIdeas.count,
      categoryCounts,
      recentIdeas: recentIdeas.count
    };
  }

  // Search methods
  async searchConversations(query, limit = 20) {
    return await this.all(
      `SELECT DISTINCT c.* FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.title LIKE ? OR m.content LIKE ?
       ORDER BY c.updated_at DESC LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    );
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err);
          } else {
            logger.info('Database connection closed');
          }
          resolve();
        });
      });
    }
  }
}

module.exports = DatabaseService;