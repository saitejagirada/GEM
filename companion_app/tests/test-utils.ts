import { test, describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

export { test, describe, it, beforeEach, afterEach, assert };

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: any) {
      assert.deepStrictEqual(actual, expected);
    },
    toContain(expected: any) {
      if (typeof actual === 'string') {
        assert.ok(actual.includes(expected), `Expected "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual)) {
        assert.ok(actual.includes(expected), `Expected array to contain item`);
      } else {
        assert.fail('toContain only supports string or array');
      }
    },
    toMatch(regex: RegExp) {
      assert.match(String(actual), regex);
    },
    toBeGreaterThan(expected: number) {
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected: number) {
      assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toBeDefined() {
      assert.ok(actual !== undefined, 'Expected value to be defined');
    },
    not: {
      toBe(expected: any) {
        assert.notStrictEqual(actual, expected);
      },
    },
  };
}
