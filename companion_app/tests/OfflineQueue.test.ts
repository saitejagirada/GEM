import { describe, it, expect } from './test-utils.ts';
import { OfflineQueue } from '../services/OfflineQueue.ts';

describe('OfflineQueue', () => {
  it('enqueues mutations with idempotent ID and PENDING status', () => {
    const queue = new OfflineQueue();
    const item = queue.enqueue('CRAC_SUBMISSION', { poNumber: 'PO-99', acceptedQty: 10 });

    expect(item.id).toMatch(/^item_/);
    expect(item.type).toBe('CRAC_SUBMISSION');
    expect(item.status).toBe('PENDING');
    expect(queue.getPendingItems().length).toBe(1);
  });

  it('processes queue successfully and marks items SYNCED', async () => {
    const queue = new OfflineQueue();
    queue.enqueue('BARCODE_SCAN', { barcode: 'BC-111' });
    queue.enqueue('BARCODE_SCAN', { barcode: 'BC-222' });

    const result = await queue.processQueue(async () => true);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(queue.getPendingItems().length).toBe(0);
    expect(queue.getStats().synced).toBe(2);
  });

  it('handles sync failures, increments retry count, and respects maxRetries', async () => {
    const queue = new OfflineQueue();
    const item = queue.enqueue('EVIDENCE_PHOTO_UPLOAD', { photoId: 'photo-1' }, 2);

    // Fail attempt 1
    await queue.processQueue(async () => {
      throw new Error('Connection timeout');
    });

    expect(item.retryCount).toBe(1);
    expect(item.status).toBe('PENDING'); // Still eligible for retry
    expect(queue.getPendingItems().length).toBe(1);

    // Fail attempt 2 -> Reaches maxRetries (2) -> FAILED
    await queue.processQueue(async () => {
      throw new Error('Connection timeout');
    });
    expect(item.retryCount).toBe(2);
    expect(item.status).toBe('FAILED');
    expect(queue.getPendingItems().length).toBe(0);
    expect(queue.getStats().failed).toBe(1);
  });

  it('purges synced items with clearSynced()', async () => {
    const queue = new OfflineQueue();
    queue.enqueue('ORDER_ACKNOWLEDGEMENT', { orderId: 'ord-1' });
    await queue.processQueue(async () => true);

    expect(queue.getAllItems().length).toBe(1);
    const purged = queue.clearSynced();
    expect(purged).toBe(1);
    expect(queue.getAllItems().length).toBe(0);
  });
});
