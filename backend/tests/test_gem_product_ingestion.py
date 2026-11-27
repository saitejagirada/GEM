"""
Unit tests for GeM Product Ingestion Pipeline and Products API
"""

import pytest
from app import create_app
from app.services.gem_product_ingestion import GemProductIngestion
from app.services.gem_portal_service import GemPortalService


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_load_cached_products():
    """Verifies loading real-time cached GeM products."""
    products = GemProductIngestion._load_cached_products()
    assert isinstance(products, list)
    assert len(products) >= 20
    
    first = products[0]
    assert "id" in first
    assert "title" in first
    assert "oemBrand" in first
    assert "l1PriceInr" in first
    assert "mrpInr" in first
    assert "imageUrl" in first
    assert "category" in first
    assert first["l1PriceInr"] > 0
    assert first["mrpInr"] >= first["l1PriceInr"]
    assert first["isAvailableOnGeM"] is True


def test_gem_portal_service_get_products_filtering():
    """Verifies category and search query filtering in GemPortalService."""
    all_products = GemPortalService.get_products()
    assert len(all_products) >= 20

    # Filter by IT Products
    it_products = GemPortalService.get_products(category="IT Products")
    assert len(it_products) > 0
    assert all("it products" in p["category"].lower() for p in it_products)

    # Filter by search query
    query_results = GemPortalService.get_products(query="acer")
    assert len(query_results) > 0
    assert all("acer" in (p["title"] + p["oemBrand"]).lower() for p in query_results)


def test_get_products_api_endpoint(client):
    """Verifies GET /api/portal/products returns genuine products with counts."""
    resp = client.get('/api/portal/products')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["count"] >= 20
    assert len(data["data"]) >= 20
    assert "l1PriceInr" in data["data"][0]
