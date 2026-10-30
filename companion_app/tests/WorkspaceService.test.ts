import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceService } from '../services/WorkspaceService.ts';
import type { DeconstructedBidDoc, ParticipatedBid, WorkspaceDocument } from '../types/index.ts';

const participated: ParticipatedBid = {
  bidNumber: 'GEM/2026/B/890123',
  itemTitle: 'Solar lighting',
  department: 'Rural Development',
  quotedPriceInr: 100000,
  expectedL1BenchmarkInr: 95000,
  submittedAtUtc: '2026-10-28T10:00:00.000Z',
  stage: 'TECHNICAL_EVALUATION',
  corrigendumCount: 0,
};

const bid: DeconstructedBidDoc = {
  bidNumber: participated.bidNumber,
  title: participated.itemTitle,
  department: participated.department,
  ministry: 'Ministry of Rural Development',
  type: 'PRODUCT',
  emdAmountInr: 0,
  isEmdExemptForMse: true,
  epbgPercentage: 3,
  minAnnualTurnoverInr: 100000,
  yearsExperienceRequired: 1,
  pastPerformancePercentage: 20,
  deliveryPeriodDays: 30,
  boqItems: [],
  consignees: [],
  requiredDocuments: ['PAN', 'Technical datasheet'],
  closingTimeUtc: '2026-11-01T10:00:00.000Z',
  docUrl: 'https://bidplus.gem.gov.in/showbidDocument/890123',
};

test('WorkspaceService classifies common tender document names', () => {
  assert.equal(WorkspaceService.inferDocumentKind('PAN_Certificate.pdf'), 'COMPLIANCE');
  assert.equal(WorkspaceService.inferDocumentKind('Technical_Datasheet.docx'), 'TECHNICAL');
  assert.equal(WorkspaceService.inferDocumentKind('Financial_Quotation.xlsx'), 'FINANCIAL');
  assert.equal(WorkspaceService.inferDocumentKind('site-photo.jpg'), 'OTHER');
});

test('WorkspaceService reports local checklist progress without claiming official submission', () => {
  const documents: WorkspaceDocument[] = [
    {
      id: 'doc-1',
      name: 'PAN_Certificate.pdf',
      uri: 'file:///pan.pdf',
      addedAtUtc: '2026-10-30T10:00:00.000Z',
      kind: 'COMPLIANCE',
      linkedBidNumber: participated.bidNumber,
      source: 'DEVICE_PICKER',
    },
  ];

  const checklist = WorkspaceService.getChecklist(participated, bid, documents);

  assert.equal(checklist.requiredCount, 2);
  assert.equal(checklist.attachedCount, 1);
  assert.equal(checklist.isComplete, false);
  assert.deepEqual(checklist.missingDocuments, ['Technical datasheet']);
  assert.equal(checklist.hasRequirements, true);
});

test('WorkspaceService keeps file size formatting readable', () => {
  assert.equal(WorkspaceService.formatFileSize(0), 'Size unavailable');
  assert.equal(WorkspaceService.formatFileSize(1024), '1 KB');
  assert.equal(WorkspaceService.formatFileSize(1024 * 1024), '1.0 MB');
});
