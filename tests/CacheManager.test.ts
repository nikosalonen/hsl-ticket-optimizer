import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, cacheManager } from '../src/utils/CacheManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

// Mock localStorage globally
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('set and get operations', () => {
    it('should store and retrieve a simple value', () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 60000; // 1 minute

      cache.set(key, value, ttl);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'hsl_cache_test-key',
        expect.stringContaining('"value":"test-value"')
      );
    });

    it('should store and retrieve complex objects', () => {
      const key = 'complex-key';
      const value = {
        prices: { single: 2.95, monthly: 64.70 },
        zones: 'AB',
        timestamp: Date.now()
      };
      const ttl = 60000;

      cache.set(key, value, ttl);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = cache.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should handle arrays correctly', () => {
      const key = 'array-key';
      const value = [1, 2, 3, 'test', { nested: true }];
      const ttl = 60000;

      cache.set(key, value, ttl);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });
  });

  describe('TTL and expiration', () => {
    it('should return null for expired items', () => {
      const key = 'expired-key';
      const value = 'expired-value';
      const ttl = 100; // 100ms

      cache.set(key, value, ttl);

      // Fast-forward time
      vi.useFakeTimers();
      vi.advanceTimersByTime(150);

      const retrieved = cache.get(key);
      expect(retrieved).toBeNull();

      vi.useRealTimers();
    });

    it('should return value for non-expired items', () => {
      const key = 'valid-key';
      const value = 'valid-value';
      const ttl = 60000; // 1 minute

      cache.set(key, value, ttl);

      // Fast-forward time but not past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(30000); // 30 seconds

      const retrieved = cache.get(key);
      expect(retrieved).toBe(value);

      vi.useRealTimers();
    });

    it('should correctly identify expired items', () => {
      const key = 'expiry-test';
      const value = 'test-value';
      const ttl = 100;

      cache.set(key, value, ttl);
      expect(cache.isExpired(key)).toBe(false);

      vi.useFakeTimers();
      vi.advanceTimersByTime(150);
      expect(cache.isExpired(key)).toBe(true);

      vi.useRealTimers();
    });

    it('should return true for isExpired on non-existent keys', () => {
      expect(cache.isExpired('non-existent')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle localStorage quota exceeded error', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock setItem to throw QuotaExceededError on first call, succeed on second
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      localStorageMock.setItem
        .mockImplementationOnce(() => {
          throw quotaError;
        })
        .mockImplementationOnce(() => {
          // Second call should succeed after cache clear
        });

      cache.set('test-key', 'test-value', 60000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'localStorage quota exceeded, clearing cache and retrying'
      );

      consoleSpy.mockRestore();
    });

    it('should handle JSON parse errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Manually set invalid JSON in localStorage
      localStorageMock.setItem('hsl_cache_invalid', 'invalid-json');
      
      const result = cache.get('invalid');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error reading from cache:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle localStorage access errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock getItem to throw an error
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied');
      });

      const result = cache.get('test-key');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error reading from cache:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('cache management operations', () => {
    beforeEach(() => {
      // Set up some test data
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 100); // Short TTL for expiration tests
    });

    it('should remove specific items', () => {
      expect(cache.get('key1')).toBe('value1');
      
      cache.remove('key1');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2'); // Other items should remain
    });

    it('should clear all cache items', () => {
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should only clear items with cache prefix', () => {
      // Add non-cache item to localStorage
      localStorageMock.setItem('other-key', 'other-value');
      
      cache.clear();
      
      expect(localStorageMock.getItem('other-key')).toBe('other-value');
      expect(cache.get('key1')).toBeNull();
    });

    it('should get accurate cache statistics', () => {
      const stats = cache.getStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.expiredItems).toBe(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should identify expired items in statistics', () => {
      vi.useFakeTimers();
      vi.advanceTimersByTime(150); // Expire key3
      
      const stats = cache.getStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.expiredItems).toBe(1);
      
      vi.useRealTimers();
    });

    it('should cleanup expired items', () => {
      vi.useFakeTimers();
      vi.advanceTimersByTime(150); // Expire key3
      
      cache.cleanup();
      
      expect(cache.get('key1')).toBe('value1'); // Still valid
      expect(cache.get('key2')).toBe('value2'); // Still valid
      expect(cache.get('key3')).toBeNull(); // Should be removed
      
      vi.useRealTimers();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(cacheManager).toBeInstanceOf(CacheManager);
      
      // Test that it works
      cacheManager.set('singleton-test', 'works', 60000);
      expect(cacheManager.get('singleton-test')).toBe('works');
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      cache.set('null-key', null, 60000);
      cache.set('undefined-key', undefined, 60000);
      
      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    it('should handle empty strings and zero values', () => {
      cache.set('empty-string', '', 60000);
      cache.set('zero', 0, 60000);
      cache.set('false', false, 60000);
      
      expect(cache.get('empty-string')).toBe('');
      expect(cache.get('zero')).toBe(0);
      expect(cache.get('false')).toBe(false);
    });

    it('should handle very large TTL values', () => {
      const key = 'large-ttl';
      const value = 'test';
      const largeTTL = Number.MAX_SAFE_INTEGER;
      
      cache.set(key, value, largeTTL);
      expect(cache.get(key)).toBe(value);
      expect(cache.isExpired(key)).toBe(false);
    });

    it('should handle zero TTL (immediately expired)', () => {
      const key = 'zero-ttl';
      const value = 'test';
      
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);
      
      cache.set(key, value, 0);
      
      // Advance time by 1ms to ensure expiration
      vi.advanceTimersByTime(1);
      
      expect(cache.isExpired(key)).toBe(true);
      expect(cache.get(key)).toBeNull();
      
      vi.useRealTimers();
    });
  });
});
