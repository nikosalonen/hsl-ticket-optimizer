/**
 * Cache Manager utility for localStorage with TTL (Time To Live) support
 * Handles caching of HSL API responses with automatic expiration
 */

interface CacheItem {
  value: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheManager {
  private static readonly CACHE_PREFIX = "hsl_cache_";

  /**
   * Get cached value by key
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get(key: string): unknown {
    try {
      const cacheKey = this.getCacheKey(key);
      const item = localStorage.getItem(cacheKey);

      if (!item) {
        return null;
      }

      const cacheItem: CacheItem = JSON.parse(item);

      if (this.isMalformedItem(cacheItem) || this.isItemExpired(cacheItem)) {
        this.remove(key);
        return null;
      }

      return cacheItem.value;
    } catch (error) {
      console.warn("Error reading from cache:", error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds
   */
  set(key: string, value: unknown, ttl: number): void {
    try {
      const cacheKey = this.getCacheKey(key);
      const cacheItem: CacheItem = {
        value,
        timestamp: Date.now(),
        ttl,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        console.warn(
          "localStorage quota exceeded, clearing cache and retrying",
        );
        this.clear();
        try {
          const cacheKey = this.getCacheKey(key);
          const cacheItem: CacheItem = {
            value,
            timestamp: Date.now(),
            ttl,
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        } catch (retryError) {
          console.error("Failed to cache after clearing storage:", retryError);
        }
      } else {
        console.error("Error setting cache:", error);
      }
    }
  }

  /**
   * Check if cached item is expired
   * @param key Cache key
   * @returns True if expired or not found, false if still valid
   */
  isExpired(key: string): boolean {
    try {
      const cacheKey = this.getCacheKey(key);
      const item = localStorage.getItem(cacheKey);

      if (!item) {
        return true;
      }

      const cacheItem: CacheItem = JSON.parse(item);

      if (this.isMalformedItem(cacheItem)) {
        this.remove(key);
        return true;
      }

      return this.isItemExpired(cacheItem);
    } catch (error) {
      console.warn("Error checking cache expiration:", error);
      return true;
    }
  }

  /**
   * Remove specific cached item
   * @param key Cache key
   */
  remove(key: string): void {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn("Error removing cache item:", error);
    }
  }

  /**
   * Clear all cached items with our prefix
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CacheManager.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { totalItems: number; expiredItems: number; totalSize: number } {
    let totalItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CacheManager.CACHE_PREFIX)) {
          totalItems++;
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
            try {
              const cacheItem: CacheItem = JSON.parse(item);
              if (
                this.isMalformedItem(cacheItem) ||
                this.isItemExpired(cacheItem)
              ) {
                expiredItems++;
              }
            } catch {
              expiredItems++; // Count malformed items as expired
            }
          }
        }
      }
    } catch (error) {
      console.warn("Error getting cache stats:", error);
    }

    return { totalItems, expiredItems, totalSize };
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CacheManager.CACHE_PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const cacheItem: CacheItem = JSON.parse(item);
              if (
                this.isMalformedItem(cacheItem) ||
                this.isItemExpired(cacheItem)
              ) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Remove malformed items
            keysToRemove.push(key);
          }
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Error during cache cleanup:", error);
    }
  }

  private isMalformedItem(cacheItem: CacheItem): boolean {
    return (
      !Number.isFinite(cacheItem.timestamp) ||
      !Number.isFinite(cacheItem.ttl) ||
      cacheItem.timestamp < 0 ||
      cacheItem.ttl < 0
    );
  }

  private isItemExpired(cacheItem: CacheItem): boolean {
    return Date.now() - cacheItem.timestamp > cacheItem.ttl;
  }

  /**
   * Generate cache key with prefix
   * @param key Original key
   * @returns Prefixed cache key
   */
  private getCacheKey(key: string): string {
    return `${CacheManager.CACHE_PREFIX}${key}`;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
