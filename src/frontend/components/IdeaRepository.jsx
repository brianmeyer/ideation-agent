import React, { useState, useMemo } from 'react';
import './IdeaRepository.css';

const IdeaRepository = ({ ideas, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');

  // Extract unique categories and tags
  const categories = useMemo(() => {
    const cats = [...new Set(ideas.map(idea => idea.category).filter(Boolean))];
    return cats.sort();
  }, [ideas]);

  const allTags = useMemo(() => {
    const tags = ideas.flatMap(idea => {
      try {
        return idea.tags ? JSON.parse(idea.tags) : [];
      } catch {
        return [];
      }
    });
    return [...new Set(tags)].sort();
  }, [ideas]);

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let filtered = ideas.filter(idea => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          idea.title.toLowerCase().includes(searchLower) ||
          idea.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && idea.category !== selectedCategory) {
        return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        try {
          const ideaTags = idea.tags ? JSON.parse(idea.tags) : [];
          const hasSelectedTag = selectedTags.some(tag => ideaTags.includes(tag));
          if (!hasSelectedTag) return false;
        } catch {
          return false;
        }
      }

      return true;
    });

    // Sort ideas
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  }, [ideas, searchTerm, selectedCategory, selectedTags, sortBy]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const parseIdeaTags = (tagsString) => {
    try {
      return tagsString ? JSON.parse(tagsString) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="idea-repository">
      <div className="repository-header">
        <h2>💡 Idea Repository</h2>
        <div className="repository-stats">
          <span className="stat">
            <strong>{filteredIdeas.length}</strong> of <strong>{ideas.length}</strong> ideas
          </span>
          <button onClick={onRefresh} className="refresh-button" title="Refresh ideas">
            🔄
          </button>
        </div>
      </div>

      <div className="repository-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_at">Latest First</option>
              <option value="title">Title A-Z</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="tags-filter">
            <label>Filter by tags:</label>
            <div className="tags-list">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ideas-grid">
        {filteredIdeas.length === 0 ? (
          <div className="empty-state">
            {ideas.length === 0 ? (
              <div>
                <p>No ideas yet!</p>
                <p className="hint">Start an ideation session to generate some ideas.</p>
              </div>
            ) : (
              <div>
                <p>No ideas match your filters.</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedTags([]);
                  }}
                  className="clear-filters-button"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredIdeas.map(idea => (
            <div key={idea.id} className="idea-card">
              <div className="idea-header">
                <h3 className="idea-title">{idea.title}</h3>
                {idea.category && (
                  <span className="idea-category">{idea.category}</span>
                )}
              </div>
              
              <p className="idea-description">{idea.description}</p>
              
              {parseIdeaTags(idea.tags).length > 0 && (
                <div className="idea-tags">
                  {parseIdeaTags(idea.tags).map(tag => (
                    <span key={tag} className="idea-tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="idea-footer">
                <span className="idea-date">{formatDate(idea.created_at)}</span>
                {idea.source_message_id && (
                  <span className="idea-source">From conversation</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IdeaRepository;