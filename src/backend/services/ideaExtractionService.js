/**
 * Idea Extraction Service
 * 
 * Automatically extracts, categorizes, and tags ideas from ideation sessions.
 * Uses AI to identify key concepts and organize them in the idea repository.
 * 
 * @class IdeaExtractionService
 * @author Brian Meyer
 * @version 1.0.0
 */

const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class IdeaExtractionService {
  constructor(databaseService) {
    this.db = databaseService;
  }

  /**
   * Extract ideas from an ideation session response
   */
  async extractIdeasFromSession(conversationId, messageContent, sourceMessageId = null) {
    try {
      // Check if this looks like an ideation session
      if (!this.isIdeationSession(messageContent)) {
        return [];
      }

      // Use AI to extract and categorize ideas
      const extractedIdeas = await this.aiExtractIdeas(messageContent);
      
      const savedIdeas = [];
      
      for (const idea of extractedIdeas) {
        try {
          const ideaId = await this.db.addIdea(
            conversationId,
            idea.title,
            idea.description,
            idea.category,
            idea.tags,
            idea.implementationTimeline,
            sourceMessageId,
            {
              confidence: idea.confidence,
              extractionMethod: 'ai-auto',
              originalSection: idea.originalSection
            }
          );
          
          savedIdeas.push({
            id: ideaId,
            ...idea
          });
          
          logger.info(`Extracted idea: ${idea.title} (${idea.category})`);
        } catch (error) {
          logger.error('Error saving extracted idea:', error);
        }
      }
      
      return savedIdeas;
    } catch (error) {
      logger.error('Error in idea extraction:', error);
      return [];
    }
  }

  /**
   * Check if message content is from an ideation session
   */
  isIdeationSession(content) {
    return content.includes('🤔 Chain of Thought:') || 
           content.includes('💡 Ideas Summary:') ||
           content.includes('🎯 Final Recommendation:');
  }

  /**
   * Use AI to extract and categorize ideas from session content
   */
  async aiExtractIdeas(sessionContent) {
    const extractionPrompt = `Analyze this ideation session and extract distinct, actionable ideas. For each idea, provide:

Session Content:
${sessionContent}

For EACH distinct idea found, return a JSON object with these fields:
- title: Concise name (max 60 characters)
- description: Brief summary (max 200 characters) 
- category: One of [technology, business, product, service, process, research, creative, social]
- tags: Array of 2-4 relevant keywords
- implementationTimeline: One of [immediate, short-term, medium-term, long-term, research]
- confidence: Float 0-1 indicating extraction confidence
- originalSection: Which part of session this came from

Requirements:
1. Only extract IDEAS, not analysis or commentary
2. Each idea must be distinct and actionable
3. Focus on concrete concepts, not abstract thoughts
4. Return valid JSON array format
5. Maximum 5 ideas per session

Example response:
[
  {
    "title": "Solar-Powered Urban Gardens",
    "description": "Vertical gardens integrated with solar panels for urban food production and energy generation",
    "category": "technology", 
    "tags": ["solar", "urban", "agriculture", "sustainability"],
    "implementationTimeline": "medium-term",
    "confidence": 0.9,
    "originalSection": "Ideas Summary"
  }
]

Return only the JSON array, no additional text.`;

    try {
      const response = await axios.post(config.API.endpoint, {
        model: 'llama-3.3-70b-versatile', // Use powerful model for extraction
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert idea extraction system. Return only valid JSON arrays.' 
          },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.API.key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data?.choices?.[0]?.message?.content) {
        const content = response.data.choices[0].message.content.trim();
        
        try {
          // Clean up the response (remove any non-JSON content)
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const ideas = JSON.parse(jsonMatch[0]);
            return Array.isArray(ideas) ? ideas.slice(0, 5) : []; // Limit to 5 ideas
          }
        } catch (parseError) {
          logger.error('Error parsing extracted ideas JSON:', parseError);
        }
      }
    } catch (error) {
      logger.error('Error in AI idea extraction:', error);
    }
    
    // Fallback: basic regex extraction
    return this.fallbackIdeaExtraction(sessionContent);
  }

  /**
   * Fallback extraction using regex patterns
   */
  fallbackIdeaExtraction(content) {
    const ideas = [];
    
    // Look for numbered ideas or bullet points in Ideas Summary section
    if (content.includes('💡 Ideas Summary:')) {
      const ideasSection = content.split('💡 Ideas Summary:')[1]?.split('🎯 Final Recommendation:')[0];
      if (ideasSection) {
        const lines = ideasSection.split('\n');
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && (trimmed.match(/^[\d\-\*]/) || trimmed.includes('IDEA'))) {
            const ideaText = trimmed.replace(/^[\d\-\*\s]*/, '').replace(/^IDEA\s*\d*:?\s*/, '');
            if (ideaText.length > 10) {
              ideas.push({
                title: ideaText.substring(0, 60),
                description: ideaText.substring(0, 200),
                category: 'general',
                tags: this.extractKeywords(ideaText),
                implementationTimeline: 'medium-term',
                confidence: 0.6,
                originalSection: 'Ideas Summary (fallback)'
              });
            }
          }
        });
      }
    }
    
    return ideas.slice(0, 3); // Limit fallback extraction
  }

  /**
   * Extract keywords for tagging
   */
  extractKeywords(text) {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 4);
    
    return words;
  }

  /**
   * Get ideas with similar themes for relationship building
   */
  async findSimilarIdeas(ideaId, limit = 5) {
    const idea = await this.db.getIdea(ideaId);
    if (!idea) return [];

    // Simple similarity based on shared tags and category
    const allIdeas = await this.db.getAllIdeas(100);
    const similarities = allIdeas
      .filter(otherIdea => otherIdea.id !== ideaId)
      .map(otherIdea => {
        let score = 0;
        
        // Category match
        if (otherIdea.category === idea.category) score += 0.3;
        
        // Tag overlaps
        const sharedTags = idea.tags.filter(tag => otherIdea.tags.includes(tag));
        score += sharedTags.length * 0.2;
        
        // Description similarity (basic keyword matching)
        const ideaWords = new Set(idea.description.toLowerCase().split(/\s+/));
        const otherWords = otherIdea.description.toLowerCase().split(/\s+/);
        const commonWords = otherWords.filter(word => ideaWords.has(word));
        score += Math.min(commonWords.length * 0.1, 0.4);
        
        return { idea: otherIdea, similarity: score };
      })
      .filter(item => item.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }
}

module.exports = IdeaExtractionService;