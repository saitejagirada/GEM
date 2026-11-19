import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DisqualificationShieldEngine } from '../services/DisqualificationShieldEngine.ts';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor.ts';
import type { UserAgentProfile, WorkspaceDocument } from '../types/index.ts';

describe('DisqualificationShieldEngine - Pre-Bid Disqualification Protection', () => {
  const baseProfile: UserAgentProfile = {
    id: 'vendor-123',
    organizationName: 'Shri Balaji Electricals',
    msmeCategory: 'MICRO',
    annualTurnoverInr: 5000000, // ₹50 Lakhs
    yearsExperience: 4,
    productCategories: ['LED Luminaire', 'Solar'],
    targetStates: ['Uttar Pradesh', 'Delhi'],
    isOem: false, // Authorized Dealer / Reseller
    hasUdyamCertificate: true,
  };

  const sampleTender: ExtractedGeMTenderDetails = {
    bidNumber: 'GEM/2026/B/7192841',
    title: 'LED Street Lighting Fixture 90W',
    department: 'Department of Power',
    ministry: 'Ministry of Power',
    estimatedValueInr: 15000000,
    emdAmountInr: 75000,
    isEmdExemptForMse: true,
    isEmdExemptForStartup: true,
    minAnnualTurnoverInr: 4500000, // ₹45 Lakhs
    yearsExperienceRequired: 3,
    pastPerformancePercentage: 40,
    msePurchasePreference: true,
    mseExemptionForExpAndTurnover: true,
    startupExemptionForExpAndTurnover: true,
    miiPurchasePreference: true,
    miiLocalContentPercentage: 50,
    miiClass: 'CLASS_1',
    isSplittingApplied: false,
    deliveryPeriodDays: 30,
    consignees: [
      {
        sNo: 1,
        address: 'NTPC Noida',
        pincode: '201301',
        state: 'Uttar Pradesh',
        quantity: 1000,
        deliveryDays: 30,
      },
    ],
    consigneeStateDistribution: {
      'Uttar Pradesh': { count: 1, quantity: 1000, percentage: 100 },
    },
    requiredDocuments: [
      'Experience Criteria',
      'Bidder Turnover',
      'OEM Authorization Certificate',
    ],
    requiresOemAuthorization: true,
    requiresCaTurnoverCertificate: true,
    requiresMiiDeclaration: true,
    requiresGstCertificate: true,
    requiresPastPerformanceDoc: true,
    atcClauses: [
      'Bidder must submit CA certificate with UDIN.',
      'Manufacturer Authorization Form (MAF) is mandatory for authorized dealers.',
    ],
    isRaEnabled: true,
  };

  it('triggers CRITICAL disqualification when a non-OEM reseller claims MSE EMD exemption on goods', () => {
    // Vendor is an MSE, but NOT an OEM (isOem: false)
    const report = DisqualificationShieldEngine.evaluateShield(sampleTender, baseProfile, []);

    assert.equal(report.overallStatus, 'CRITICAL_DISQUALIFICATION_RISK');
    const emdCheck = report.checks.find((c) => c.category === 'EMD');
    assert.ok(emdCheck);
    assert.equal(emdCheck.severity, 'CRITICAL');
    assert.ok(emdCheck.reason.includes('MANUFACTURERS of goods'));
  });

  it('flags CRITICAL risk when OEM Authorization (MAF) is required but missing from workspace', () => {
    const report = DisqualificationShieldEngine.evaluateShield(sampleTender, baseProfile, []);
    const oemCheck = report.checks.find((c) => c.category === 'OEM_MAF');
    assert.ok(oemCheck);
    assert.equal(oemCheck.severity, 'CRITICAL');
    assert.ok(oemCheck.remediation?.includes('OEM'));
    assert.equal(oemCheck.templateAction, 'OEM_MAF_REQUEST');
  });

  it('flags CRITICAL risk when MII local content declaration is missing', () => {
    const report = DisqualificationShieldEngine.evaluateShield(sampleTender, baseProfile, []);
    const miiCheck = report.checks.find((c) => c.category === 'MII');
    assert.ok(miiCheck);
    assert.equal(miiCheck.severity, 'CRITICAL');
    assert.equal(miiCheck.templateAction, 'MII_DECLARATION');
  });

  it('reaches BATTLE_READY when all required documents and certificates are attached', () => {
    const oemProfile: UserAgentProfile = {
      ...baseProfile,
      isOem: true, // Manufacturer
    };

    const attachedDocs: WorkspaceDocument[] = [
      {
        id: 'doc-1',
        linkedBidNumber: sampleTender.bidNumber!,
        name: 'CA_Turnover_Certificate_UDIN.pdf',
        uri: 'file:///data/doc1.pdf',
        sizeBytes: 102400,
        addedAtUtc: new Date().toISOString(),
        kind: 'COMPLIANCE',
        source: 'DEVICE_PICKER',
        persistence: 'PERSISTED',
      },
      {
        id: 'doc-2',
        linkedBidNumber: sampleTender.bidNumber!,
        name: 'MII_Local_Content_Declaration.pdf',
        uri: 'file:///data/doc2.pdf',
        sizeBytes: 98000,
        addedAtUtc: new Date().toISOString(),
        kind: 'COMPLIANCE',
        source: 'DEVICE_PICKER',
        persistence: 'PERSISTED',
      },
      {
        id: 'doc-3',
        linkedBidNumber: sampleTender.bidNumber!,
        name: 'Past_Orders_CRAC_Experience.pdf',
        uri: 'file:///data/doc3.pdf',
        sizeBytes: 250000,
        addedAtUtc: new Date().toISOString(),
        kind: 'TECHNICAL',
        source: 'DEVICE_PICKER',
        persistence: 'PERSISTED',
      },
      {
        id: 'doc-4',
        linkedBidNumber: sampleTender.bidNumber!,
        name: 'GST_Udyam_Registration.pdf',
        uri: 'file:///data/doc4.pdf',
        sizeBytes: 150000,
        addedAtUtc: new Date().toISOString(),
        kind: 'COMPLIANCE',
        source: 'DEVICE_PICKER',
        persistence: 'PERSISTED',
      },
    ];

    const report = DisqualificationShieldEngine.evaluateShield(sampleTender, oemProfile, attachedDocs);
    assert.equal(report.overallStatus, 'BATTLE_READY');
    assert.equal(report.criticalDisqualificationCount, 0);
    assert.ok(report.shieldScore >= 90);
  });

  it('generates fully pre-filled MII self-declaration and CA UDIN templates', () => {
    const report = DisqualificationShieldEngine.evaluateShield(sampleTender, baseProfile, []);
    assert.ok(report.generatedTemplates.miiSelfDeclaration);
    assert.ok(report.generatedTemplates.miiSelfDeclaration.includes('50%'));
    assert.ok(report.generatedTemplates.miiSelfDeclaration.includes(sampleTender.bidNumber!));
    assert.ok(report.generatedTemplates.miiSelfDeclaration.includes('Shri Balaji Electricals'));

    assert.ok(report.generatedTemplates.caTurnoverRequest);
    assert.ok(report.generatedTemplates.caTurnoverRequest.includes('UDIN'));
    assert.ok(report.generatedTemplates.caTurnoverRequest.includes('₹45.0 Lakhs'));

    assert.ok(report.generatedTemplates.oemMafRequest);
    assert.ok(report.generatedTemplates.oemMafRequest.includes('MANUFACTURER AUTHORIZATION FORM'));
  });
});
