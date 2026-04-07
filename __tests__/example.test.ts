import { describe, expect, it } from 'vitest';

describe('example', () => {
  it('adds numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('strings work as expected', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
  });
});
