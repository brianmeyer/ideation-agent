/**
 * API Client Service
 * 
 * Centralized HTTP client for making API requests with consistent
 * error handling, request/response formatting, and loading states.
 * 
 * @author Brian Meyer
 * @version 1.0.0
 */

class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request with standardized error handling
   * @param {string} endpoint - API endpoint (relative to baseURL)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return this.handleSuccessResponse(data);

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new APIError('Network error - please check your connection', 'NETWORK_ERROR');
      }
      throw error;
    }
  }

  /**
   * Handle successful API response
   * @param {Object} data - Response data
   * @returns {Object} Processed response data
   */
  handleSuccessResponse(data) {
    if (data.success === false) {
      throw new APIError(data.error || 'Request failed', data.code);
    }
    return data;
  }

  /**
   * Handle error API response
   * @param {Response} response - Fetch response object
   * @returns {Promise<APIError>} API error object
   */
  async handleErrorResponse(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const message = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    const code = errorData.code || `HTTP_${response.status}`;
    
    return new APIError(message, code, response.status);
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Conversation API methods
  async getConversations(limit = 50) {
    return this.get('/conversations', { limit });
  }

  async getConversation(id) {
    return this.get(`/conversations/${id}`);
  }

  async getConversationMessages(id) {
    return this.get(`/conversations/${id}/messages`);
  }

  async createConversation(title = 'New Conversation') {
    return this.post('/chat/conversation', { title });
  }

  async deleteConversation(id) {
    return this.delete(`/conversations/${id}`);
  }

  async updateConversation(id, updates) {
    return this.put(`/conversations/${id}`, updates);
  }

  // Chat API methods
  async sendMessage(conversationId, message) {
    return this.post('/chat/message', { conversationId, message });
  }

  async getChatHistory(conversationId) {
    return this.get('/chat/history', { conversationId });
  }

  async clearChatHistory(conversationId) {
    const qs = new URLSearchParams({ conversationId }).toString();
    return this.request(`/chat/history?${qs}`, { method: 'DELETE' });
  }

  // Ideas API methods
  async getIdeas(limit = 100, category = null) {
    const params = { limit };
    if (category) params.category = category;
    return this.get('/ideas', params);
  }

  async getConversationIdeas(conversationId) {
    return this.get(`/ideas/conversation/${conversationId}`);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }

  // Stats
  async getStats() {
    return this.get('/stats');
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
  }

  /**
   * Check if error is a specific type
   * @param {string} code - Error code to check
   * @returns {boolean} Is error of specified type
   */
  is(code) {
    return this.code === code;
  }

  /**
   * Check if error is network related
   * @returns {boolean} Is network error
   */
  isNetworkError() {
    return this.code === 'NETWORK_ERROR';
  }

  /**
   * Check if error is authentication related
   * @returns {boolean} Is auth error
   */
  isAuthError() {
    return this.code === 'AUTH_ERROR' || this.statusCode === 401;
  }

  /**
   * Check if error is validation related
   * @returns {boolean} Is validation error
   */
  isValidationError() {
    return this.code === 'VALIDATION_ERROR' || this.statusCode === 400;
  }

  /**
   * Check if error is not found
   * @returns {boolean} Is not found error
   */
  isNotFoundError() {
    return this.code === 'NOT_FOUND_ERROR' || this.statusCode === 404;
  }

  /**
   * Check if error is server error
   * @returns {boolean} Is server error
   */
  isServerError() {
    return this.statusCode >= 500;
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly message
   */
  getUserMessage() {
    if (this.isNetworkError()) {
      return 'Connection problem. Please check your internet and try again.';
    }
    
    if (this.isAuthError()) {
      return 'Authentication required. Please refresh the page.';
    }
    
    if (this.isNotFoundError()) {
      return 'The requested item was not found.';
    }
    
    if (this.isServerError()) {
      return 'Server error. Please try again in a few moments.';
    }
    
    return this.message;
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIClient, APIError };
