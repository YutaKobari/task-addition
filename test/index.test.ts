import { combineMessage } from '@/index';

describe('index.ts', () => {
  describe('combineMessage', () => {
    it('combineMessage works well', () => {
      const expectedMessage = 'Hello, World';
      const actualMessage = combineMessage('Hello, ', 'World');

      expect(actualMessage).toBe(expectedMessage);
    });
  });
});
