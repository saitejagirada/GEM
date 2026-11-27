import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CorrigendumViewerService } from '../services/CorrigendumViewerService.ts';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';

const SAMPLE_LIVE_CORRIGENDUM_HTML = `
  <div class="border block">
    <div class="block_bid_no"><p> Corrigendum Details</p></div>
    <div class="col-md-12 col-xs-12">
      <div class="well"><div class="col-block"> <span id=span_4759711><strong >Modified On: </strong><span>2026-11-12 16:37:37</span></span></div><div class="col-block" style="width:48% !important;">Bid extended to <strong>2026-11-27 13:00:00</strong></div><div class="clearfix"></div></div>
      <div class="well"><div class="col-block"><strong>&nbsp;</strong><span></span></div><div class="col-block" style="width:48%;">Bid Opening Date: <strong>2026-11-28 13:00:00</strong></div><div class="clearfix"></div></div>
      <div class="well"><div class="col-block"> <span id=span_4685764><strong >Modified On: </strong><span>2026-10-17 18:38:24</span></span></div><div class="col-block" style="width:48% !important;"><a href="/bidding/bid/showcorrigendumpdf/4685764/9920115"><span class="glyphicon glyphicon-download-alt"></span> Download</a></div><div class="clearfix"></div></div>
      <div class="well"><div class="col-block"> <span id=span_4650001><strong >Modified On: </strong><span>2026-10-10 10:00:00</span></span></div><div class="col-block" style="width:48% !important;"><a href="#" class="view_tc" data-id="4650001">Buyer Added Bid Specific Terms &amp; Conditions View</a></div><div class="clearfix"></div></div>
    </div>
  </div>
  <div id="myModal12" class="modal fade"></div>
  <script>function showOriginal(){ bootbox.alert('No corrigendum found for this bid'); }</script>
`;

const SAMPLE_LIVE_REPRESENTATION_HTML = `
  <div class="container-fluid">
    <div class="panel panel-default" id="printableArea">
      <div class="panel-header"><h3><label>Bid No: GEM/2026/B/8246582</label></h3></div>
      <div class="panel-body">
        <h3><label>Response Publication Date: 19-11-2026 05:48 PM</label></h3>
        <table class="table table-striped">
          <thead><tr><th>section</th><th>Query</th><th>Reply</th></tr></thead>
          <tbody id="rep_res">
            <tr>
              <td>Product/Service specification</td>
              <td>1. Automatic Return Feature restricts participation.</td>
              <td>The specification remain unchanged and will be as per the ATC</td>
            </tr>
            <tr>
              <td></td>
              <td>2. Please relax bunch bid clubbing for MSMEs.</td>
              <td>OEM/Manufacturer or Distributor both are eligible for bid.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

describe('CorrigendumViewerService - Live GeM Corrigendum & Pre-Bid Representation Parser', () => {
  beforeEach(() => {
    CorrigendumViewerService.clearCacheForTests();
  });

  it('parses date extensions with merged Bid Opening Date, official PDF links, and inline T&C entries', () => {
    const entries = CorrigendumViewerService.parseCorrigendumHtml(SAMPLE_LIVE_CORRIGENDUM_HTML, '9920115');
    assert.strictEqual(entries.length, 3);

    assert.strictEqual(entries[0].kind, 'DATE_EXTENSION');
    assert.strictEqual(entries[0].modifiedOn, '2026-11-12 16:37:37');
    assert.strictEqual(entries[0].extendedTo, '2026-11-27 13:00:00');
    assert.strictEqual(entries[0].bidOpeningDate, '2026-11-28 13:00:00');

    assert.strictEqual(entries[1].kind, 'PDF_AMENDMENT');
    assert.strictEqual(
      entries[1].pdfUrl,
      'https://bidplus.gem.gov.in/bidding/bid/showcorrigendumpdf/4685764/9920115'
    );

    assert.strictEqual(entries[2].kind, 'TC_AMENDMENT');
    assert.strictEqual(entries[2].tcAmendmentId, '4650001');
  });

  it('returns empty list for GeM empty corrigendum response ("0") and rejects unsafe non-GeM links', () => {
    assert.deepStrictEqual(CorrigendumViewerService.parseCorrigendumHtml('0', '123'), []);

    const malicious = `<div class="well"><div class="col-block"><strong>Modified On: </strong><span>2026-11-01</span></div><div class="col-block"><a href="https://evil.example.com/corrigendum.pdf">Download</a></div><div class="clearfix"></div></div>`;
    const parsed = CorrigendumViewerService.parseCorrigendumHtml(malicious, '123');
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].pdfUrl, undefined);
    assert.strictEqual(parsed[0].kind, 'NOTE');
  });

  it('parses Pre-Bid Representations table and carries forward section header for blank cells', () => {
    const parsed = CorrigendumViewerService.parseRepresentationHtml(
      SAMPLE_LIVE_REPRESENTATION_HTML,
      '10134029'
    );
    assert.strictEqual(parsed.publishedOn, '19-11-2026 05:48 PM');
    assert.strictEqual(parsed.entries.length, 2);
    assert.strictEqual(parsed.entries[0].section, 'Product/Service specification');
    assert.strictEqual(parsed.entries[1].section, 'Product/Service specification');
    assert.ok(parsed.entries[1].reply.includes('OEM/Manufacturer'));
  });

  it('fetches and caches corrigenda, T&C clause text, and representations via GeMLiveSyncService', async () => {
    const origCorr = GeMLiveSyncService.fetchCorrigendumHtml;
    const origTc = GeMLiveSyncService.fetchCorrigendumTcHtml;
    const origRep = GeMLiveSyncService.fetchRepresentationHtml;

    let corrCalls = 0;
    GeMLiveSyncService.fetchCorrigendumHtml = async () => {
      corrCalls += 1;
      return SAMPLE_LIVE_CORRIGENDUM_HTML;
    };
    GeMLiveSyncService.fetchCorrigendumTcHtml = async () => '<p>Warranty extended to <b>3 Years</b>.</p>';
    GeMLiveSyncService.fetchRepresentationHtml = async () => SAMPLE_LIVE_REPRESENTATION_HTML;

    try {
      const c1 = await CorrigendumViewerService.loadCorrigenda('9920115');
      const c2 = await CorrigendumViewerService.loadCorrigenda('9920115');
      assert.strictEqual(corrCalls, 1);
      assert.strictEqual(c1.entries.length, 3);
      assert.strictEqual(c2.entries.length, 3);

      const tcText = await CorrigendumViewerService.loadTcAmendmentText('4650001');
      assert.strictEqual(tcText, 'Warranty extended to 3 Years.');

      const reps = await CorrigendumViewerService.loadRepresentations('10134029');
      assert.strictEqual(reps.entries.length, 2);
      assert.strictEqual(reps.publishedOn, '19-11-2026 05:48 PM');
    } finally {
      GeMLiveSyncService.fetchCorrigendumHtml = origCorr;
      GeMLiveSyncService.fetchCorrigendumTcHtml = origTc;
      GeMLiveSyncService.fetchRepresentationHtml = origRep;
    }
  });
});
