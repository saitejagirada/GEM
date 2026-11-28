import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CompanyDocExtractor } from '../services/CompanyDocExtractor.ts';
import { BusinessProfileService } from '../services/BusinessProfileService.ts';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('CompanyDocExtractor - On-Device Company PDF Parsing & Profile Sync', () => {
  beforeEach(() => {
    BusinessProfileService.setStorageAdapterForTests(createMemoryStorage());
  });

  it('extracts Udyam number, enterprise tier, manufacturer role, firm name, and state', () => {
    const udyamText = `
      UDYAM REGISTRATION CERTIFICATE
      Ministry of Micro, Small and Medium Enterprises
      UDYAM REGISTRATION NUMBER : UDYAM-TS-02-0048192
      Name of Enterprise : DECCAN PRECISION ENGINEERING WORKS
      Type of Enterprise : SMALL
      Major Activity : Manufacturing
      Date of Incorporation : 14/06/2019
      Official Address of Enterprise : Plot 42, Balanagar Industrial Estate, Hyderabad, Telangana
    `;

    const info = CompanyDocExtractor.parseCompanyDocumentText(
      udyamText,
      'UDYAM',
      new Date('2026-11-28T00:00:00Z')
    );

    assert.strictEqual(info.hasReadableText, true);
    assert.strictEqual(info.udyamNumber, 'UDYAM-TS-02-0048192');
    assert.strictEqual(info.firmName, 'DECCAN PRECISION ENGINEERING WORKS');
    assert.strictEqual(info.msmeCategory, 'SMALL');
    assert.strictEqual(info.majorActivity, 'MANUFACTURING');
    assert.strictEqual(info.isOem, true);
    assert.strictEqual(info.state, 'Telangana');
    assert.strictEqual(info.yearsExperienceDerived, 7);
    assert.ok(info.detectedTags.includes('UDYAM_MSME'));
  });

  it('extracts GSTIN, state from GST prefix, PAN, legal name, and principal address from GST REG-06', () => {
    const gstText = `
      FORM GST REG-06
      Registration Certificate
      Registration Number : 36ABCDE1234F1Z5
      Legal Name : MERCURY FACILITY SERVICES PRIVATE LIMITED
      Principal Place of Business : 8-2-293 Jubilee Hills, Hyderabad, Telangana 500033
      Date of Validity From : 01/07/2021
    `;

    const info = CompanyDocExtractor.parseCompanyDocumentText(
      gstText,
      'GST',
      new Date('2026-11-28T00:00:00Z')
    );

    assert.strictEqual(info.gstin, '36ABCDE1234F1Z5');
    assert.strictEqual(info.panNumber, 'ABCDE1234F');
    assert.strictEqual(info.state, 'Telangana');
    assert.strictEqual(info.firmName, 'MERCURY FACILITY SERVICES PRIVATE LIMITED');
    assert.ok(info.registeredAddress?.includes('Jubilee Hills'));
    assert.strictEqual(info.yearsExperienceDerived, 5);
    assert.ok(info.detectedTags.includes('GST_STATUTORY'));
  });

  it('extracts Average Annual Turnover and verifies 18-char ICAI UDIN from CA Turnover PDF', () => {
    const caText = `
      TO WHOMSOEVER IT MAY CONCERN
      Chartered Accountants Turnover Certificate
      This is to certify that M/s Deccan Precision Engineering Works has the following turnover:
      FY 2022-23 : ₹90 Lakhs
      FY 2023-24 : ₹1.20 Crores
      FY 2024-25 : ₹1.50 Crores
      Average Annual Turnover : ₹1.20 Crores
      UDIN : 26123456ABCDEF1234
    `;

    const info = CompanyDocExtractor.parseCompanyDocumentText(caText, 'TURNOVER');
    assert.strictEqual(info.hasUdin, true);
    assert.strictEqual(info.udinNumber, '26123456ABCDEF1234');
    assert.strictEqual(info.averageTurnoverInr, 12000000);
    assert.ok(info.detectedTags.includes('CA_UDIN_TURNOVER'));
  });

  it('extracts GeM CRAC contract number, order value, and ISO validity expiry date', () => {
    const cracText = `
      Consignee Receipt and Acceptance Certificate (CRAC)
      Contract No : GEMC-511687712345678
      Contract Generated Date : 10-02-2023
      Total Order Value : ₹18,50,000
    `;
    const cracInfo = CompanyDocExtractor.parseCompanyDocumentText(cracText, 'EXPERIENCE');
    assert.strictEqual(cracInfo.contractNumber, 'GEMC-511687712345678');
    assert.strictEqual(cracInfo.orderValueInr, 1850000);
    assert.ok(cracInfo.detectedTags.includes('CRAC_EXPERIENCE'));

    const isoText = `
      Certificate of Registration
      ISO 9001:2015 Quality Management System
      Valid Until : 31-03-2028
    `;
    const isoInfo = CompanyDocExtractor.parseCompanyDocumentText(isoText, 'ISO_QUALITY');
    assert.strictEqual(isoInfo.validUntilIso, '2028-03-31');
    assert.ok(isoInfo.standards?.includes('ISO 9001:2015'));
    assert.ok(isoInfo.detectedTags.includes('ISO_QUALITY'));
  });

  it('detects MII Declaration and OEM MAF tags from content regardless of generic filename', () => {
    const miiInfo = CompanyDocExtractor.parseCompanyDocumentText(
      'SELF-DECLARATION UNDER MAKE IN INDIA (MII) POLICY. We qualify as a Class-I Local Supplier with 65% local content.'
    );
    assert.ok(miiInfo.detectedTags.includes('MII_DECLARATION'));

    const mafInfo = CompanyDocExtractor.parseCompanyDocumentText(
      'MANUFACTURER AUTHORIZATION FORM (MAF). We hereby authorize M/s Mercury Enterprises to submit a bid.'
    );
    assert.ok(mafInfo.detectedTags.includes('OEM_MAF'));
  });

  it('builds a clean profile patch and applies it to BusinessProfileService without losing existing fields', async () => {
    await BusinessProfileService.saveProfile({
      organizationName: 'Initial Firm',
      msmeCategory: 'MICRO',
      annualTurnoverLakhs: 40,
      yearsExperience: 2,
      isOem: false,
      hasUdyamCertificate: true,
      targetStates: ['Pan-India'],
    });

    const caInfo = CompanyDocExtractor.parseCompanyDocumentText(`
      Average Annual Turnover : ₹1.5 Crores
      UDIN : 26123456ABCDEF9999
    `);
    const patch = CompanyDocExtractor.buildProfilePatch(
      caInfo,
      BusinessProfileService.getProfile()
    );
    assert.ok(patch.fields.some((f) => f.key === 'annualTurnoverInr'));
    assert.ok(patch.fields.some((f) => f.key === 'hasVerifiedUdin'));

    const updated = await BusinessProfileService.applyExtractedPatch(patch);
    assert.strictEqual(updated.annualTurnoverInr, 15000000);
    assert.strictEqual(updated.hasVerifiedUdin, true);
    assert.strictEqual(updated.organizationName, 'Initial Firm');
    assert.deepStrictEqual(updated.targetStates, ['Pan-India']);
  });
});
