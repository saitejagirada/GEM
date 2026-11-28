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

  it('decodes TCPDF UTF-16BE hex strings used in GeM RA PDFs without null spacing', () => {
    const toUtf16BeHex = (str: string) =>
      Array.from(str)
        .map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('');
    const mockRaPdf = `
1 0 obj
<< /Length 120 >>
stream
BT
/F1 10 Tf
<${toUtf16BeHex('RA Number: GEM/2026/R/771831')}> Tj
<${toUtf16BeHex('Total Quantity: 1000')}> Tj
ET
endstream
endobj
`;
    const extracted = GemPdfExtractor.extractTextFromPdfSource(mockRaPdf);
    assert.ok(extracted.includes('RA Number: GEM/2026/R/771831'));
    assert.ok(extracted.includes('Total Quantity: 1000'));
    const parsed = GemPdfExtractor.parseGeMTenderText(extracted);
    assert.equal(parsed.bidNumber, 'GEM/2026/R/771831');
    assert.equal(parsed.totalQuantity, 1000);
  });

  it('parses wrapped wkhtmltopdf exemptions, bilingual turnover, and multi-line consignee rows', () => {
    const wrappedText = `
Bid Number : GEM/2026/B/7966240
Total Quantity : 1000
( 3 : 6 Lakh (s)
) OEM Average Turnover (Last 3 Years)
MSE Relaxation for Years Of Experience : Yes | Complete
and Turnover
Startup Relaxation for Years Of : Yes | Complete
Experience and Turnover
EMD Detail
Required : No
ePBG Detail
(%) ePBG Percentage(%) : 5.00
( ) Duration of ePBG : 17
required (Months).
Bid splitting not applied.
Consignees/Reporting Officer and Quantity
571130,BARC (M), RMP,
1 Salil Kumar N HUNSAR HIGHWAY, RATNAHALLY COMPLEX, : 1000 90
Buyer Added Bid Specific Terms and Conditions
`;
    const parsed = GemPdfExtractor.parseGeMTenderText(wrappedText);
    assert.equal(parsed.emdAmountInr, 0);
    assert.equal(parsed.epbgPercentage, 5);
    assert.equal(parsed.epbgDurationMonths, 17);
    assert.equal(parsed.minAnnualTurnoverInr, 600000);
    assert.equal(parsed.isEmdExemptForMse, true);
    assert.equal(parsed.isEmdExemptForStartup, true);
    assert.equal(parsed.splittingRatio, '100% to L1 (No Split)');
    assert.equal(parsed.deliveryPeriodDays, 90);
    assert.equal(parsed.consignees[0]?.state, 'Karnataka');
    assert.equal(parsed.consignees[0]?.quantity, 1000);
  });

  it('extracts, classifies, and spatially labels dynamic buyer-linked specifications, drawings, ATC, and BOQ documents from PDF annotations', () => {
    const mockLinkedPdf = `
1 0 obj
<< /Type /Page /Contents 2 0 R /Annots 3 0 R /MediaBox [0 0 595 842] >>
endobj
2 0 obj
<< /Length 260 >>
stream
BT
/F1 10 Tf
1 0 0 1 40 700 Tm (Technical Specification) Tj
1 0 0 1 40 640 Tm (Product Drawing) Tj
1 0 0 1 40 580 Tm (Buyer Added Bid Specific ATC) Tj
1 0 0 1 40 520 Tm (BOQ Item List) Tj
ET
endstream
endobj
3 0 obj
[ 4 0 R 5 0 R 6 0 R 7 0 R 8 0 R 9 0 R ]
endobj
4 0 obj
<< /Subtype /Link /Rect [260 694 350 708] /A << /S /URI /URI (https://mkp.gem.gov.in/catalog_data/catalog_support_document/buyer_documents/123/CatalogAttrs/SpecificationDocument/2026/9/22/tech_spec_sow_2026-09-22-11-13-14_49fd3e57c02571d4e8af760f9e351844.pdf) >> >>
endobj
5 0 obj
<< /Subtype /Link /Rect [260 634 350 648] /A << /S /URI /URI (https://mkp.gem.gov.in/catalog_data/catalog_support_document/buyer_documents/123/CatalogAttrs/DrawingDocument/2026/9/22/4298_2026-09-22-11-13-14_6abf54a340ad261d40cac90c5b570a5a.pdf) >> >>
endobj
6 0 obj
<< /Subtype /Link /Rect [260 574 350 588] /A << /S /URI /URI (https://fulfilment.gem.gov.in/contract/slafds?fileDownloadPath=SLA_UPLOAD_PATH/2026/Sep/GEM_2026_B_8066439/CLM0010/atc_7c5f8a85-9b98-46e0-b8db1790056785142_USER.pdf) >> >>
endobj
7 0 obj
<< /Subtype /Link /Rect [260 514 350 528] /A << /S /URI /URI (https://bidplus.gem.gov.in/resources/upload_nas/SepQ326/bidding/excel/bid-9946106/1790340484.xlsx) >> >>
endobj
8 0 obj
<< /Subtype /Link /Rect [40 460 180 474] /A << /S /URI /URI (https://bidplus.gem.gov.in/bidding/downloadOmppdfile/) >> >>
endobj
9 0 obj
<< /Subtype /Link /Rect [40 420 180 434] /A << /S /URI /URI (http://dejavu.sourceforge.net/wiki/index.php/License) >> >>
endobj
`;

    const docs = GemPdfExtractor.extractLinkedDocumentsFromPdf(mockLinkedPdf);
    assert.equal(docs.length, 4, 'Should keep 4 valid GeM buyer attachments and filter noise/empty links');
    assert.equal(docs[0].kind, 'SPECIFICATION');
    assert.equal(docs[0].fileFormat, 'PDF');
    assert.equal(docs[1].kind, 'DRAWING');
    assert.equal(docs[1].fileFormat, 'PDF');
    assert.equal(docs[2].kind, 'ATC');
    assert.equal(docs[2].contextLabel, 'Buyer Added Bid Specific ATC');
    assert.equal(docs[3].kind, 'BOQ');
    assert.equal(docs[3].fileFormat, 'XLSX');
  });

  it('never misreads ATC boilerplate percentages (e.g. "20% of estimated bid value") or option clauses as tender figures', () => {
    const gem8255933Sample = `
Bid Number : GEM/2026/B/8255933
Department Name : Department Of Military Affairs
Ministry/State Name : Ministry Of Defence
Total Quantity : 37
Years of Past Experience Required for : 3 Year (s)
Past Performance : 70 %
MSE Relaxation for Years Of Experience : No
and Turnover
EMD Detail
Required : No
ePBG Detail
Required : No
Splitting
Bid splitting not applied.
Buyer Added Bid Specific Terms and Conditions
1 . Generic OPTION CLAUSE: The additional delivery time shall be subject to minimum of 30 days.
15 . Turnover
Bidder Turn Over Criteria: The minimum average annual financial turnover of the bidder during the last 3 financial years.
20 . Past Project Experience
(i) Single order of at least 35% of estimated bid value; or
(ii) Two orders of at least 20% each of estimated bid value; or
(iii) Three orders of at least 15% each of estimated bid value.
`;
    const parsed = GemPdfExtractor.parseGeMTenderText(gem8255933Sample);
    assert.equal(parsed.estimatedValueInr, undefined, 'Must NOT extract 20 from "20% each of estimated bid value"');
    assert.equal(parsed.emdAmountInr, 0);
    assert.equal(parsed.isEmdExemptForMse, false, 'Must NOT fabricate MSE exemption when MSE Relaxation is No');
    assert.equal(parsed.epbgPercentage, 0);
    assert.equal(parsed.minAnnualTurnoverInr, undefined, 'Must NOT extract 3 from "last 3 financial years"');
    assert.equal(parsed.deliveryPeriodDays, undefined, 'Must NOT extract 30 from ATC Option Clause prose');
    assert.equal(parsed.totalQuantity, 37);
    assert.equal(parsed.yearsExperienceRequired, 3);
    assert.equal(parsed.pastPerformancePercentage, 70);
  });

  it('rejoins PDF line-wrapped parenthetical items like Certificate (Requested in\\nATC) and drops orphan fragments', () => {
    const wrappedSample = `
Experience Criteria,Bidder Turnover,Certificate (Requested in
ATC),Additional Doc 1 (Requested in
ATC),Additional Doc 2 (Requested in
Document required : ATC),Additional Doc 4 (Requested in ATC),Compliance of BoQ specification and
supporting document
from seller : *In case any bidder is seeking exemption
`;
    const docs = GemPdfExtractor.extractRequiredDocumentsList(wrappedSample);
    assert.ok(docs.includes('Experience Criteria'));
    assert.ok(docs.includes('Bidder Turnover'));
    assert.ok(docs.includes('Certificate (Requested in ATC)'));
    assert.ok(docs.includes('Additional Doc 1 (Requested in ATC)'));
    assert.ok(docs.includes('Additional Doc 4 (Requested in ATC)'));
    assert.ok(docs.includes('Compliance of BoQ specification and supporting document'));
    assert.ok(!docs.some((d) => d.includes('ATC))')), 'Must not double-close parentheses');
    assert.ok(!docs.includes('ATC)'), 'Must not emit broken fragment "ATC)"');
    assert.ok(!docs.includes('supporting document'), 'Must not emit lowercase wrap continuation fragment');
    assert.ok(!docs.some((d) => d.endsWith('Requested in')), 'Must not emit truncated open-paren fragment');
  });
});
