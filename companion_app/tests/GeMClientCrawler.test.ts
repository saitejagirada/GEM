import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMClientCrawler, OFFICIAL_GEM_SUBCATEGORIES } from '../services/GeMClientCrawler.ts';

describe('GeMClientCrawler & Live Multi-Seller Parsing', () => {
  it('maps official GeM category taxonomy accurately', () => {
    assert.ok(OFFICIAL_GEM_SUBCATEGORIES.length >= 10);
    const desktopConfig = OFFICIAL_GEM_SUBCATEGORIES.find((c) => c.id === 'desktop-computers');
    assert.ok(desktopConfig);
    assert.strictEqual(desktopConfig.slug, 'computers-entry-level-computer-cpu/search');
    assert.strictEqual(desktopConfig.category, 'IT Products');

    const laptopConfig = OFFICIAL_GEM_SUBCATEGORIES.find((c) => c.id === 'laptops-notebooks');
    assert.ok(laptopConfig);
    assert.strictEqual(laptopConfig.slug, 'computers-entry-and-mid-level-laptop-notebook/search');
    assert.strictEqual(GeMClientCrawler.resolveMatchingSubcategory('laptop')?.id, 'laptops-notebooks');

    // Verify Textile Products, Automobiles, and Pipes & Fittings all use verified live slugs
    const textiles = OFFICIAL_GEM_SUBCATEGORIES.filter((c) => c.category === 'Textile Products');
    const autos = OFFICIAL_GEM_SUBCATEGORIES.filter((c) => c.category === 'Automobiles');
    const pipes = OFFICIAL_GEM_SUBCATEGORIES.filter((c) => c.category === 'Pipes & Fittings');
    assert.ok(textiles.length >= 3);
    assert.ok(autos.length >= 4);
    assert.ok(pipes.length >= 3);
    assert.ok(textiles.some((t) => t.slug.includes('bedclothes-handloom-cotton-bed-sheets')));
    assert.ok(pipes.some((p) => p.slug.includes('is-1239')));
    assert.ok(pipes.some((p) => p.slug.includes('is-15778')));
  });

  it('extracts dynamic live category slugs from GeM /search?q= HTML results', () => {
    const mockSearchHtml = `
      <a href="/computers-desktop-computer/search">Navbar link without query hash</a>
      <a href="/bedclothes-handloom-cotton-bed-sheets-as-per-is-745-version-2-/search#/?q=bed+sheet">Result 1</a>
      <a href="/towels-cotton-towelling-and-towels-v4-conforming-to-is-7056/search#/?q=towels">Result 2</a>
      <a href="/bedclothes-handloom-cotton-bed-sheets-as-per-is-745-version-2-/search#/?q=bed+sheet">Duplicate</a>
    `;
    const slugs = GeMClientCrawler.extractDiscoveredSearchSlugs(mockSearchHtml);
    assert.deepStrictEqual(slugs, [
      'bedclothes-handloom-cotton-bed-sheets-as-per-is-745-version-2-/search',
      'towels-cotton-towelling-and-towels-v4-conforming-to-is-7056/search',
    ]);
  });

  it('parses live GeM HTML card variants with multi-seller, discounts, and badges', () => {
    const mockGeMHtml = `
      <html>
        <body>
          <div class="variant-wrapper btn-add_to_cart rle-add_to_cart bre-">
            <div class="swadeshi" title="Class-I local supplier"></div>
            <div class="msme_womenia" title="Womeniya MSE Entrepreneur"></div>
            <div class="variant-image">
              <a href="/entry-mid-level-desktop-computer/dugong-cdm-500/p-5116877-27646663401-cat.html#variant_id=5116877-27646663401">
                <span data-picture data-id="" class="responsive" data-alt="DUGONG Entry Level Desktop Computer with Warranty 3 Year" data-title="DUGONG Entry Level Desktop Computer with Warranty 3 Year" data-src="https://assets-mkpbg.gem.gov.in/img/othe/6827336/53/f8/dugong.jpg">
                </span>
              </a>
            </div>
            <span class="variant-title">
              <a href="/entry-mid-level-desktop-computer/dugong-cdm-500/p-5116877-27646663401-cat.html#variant_id=5116877-27646663401" title="DUGONG Entry Level Desktop Computer with Warranty 3 Year">
                DUGONG Entry Level Desktop Computer with Warranty 3 Year
              </a>
            </span>
            <span class="variant-brand">Brand: DUGONG</span>
            <span class="variant-seller">Seller: Resellers</span>
            <span>Min. Qty. Per Consignee: 1000000</span>
            <span class="variant-final-price">₹ 22,242.00</span>
            <span class="variant-list-price">₹ 229,999.00</span>
          </div>
          <div class="variant-wrapper btn-add_to_cart rle-add_to_cart bre-">
            <div class="startup-verified" title="DPIIT Recognised Startup"></div>
            <div class="variant-image">
              <a href="/entry-mid-level-desktop-computer/champion-cdm-500/p-5116877-28029076832-cat.html#variant_id=5116877-28029076832">
                <span data-picture data-id="" class="responsive" data-src="https://assets-mkpbg.gem.gov.in/img/othe/6827336/53/f8/champion.jpg">
                </span>
              </a>
            </div>
            <span class="variant-title">
              <a href="/entry-mid-level-desktop-computer/champion-cdm-500/p-5116877-28029076832-cat.html#variant_id=5116877-28029076832" title="Champion Entry Level Desktop Computer with Warranty 1 Year">
                Champion Entry Level Desktop Computer with Warranty 1 Year
              </a>
            </span>
            <span class="variant-brand">Brand: Champion</span>
            <span class="variant-seller">Seller: OEM</span>
            <span>Min. Qty. Per Consignee: 5</span>
            <span class="variant-final-price">₹ 24,500.00</span>
            <span class="variant-list-price">₹ 35,000.00</span>
          </div>
        </body>
      </html>
    `;

    const items = GeMClientCrawler.parseGeMHtml(mockGeMHtml, 'IT Products', 'per Desktop Set', '⚡ 2-4 Days Delivery');
    assert.strictEqual(items.length, 2);

    // Verify Product 1 (DUGONG with 90% discount and Swadeshi/Womaniya badges)
    const p1 = items[0];
    assert.strictEqual(p1.oemBrand, 'DUGONG');
    assert.strictEqual(p1.l1PriceInr, 22242);
    assert.strictEqual(p1.mrpInr, 229999);
    assert.strictEqual(p1.discountPercent, 90);
    assert.strictEqual(p1.minOrderQty, 1000000);
    assert.strictEqual(p1.imageUrl, 'https://assets-mkpbg.gem.gov.in/img/othe/6827336/53/f8/dugong.jpg');
    assert.ok(p1.badge?.includes('Swadeshi'));
    assert.ok(p1.badge?.includes('Womaniya'));

    // Verify Product 2 (Champion OEM with Startup badge)
    const p2 = items[1];
    assert.strictEqual(p2.oemBrand, 'Champion');
    assert.strictEqual(p2.l1PriceInr, 24500);
    assert.strictEqual(p2.mrpInr, 35000);
    assert.strictEqual(p2.discountPercent, 30);
    assert.strictEqual(p2.minOrderQty, 5);
    assert.ok(p2.badge?.includes('Startup'));
  });

  it('parses native GeM _xhr=1 JSON catalog responses with seller, exact totals, and canonical slug', () => {
    const parsed = GeMClientCrawler.parseGeMXhrJson(
      {
        curr_page: '2',
        number_of_results: 252,
        browse_node: {
          id: 'home_info_comp_comp_en14305462',
          title: 'Entry and Mid Level Laptop - Notebook',
          url: 'computers-entry-and-mid-level-laptop-notebook',
        },
        catalogs: [
          {
            id: '5116877-98254261476',
            title: 'HP ProBook 440 G10 Laptop',
            brand: 'HP',
            img_url: 'https://assets-mkpbg.gem.gov.in/img/othe/hp.999xx.jpg',
            url: ['entry-mid-level-laptop', 'hp-probook', 'p-5116877-98254261476-cat.html'],
            is_l1: true,
            moq: 5,
            list_price: { value: 90000 },
            final_price: { value: 54000 },
            discount_percent: 40,
            seller: {
              name: 'UNICORN INDUSTRIES',
              is_authorized: true,
              is_reseller: true,
              display_sold_as: 'Reseller - Authorization Details Available',
              config: { sold_as: 'Resellers' },
            },
          },
        ],
      },
      'IT Products',
      'per Laptop',
      '24–48 hrs Express'
    );

    assert.strictEqual(parsed.currentPage, 2);
    assert.strictEqual(parsed.totalResults, 252);
    assert.strictEqual(parsed.canonicalSlug, 'computers-entry-and-mid-level-laptop-notebook');
    assert.strictEqual(parsed.items.length, 1);
    const laptop = parsed.items[0];
    assert.strictEqual(laptop.id, 'gem-live-5116877-98254261476');
    assert.strictEqual(laptop.oemBrand, 'HP');
    assert.strictEqual(laptop.l1PriceInr, 54000);
    assert.strictEqual(laptop.mrpInr, 90000);
    assert.strictEqual(laptop.discountPercent, 40);
    assert.strictEqual(laptop.badge, 'GeM L1');
    assert.strictEqual(laptop.specSummary['Seller'], 'UNICORN INDUSTRIES');
    assert.strictEqual(
      laptop.productUrl,
      'https://mkp.gem.gov.in/entry-mid-level-laptop/hp-probook/p-5116877-98254261476-cat.html'
    );
  });

  it('automatically retries page 2 against canonical browse_node.url when alias slug bounces to page 1', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes('legacy-alias-slug/search?') && url.includes('page=2')) {
        return new Response(
          JSON.stringify({
            curr_page: '1',
            number_of_results: 40,
            browse_node: { url: 'canonical-laptop-slug' },
            catalogs: [{ id: 'p1-item', title: 'Page 1 Item', brand: 'ACER', final_price: { value: 30000 } }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          curr_page: '2',
          number_of_results: 40,
          browse_node: { url: 'canonical-laptop-slug' },
          catalogs: [{ id: 'p2-item', title: 'Page 2 Item', brand: 'LENOVO', final_price: { value: 32000 } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    try {
      const res = await GeMClientCrawler.fetchCategoryPage('legacy-alias-slug/search', 2, 5000, false);
      assert.strictEqual(res.page, 2);
      assert.strictEqual(res.totalResults, 40);
      assert.strictEqual(res.hasMore, true);
      assert.strictEqual(res.items[0].id, 'gem-live-p2-item');
      assert.ok(requestedUrls.some((u) => u.includes('canonical-laptop-slug/search?') && u.includes('don_load_facets=true') && u.includes('page=2')));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
