// Mock environment variables
process.env.GROQ_API_KEY = 'test-api-key';
process.env.IDEATION_TIME_LIMIT = '120';

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock socket.io
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    }))
  };
});

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn()
})); 