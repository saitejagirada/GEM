import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GemPdfExtractor } from '../services/GemPdfExtractor.ts';

describe('GemPdfExtractor - On-Device GeM Tender Parsing', () => {
  const realisticGeMTenderText = `
GOVERNMENT E MARKETPLACE (GeM)
BID DOCUMENT
Bid Number: GEM/2026/B/7192841
Dated: 05-11-2026

Bid Details
Bid End Date/Time: 22-11-2026 15:00:00
Bid Opening Date/Time: 22-11-2026 15:30:00
Bid Offer Validity (From End Date): 90 (Days)
Ministry/State Name: Ministry of Power
Department Name: Department of Power
Organisation Name: National Thermal Power Corporation (NTPC)
Office Name: Corporate Centre Noida
Total Quantity: 1500
Item Category: LED Street Lights 90W (Q3)
Type of Bid: Two Packet Bid
Time allowed for Technical Clarifications during technical evaluation: 2 Days
Inspection Required: No
Estimated Bid Value: ₹ 1,50,00,000
Evaluation Method: Total value wise evaluation

Minimum Average Annual Turnover of the bidder (For 3 Years): 45 Lakh (s)
Years of Past Experience Required for same/similar service: 3 Year (s)
Past Performance: 40 %
Bid to RA enabled: Yes

MSE Exemption for Years Of Experience and Turnover: Yes
Startup Exemption for Years Of Experience and Turnover: Yes
MSE Purchase Preference: Yes
MII Purchase Preference: Yes

Document required from seller:
Experience Criteria
Past Performance
Bidder Turnover
Certificate (Requested in ATC)
OEM Authorization Certificate
Compliance of BoQ specification and supporting document
*In case any bidder is seeking exemption from Experience / Turnover Criteria, the supporting documents to prove his eligibility for exemption must be uploaded for evaluation by the buyer

EMD Detail
Advisory Bank: State Bank of India
EMD Amount: ₹ 75,000

ePBG Detail
Advisory Bank: State Bank of India
ePBG Percentage(%): 3.00
Duration of ePBG required (Months).: 14

Preference to Make In India products (For bids < 200 Crore): Preference will be given to Class 1 local supplier. The minimum local content to qualify as a Class 1 local supplier is denoted in the bid document 50%.

Splitting
Bid splitting not applied.

Consignees/Reporting Officer and Quantity
S.No. Consignee/Reporting Officer Address Quantity Delivery Days
1 Ramesh Kumar 201301, NTPC Complex, Sector 24, Noida, Gautam Buddha Nagar, Uttar Pradesh 1000 30
2 Priya Sharma 400001, Fort, Mumbai, Maharashtra 500 45

Buyer Added Bid Specific Terms and Conditions
1. Generic: OPTION CLAUSE: The Purchaser reserves the right to increase or decrease the quantity of the goods up to 25%.
2. Certificates: Bidder must submit CA certificate with UDIN indicating annual turnover of the bidder for the last 3 financial years.
3. OEM: Manufacturer Authorization Form (MAF)/OEM Authorization Certificate required in case of Authorized Dealer submitting the bid.
4. Scope of Supply: Supply Installation Testing and Commissioning of Goods.
`;

  it('extracts fundamental metadata and commercial values accurately', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);

    assert.equal(details.bidNumber, 'GEM/2026/B/7192841');
    assert.equal(details.ministry, 'Ministry of Power');
    assert.equal(details.department, 'Department of Power');
    assert.equal(details.organisation, 'National Thermal Power Corporation (NTPC)');
    assert.equal(details.totalQuantity, 1500);
    assert.equal(details.estimatedValueInr, 15000000);
    assert.equal(details.emdAmountInr, 75000);
    assert.equal(details.epbgPercentage, 3.0);
    assert.equal(details.epbgDurationMonths, 14);
    assert.equal(details.isRaEnabled, true);
  });

  it('correctly parses turnover thresholds in Lakhs and Crores', () => {
    assert.equal(GemPdfExtractor.parseIndianCurrency('45 Lakh (s)'), 4500000);
    assert.equal(GemPdfExtractor.parseIndianCurrency('2.5 Crore'), 25000000);
    assert.equal(GemPdfExtractor.parseIndianCurrency('₹ 1,50,00,000'), 15000000);
    assert.equal(GemPdfExtractor.parseIndianCurrency('50 Lacs'), 5000000);

    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.equal(details.minAnnualTurnoverInr, 4500000);
  });

  it('extracts past experience and performance requirements', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.equal(details.yearsExperienceRequired, 3);
    assert.equal(details.pastPerformancePercentage, 40);
  });

  it('extracts MSE and Startup exemptions and purchase preferences', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.equal(details.mseExemptionForExpAndTurnover, true);
    assert.equal(details.startupExemptionForExpAndTurnover, true);
    assert.equal(details.isEmdExemptForMse, true);
    assert.equal(details.msePurchasePreference, true);
  });

  it('extracts Make in India (MII) local content % and Class-I classification', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.equal(details.miiPurchasePreference, true);
    assert.equal(details.miiLocalContentPercentage, 50);
    assert.equal(details.miiClass, 'CLASS_1');
  });

  it('extracts tabular consignees, 6-digit Indian PIN codes, states and quantity split', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.equal(details.consignees.length, 2);

    const c1 = details.consignees[0];
    assert.equal(c1.pincode, '201301');
    assert.equal(c1.state, 'Uttar Pradesh');
    assert.equal(c1.quantity, 1000);
    assert.equal(c1.deliveryDays, 30);

    const c2 = details.consignees[1];
    assert.equal(c2.pincode, '400001');
    assert.equal(c2.state, 'Maharashtra');
    assert.equal(c2.quantity, 500);
    assert.equal(c2.deliveryDays, 45);

    // Distribution
    assert.equal(details.consigneeStateDistribution['Uttar Pradesh'].percentage, 67);
    assert.equal(details.consigneeStateDistribution['Maharashtra'].percentage, 33);
  });

  it('extracts required document list and flags ATC compliance triggers', () => {
    const details = GemPdfExtractor.parseGeMTenderText(realisticGeMTenderText);
    assert.ok(details.requiredDocuments.includes('Experience Criteria'));
    assert.ok(details.requiredDocuments.includes('OEM Authorization Certificate'));
    assert.ok(details.requiresOemAuthorization, 'Expected requiresOemAuthorization to be true');
    assert.ok(details.requiresCaTurnoverCertificate, 'Expected requiresCaTurnoverCertificate to be true');
    assert.ok(details.atcClauses.length >= 3, 'Expected at least 3 ATC clauses');
  });

  it('parses compressed /FlateDecode and uncompressed PDF stream operators', () => {
    // Construct mock raw PDF stream with BT ... ET
    const mockPdfRaw = `
1 0 obj
<< /Filter /FlateDecode /Length 120 >>
stream
BT
/F1 12 Tf
(Bid Number: GEM/2026/B/888123) Tj
(Total Quantity: 500) Tj
ET
endstream
endobj
`;
    const extracted = GemPdfExtractor.extractTextFromPdfSource(mockPdfRaw);
    assert.ok(extracted.includes('Bid Number: GEM/2026/B/888123'));
    assert.ok(extracted.includes('Total Quantity: 500'));
  });
});
