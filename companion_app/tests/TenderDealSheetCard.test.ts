import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { DeconstructedBidDoc } from '../types/index';

describe('TenderDealSheetCard & WhatsApp Viral Engine', () => {
  const sampleBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/8912044',
    title: 'Supply & Installation of 70W High-Mast LED Luminaires',
    department: 'Military Engineer Services (MES)',
    ministry: 'Ministry of Defence',
    type: 'PRODUCT',
    categoryDomain: 'Electrical & Lighting',
    estimatedBidValueInr: 4850000,
    emdAmountInr: 97000,
    isEmdExemptForMse: true,
    epbgPercentage: 3,
    minAnnualTurnoverInr: 1450000,
    yearsExperienceRequired: 3,
    pastPerformancePercentage: 40,
    deliveryPeriodDays: 60,
    makeInIndiaClass: 'CLASS_1',
    consignees: [
      {
        location: 'Pathankot Base',
        state: 'Punjab',
        pincode: '145001',
        quantity: 1450,
      },
    ],
    boqItems: [
      {
        itemTitle: '70W LED Luminaire IP66',
        quantity: 1450,
        unit: 'Nos',
        specsSummary: 'IP66 High Mast 70W',
      },
    ],
    closingTimeUtc: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8912044',
  };

  it('formats the Financial Big Three matrix accurately', () => {
    assert.strictEqual(sampleBid.estimatedBidValueInr, 4850000);
    assert.strictEqual(sampleBid.emdAmountInr, 97000);
    assert.strictEqual(sampleBid.isEmdExemptForMse, true);
    assert.strictEqual(sampleBid.epbgPercentage, 3);
  });

  it('generates the viral WhatsApp share text payload with deep-link', () => {
    const estValText = '₹48.50 Lakhs';
    const emdValText = '₹97,000';
    const primaryState = sampleBid.consignees?.[0]?.state || 'India';

    const shareText = `⚡ *GeM Tender Alert: ${sampleBid.title}*
📍 *Department:* ${sampleBid.department}, ${primaryState}
💰 *Est. Value:* ${estValText}
🛡️ *EMD Amount:* ${emdValText} (🟢 MSE/Startup EXEMPT: YES)
📋 *Turnover Req:* ₹14.50 Lakhs
🏭 *Make in India (MII):* CLASS_1 Local Content
⏳ *Deadline:* ${new Date(sampleBid.closingTimeUtc).toLocaleDateString('en-IN')}
🔖 *GeM Bid No:* ${sampleBid.bidNumber}

👉 *Deconstruct full BOQ, technical specs & check MSE turnover eligibility (100% Free • No Login Needed):*
https://gemcompanion.in/b/${encodeURIComponent(sampleBid.bidNumber)}?src=wa`;

    assert.ok(shareText.includes('GEM/2026/B/8912044'));
    assert.ok(shareText.includes('MSE/Startup EXEMPT: YES'));
    assert.ok(shareText.includes('https://gemcompanion.in/b/GEM%2F2026%2FB%2F8912044?src=wa'));
    assert.ok(shareText.includes('No Login Needed'));
  });

  it('attaches consultant co-branding attribution cleanly without leaking private data', () => {
    const consultantBranding = {
      agencyName: 'Apex Tender Advisory',
      contactPhone: '+91 98200 12345',
    };

    const attribution = `💼 Shared by: *${consultantBranding.agencyName}* (Ph: ${consultantBranding.contactPhone})\n_Deconstructed via GeM Mobile Companion App_`;

    assert.ok(attribution.includes('Apex Tender Advisory'));
    assert.ok(attribution.includes('+91 98200 12345'));
    assert.ok(attribution.includes('GeM Mobile Companion'));
  });

  it('safely handles missing or unstated values without crashing', () => {
    const sparseBid: DeconstructedBidDoc = {
      bidNumber: 'GEM/2026/B/SPARSE',
      title: 'Tender with unstated fields',
      department: '',
      ministry: '',
      type: 'SERVICE',
      closingTimeUtc: new Date().toISOString(),
      docUrl: '',
    };

    const estVal = sparseBid.estimatedBidValueInr;
    const estValText = estVal && estVal > 0 ? String(estVal) : 'As per BOQ / Unstated';
    const emdVal = sparseBid.emdAmountInr;
    const emdValText = emdVal && emdVal > 0 ? `₹${emdVal}` : 'NIL / ₹0';
    const primaryState = sparseBid.consignees?.[0]?.state || 'Pan-India';

    assert.strictEqual(estValText, 'As per BOQ / Unstated');
    assert.strictEqual(emdValText, 'NIL / ₹0');
    assert.strictEqual(primaryState, 'Pan-India');
  });
});
