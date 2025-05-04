const chatController = require('../chatController');
const magenticOneService = require('../../services/magenticOneService');
const historyManager = require('../../utils/historyManager');

jest.mock('../../services/magenticOneService');
jest.mock('../../utils/historyManager');

describe('ChatController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {}
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getChatHistory', () => {
    it('should return chat history', async () => {
      const mockHistory = [{ role: 'user', content: 'test' }];
      historyManager.getHistory.mockResolvedValue(mockHistory);

      await chatController.getChatHistory(mockReq, mockRes);

      expect(historyManager.getHistory).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ history: mockHistory });
    });

    it('should handle errors', async () => {
      historyManager.getHistory.mockRejectedValue(new Error('Test error'));

      await chatController.getChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to retrieve chat history' });
    });
  });

  describe('sendMessage', () => {
    it('should process a valid message', async () => {
      mockReq.body = { message: 'test message' };
      const mockResponse = 'test response';
      magenticOneService.processMessage.mockResolvedValue(mockResponse);

      await chatController.sendMessage(mockReq, mockRes);

      expect(historyManager.addMessage).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({ response: mockResponse });
    });

    it('should handle missing message', async () => {
      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Message is required' });
    });

    it('should handle processing errors', async () => {
      mockReq.body = { message: 'test message' };
      magenticOneService.processMessage.mockRejectedValue(new Error('Test error'));

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to process message' });
    });
  });

  describe('clearChatHistory', () => {
    it('should clear chat history', async () => {
      await chatController.clearChatHistory(mockReq, mockRes);

      expect(historyManager.clearHistory).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Chat history cleared' });
    });

    it('should handle errors', async () => {
      historyManager.clearHistory.mockRejectedValue(new Error('Test error'));

      await chatController.clearChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to clear chat history' });
    });
  });
}); 