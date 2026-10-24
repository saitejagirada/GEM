/**
 * GeM Mobile Companion App - Offline Mutation Queue Service
 * Ensures reliable synchronization for CRAC inspections and order updates
 * when operating in remote locations with intermittent connectivity.
 */

export interface QueueItem<T = any> {
  id: string; // Idempotent UUID
  type: 'CRAC_SUBMISSION' | 'BARCODE_SCAN' | 'EVIDENCE_PHOTO_UPLOAD' | 'ORDER_ACKNOWLEDGEMENT';
  payload: T;
  createdAtUtc: string;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  lastError?: string;
}

export type SyncHandler = (item: QueueItem) => Promise<boolean>;

export class OfflineQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;

  constructor(initialItems: QueueItem[] = []) {
    this.queue = [...initialItems];
  }

  /**
   * Enqueues a new mutation with an idempotent identifier.
   */
  public enqueue<T>(type: QueueItem['type'], payload: T, maxRetries: number = 3): QueueItem<T> {
    const item: QueueItem<T> = {
      id: this.generateUUID(),
      type,
      payload,
      createdAtUtc: new Date().toISOString(),
      retryCount: 0,
      maxRetries,
      status: 'PENDING',
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Returns all items currently awaiting dispatch or eligible for retry.
   */
  public getPendingItems(): QueueItem[] {
    return this.queue.filter(
      (item) => item.status === 'PENDING' || (item.status === 'FAILED' && item.retryCount < item.maxRetries)
    );
  }

  /**
   * Returns all items in the queue.
   */
  public getAllItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Sequential dispatch loop with exponential backoff awareness.
   */
  public async processQueue(syncHandler: SyncHandler): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let succeeded = 0;
    let failed = 0;

    const pending = this.getPendingItems();

    for (const item of pending) {
      item.status = 'SYNCING';
      try {
        const success = await syncHandler(item);
        if (success) {
          item.status = 'SYNCED';
          succeeded++;
        } else {
          item.retryCount++;
          item.status = item.retryCount >= item.maxRetries ? 'FAILED' : 'PENDING';
          item.lastError = 'Handler returned false';
          failed++;
        }
      } catch (err: any) {
        item.retryCount++;
        item.status = item.retryCount >= item.maxRetries ? 'FAILED' : 'PENDING';
        item.lastError = err?.message || 'Network sync error';
        failed++;
      }
    }

    this.isProcessing = false;
    return { processed: pending.length, succeeded, failed };
  }

  /**
   * Purges completed items to keep storage compact.
   */
  public clearSynced(): number {
    const originalCount = this.queue.length;
    this.queue = this.queue.filter((item) => item.status !== 'SYNCED');
    return originalCount - this.queue.length;
  }

  /**
   * Returns health and count statistics for the queue.
   */
  public getStats(): { total: number; pending: number; syncing: number; synced: number; failed: number } {
    return {
      total: this.queue.length,
      pending: this.queue.filter((i) => i.status === 'PENDING').length,
      syncing: this.queue.filter((i) => i.status === 'SYNCING').length,
      synced: this.queue.filter((i) => i.status === 'SYNCED').length,
      failed: this.queue.filter((i) => i.status === 'FAILED').length,
    };
  }

  private generateUUID(): string {
    return 'item_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
}
