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
    assert.ok(laptopConfig.slug.includes('laptop-notebook'));
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
});
