/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Cross-Platform Offline-First Storage Adapters
 * Technical Specification 2.C
 * 
 * Provides unified IStorageAdapter implementations for:
 * 1. Web IndexedDB (High capacity, transactional)
 * 2. Web LocalStorage (Universal fallback)
 * 3. Mobile Android / SQLite / AsyncStorage bridge simulation
 * 4. In-Memory Adapter (For headless testing & benchmarks)
 */

import { IStorageAdapter } from '../models/types.ts';

// ---------------------------------------------------------------------------
// 1. IndexedDB Storage Adapter (Web Primary)
// ---------------------------------------------------------------------------
export class IndexedDBStorageAdapter implements IStorageAdapter {
  name = 'IndexedDBStorageAdapter';
  private dbName: string;
  private storeName: string;
  private version: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName = 'EqualPayDB', storeName = 'keyval', version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// ---------------------------------------------------------------------------
// 2. LocalStorage Adapter (Web Fallback)
// ---------------------------------------------------------------------------
export class LocalStorageAdapter implements IStorageAdapter {
  name = 'LocalStorageAdapter';
  private prefix: string;

  constructor(prefix = 'equalpay:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(this.getKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (e) {
      console.error('[LocalStorageAdapter] Storage quota exceeded or error:', e);
      throw e;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(this.getKey(key));
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        keys.push(k.substring(this.prefix.length));
      }
    }
    return keys;
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keys = await this.getAllKeys();
    keys.forEach((k) => window.localStorage.removeItem(this.getKey(k)));
  }
}

// ---------------------------------------------------------------------------
// 3. Android SQLite / Mobile AsyncStorage Simulation Bridge
// ---------------------------------------------------------------------------
export class MobileSQLiteStorageAdapter implements IStorageAdapter {
  name = 'AndroidSQLiteAdapter (Mobile)';
  private virtualTables: Map<string, string> = new Map();

  async getItem<T>(key: string): Promise<T | null> {
    const raw = this.virtualTables.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.virtualTables.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.virtualTables.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.virtualTables.keys());
  }

  async clear(): Promise<void> {
    this.virtualTables.clear();
  }
}

// ---------------------------------------------------------------------------
// 4. In-Memory Adapter (For unit testing and benchmarks)
// ---------------------------------------------------------------------------
export class MemoryStorageAdapter implements IStorageAdapter {
  name = 'MemoryStorageAdapter';
  private storage = new Map<string, unknown>();

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.storage.has(key)) return null;
    return structuredClone(this.storage.get(key)) as T;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, structuredClone(value));
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createDefaultStorageAdapter(): IStorageAdapter {
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      return new IndexedDBStorageAdapter();
    } catch {
      return new LocalStorageAdapter();
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalStorageAdapter();
  }
  return new MemoryStorageAdapter();
}
