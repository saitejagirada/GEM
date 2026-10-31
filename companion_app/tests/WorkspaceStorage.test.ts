import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceStorage } from '../services/WorkspaceStorage.ts';
import type {
  OfficialHandoffRecord,
  ParticipatedBid,
  WorkspaceDocument,
} from '../types/index.ts';

const persistedDocument: WorkspaceDocument = {
  id: 'workspace-doc-1',
  name: 'PAN certificate.pdf',
  uri: 'file:///private/gem-workspace/workspace-doc-1-PAN_certificate.pdf',
  addedAtUtc: '2026-10-30T00:00:00.000Z',
  kind: 'COMPLIANCE',
  linkedBidNumber: 'GEM/2026/B/890123',
  source: 'DEVICE_PICKER',
  persistence: 'PERSISTED',
};

test('WorkspaceStorage sanitizes device file names before copying them', () => {
  assert.equal(
    WorkspaceStorage.sanitizeFileName('../PAN certificate (signed).pdf'),
    'PAN_certificate_signed_.pdf'
  );
  assert.equal(WorkspaceStorage.sanitizeFileName(''), 'document');
});

test('WorkspaceStorage distinguishes persisted files from session-only files', () => {
  assert.equal(WorkspaceStorage.isPersisted(persistedDocument), true);
  assert.equal(
    WorkspaceStorage.isPersisted({ ...persistedDocument, persistence: 'SESSION_ONLY' }),
    false
  );
});

test('WorkspaceStorage keeps the latest local tracking record per bid number', () => {
  const first: ParticipatedBid = {
    bidNumber: 'GEM/2026/B/890123',
    itemTitle: 'Solar lighting',
    department: 'Rural Development',
    quotedPriceInr: 100000,
    expectedL1BenchmarkInr: 95000,
    submittedAtUtc: '2026-10-30T00:00:00.000Z',
    stage: 'TECHNICAL_EVALUATION',
    corrigendumCount: 0,
  };
  const updated = { ...first, stage: 'FINANCIAL_EVALUATION' as const };

  const merged = WorkspaceStorage.mergePortfolioRecords([first, updated]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].stage, 'FINANCIAL_EVALUATION');
});

test('WorkspaceStorage keeps the latest official handoff note per bid number', () => {
  const opened: OfficialHandoffRecord = {
    id: 'handoff-1',
    bidNumber: 'GEM/2026/B/890123',
    documentIds: ['workspace-doc-1'],
    status: 'OPENED_OFFICIAL_PORTAL',
    createdAtUtc: '2026-10-30T00:00:00.000Z',
    openedAtUtc: '2026-10-30T00:05:00.000Z',
  };
  const reported: OfficialHandoffRecord = {
    ...opened,
    status: 'USER_REPORTED_SUBMITTED',
    userReportedSubmittedAtUtc: '2026-10-30T00:20:00.000Z',
  };

  const merged = WorkspaceStorage.mergeHandoffs([opened, reported]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'USER_REPORTED_SUBMITTED');
});
