/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Offline-First Local Storage & Sync Queue Engine
 * Technical Specification 2.C
 */

import { IStorageAdapter, SyncOperationType, SyncQueueItem, SyncStatus } from '../models/types.ts';
import { createDefaultStorageAdapter } from './storageAdapter.ts';

export type SyncHandler = (item: SyncQueueItem) => Promise<boolean>;
export type QueueChangeListener = (queue: SyncQueueItem[]) => void;
export type NetworkChangeListener = (isOnline: boolean) => void;

const QUEUE_STORAGE_KEY = 'equalpay_sync_queue_v1';
const MAX_RETRIES = 3;

export class OfflineSyncQueueManager {
  private storage: IStorageAdapter;
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private isOnlineState = true;
  private queueListeners: Set<QueueChangeListener> = new Set();
  private networkListeners: Set<NetworkChangeListener> = new Set();
  private mockNetworkOverride: boolean | null = null; // for testing simulated offline

  constructor(storageAdapter?: IStorageAdapter) {
    this.storage = storageAdapter || createDefaultStorageAdapter();
    this.initNetworkMonitoring();
  }

  /**
   * Initializes network listeners and loads pending queue from persistent storage.
   */
  async init(): Promise<void> {
    await this.loadQueue();
  }

  private initNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      this.isOnlineState = navigator.onLine ?? true;
      window.addEventListener('online', () => this.handleNetworkEvent(true));
      window.addEventListener('offline', () => this.handleNetworkEvent(false));
    }
  }

  private handleNetworkEvent(online: boolean): void {
    if (this.mockNetworkOverride !== null) return;
    this.isOnlineState = online;
    this.notifyNetworkListeners();
    if (online) {
      this.processQueue();
    }
  }

  public setSimulatedNetworkStatus(online: boolean | null): void {
    this.mockNetworkOverride = online;
    this.notifyNetworkListeners();
    if (this.isOnline()) {
      this.processQueue();
    }
  }

  public isOnline(): boolean {
    if (this.mockNetworkOverride !== null) return this.mockNetworkOverride;
    return this.isOnlineState;
  }

  private async loadQueue(): Promise<void> {
    try {
      const saved = await this.storage.getItem<SyncQueueItem[]>(QUEUE_STORAGE_KEY);
      if (saved && Array.isArray(saved)) {
        this.queue = saved;
      } else {
        this.queue = [];
      }
      this.notifyQueueListeners();
    } catch (e) {
      console.error('[OfflineSyncQueue] Failed to load queue from storage:', e);
      this.queue = [];
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await this.storage.setItem(QUEUE_STORAGE_KEY, this.queue);
    } catch (e) {
      console.error('[OfflineSyncQueue] Failed to persist queue:', e);
    }
  }

  /**
   * Enqueues a new sync operation when creating, editing, or deleting an entity.
   */
  async enqueue<T>(
    operation: SyncOperationType,
    entityType: 'expense' | 'group' | 'settlement',
    entityId: string,
    payload: T,
    deviceOrigin: 'web' | 'android' | 'ios' = 'web'
  ): Promise<SyncQueueItem<T>> {
    const item: SyncQueueItem<T> = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityType,
      operation,
      entityId,
      payload,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      deviceOrigin,
      schemaVersion: 1,
    };

    this.queue.push(item as SyncQueueItem<unknown>);
    await this.persistQueue();
    this.notifyQueueListeners();

    // If online, immediately trigger queue processing
    if (this.isOnline()) {
      setTimeout(() => this.processQueue(), 10);
    }

    return item;
  }

  /**
   * Processes all pending items sequentially with retry backoff.
   */
  async processQueue(customHandler?: SyncHandler): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    if (!this.isOnline()) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingItems = this.queue.filter(
        (item) => item.status === 'PENDING' || (item.status === 'FAILED' && item.retryCount < MAX_RETRIES)
      );

      for (const item of pendingItems) {
        if (!this.isOnline()) break;

        item.status = 'SYNCING';
        this.notifyQueueListeners();

        try {
          let success = false;
          if (customHandler) {
            success = await customHandler(item);
          } else {
            // Send to live server /api/v1/sync/batch
            try {
              const res = await fetch('/api/v1/sync/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: [item],
                  deviceOrigin: item.deviceOrigin || 'web',
                }),
              });
              success = res.ok;
            } catch (netErr) {
              // Server unreachable or network glitch
              console.warn('[OfflineSyncQueue] API sync attempt encountered network error:', netErr);
              success = false;
            }
          }

          if (success) {
            item.status = 'SYNCED';
            succeeded++;
          } else {
            throw new Error('Sync handler returned false');
          }
        } catch (err: unknown) {
          failed++;
          item.retryCount += 1;
          item.lastError = err instanceof Error ? err.message : String(err);
          item.status = item.retryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';
        }

        processed++;
        await this.persistQueue();
        this.notifyQueueListeners();
      }

      // Cleanup synced items after short retention
      const retainSyncedTime = 1000 * 60; // 1 minute
      const now = Date.now();
      this.queue = this.queue.filter(
        (i) => i.status !== 'SYNCED' || now - i.timestamp < retainSyncedTime
      );
      await this.persistQueue();
      this.notifyQueueListeners();
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Force retries all failed items.
   */
  async retryFailed(customHandler?: SyncHandler): Promise<void> {
    for (const item of this.queue) {
      if (item.status === 'FAILED') {
        item.status = 'PENDING';
        item.retryCount = 0;
        item.lastError = undefined;
      }
    }
    await this.persistQueue();
    this.notifyQueueListeners();
    await this.processQueue(customHandler);
  }

  /**
   * Clears the sync queue.
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyQueueListeners();
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING').length;
  }

  public subscribeQueue(listener: QueueChangeListener): () => void {
    this.queueListeners.add(listener);
    listener([...this.queue]);
    return () => this.queueListeners.delete(listener);
  }

  public subscribeNetwork(listener: NetworkChangeListener): () => void {
    this.networkListeners.add(listener);
    listener(this.isOnline());
    return () => this.networkListeners.delete(listener);
  }

  private notifyQueueListeners(): void {
    const snapshot = [...this.queue];
    this.queueListeners.forEach((l) => l(snapshot));
  }

  private notifyNetworkListeners(): void {
    const online = this.isOnline();
    this.networkListeners.forEach((l) => l(online));
  }

  public getStorageName(): string {
    return this.storage.name;
  }
}

// Global singleton instance for app-wide sync
export const syncQueueInstance = new OfflineSyncQueueManager();
