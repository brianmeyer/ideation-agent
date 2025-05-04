const MagenticOneService = require('../magenticOneService');
const axios = require('axios');

jest.mock('axios');

describe('MagenticOneService', () => {
  let service;

  beforeEach(() => {
    service = new MagenticOneService();
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process a message and return a response', async () => {
      const mockResponse = { data: { choices: [{ message: { content: 'Test response' } }] } };
      axios.post.mockResolvedValue(mockResponse);

      const response = await service.processMessage('Test message');

      expect(response).toBe('Test response');
      expect(axios.post).toHaveBeenCalled();
    });

    it('should handle errors during message processing', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      await expect(service.processMessage('Test message')).rejects.toThrow('Failed to get response from AI model');
    });
  });

  describe('selectAgent', () => {
    it('should select agents in round-robin fashion', () => {
      const firstAgent = service.selectAgent('test message');
      const secondAgent = service.selectAgent('test message');
      const thirdAgent = service.selectAgent('test message');
      const fourthAgent = service.selectAgent('test message');

      expect(firstAgent).toBe('reasoning');
      expect(secondAgent).toBe('creative');
      expect(thirdAgent).toBe('logical');
      expect(fourthAgent).toBe('reasoning');
    });
  });

  describe('ideation sessions', () => {
    it('should start and end ideation sessions', () => {
      const sessionId = service.startIdeationSession('reasoning');
      expect(service.getActiveSessions()).toHaveLength(1);

      service.endIdeationSession(sessionId);
      expect(service.getActiveSessions()).toHaveLength(0);
    });

    it('should automatically end sessions after time limit', async () => {
      jest.useFakeTimers();
      
      service.startIdeationSession('reasoning');
      expect(service.getActiveSessions()).toHaveLength(1);

      jest.advanceTimersByTime(121 * 1000); // Advance time beyond the limit
      expect(service.getActiveSessions()).toHaveLength(0);

      jest.useRealTimers();
    });
  });
}); 