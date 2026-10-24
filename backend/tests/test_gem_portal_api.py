"""
Unit tests for GeM Portal Intelligence API Blueprint and Services
"""

import pytest
from app import create_app
from app.services.gem_portal_service import GemPortalService


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_market_pulse(client):
    """Verifies market pulse returns correct structure and positive values."""
    res = client.get('/api/portal/market-pulse')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    data = json_data['data']
    assert data['totalBidsToday'] > 0
    assert data['liveReverseAuctions'] > 0
    assert data['liveForwardAuctions'] > 0
    assert data['zeroEmdBids'] > 0


def test_portal_feed_and_filtering(client):
    """Verifies feed retrieval and category/score filtering."""
    # All feed
    res = client.get('/api/portal/feed')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    assert len(json_data['data']) > 0

    # High match filter
    res_filtered = client.get('/api/portal/feed?minScore=90')
    assert res_filtered.status_code == 200
    data_filtered = res_filtered.get_json()['data']
    for bid in data_filtered:
        assert bid.get('matchScore', 0) >= 90


def test_bid_fundamentals(client):
    """Verifies zero-PDF structured fundamentals endpoint."""
    res = client.get('/api/portal/bid/GEM/2026/B/890123/fundamentals')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    bid = json_data['data']
    assert bid['bidNumber'] == 'GEM/2026/B/890123'
    assert 'boqItems' in bid
    assert len(bid['boqItems']) > 0
    assert 'consignees' in bid
    assert 'requiredDocuments' in bid


def test_auctions_endpoint(client):
    """Verifies reverse auctions and forward scrap auctions retrieval."""
    # Reverse Auctions
    res_ra = client.get('/api/portal/auctions?type=reverse')
    assert res_ra.status_code == 200
    assert res_ra.get_json()['type'] == 'reverse'
    assert len(res_ra.get_json()['data']) > 0

    # Forward Auctions
    res_fa = client.get('/api/portal/auctions?type=forward')
    assert res_fa.status_code == 200
    assert res_fa.get_json()['type'] == 'forward'
    assert len(res_fa.get_json()['data']) > 0


def test_portfolio_endpoint(client):
    """Verifies user portfolio retrieval and bid addition."""
    res = client.get('/api/portal/portfolio?userId=usr-1')
    assert res.status_code == 200
    assert res.get_json()['success'] is True
    assert len(res.get_json()['data']) > 0

    # Post addition
    post_res = client.post('/api/portal/portfolio?userId=usr-1', json={'bidNumber': 'GEM/2026/B/890123'})
    assert post_res.status_code == 201
    assert post_res.get_json()['success'] is True


def test_search_endpoint(client):
    """Verifies tender search by keyword."""
    res = client.get('/api/portal/search?q=Solar')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    assert len(json_data['data']) > 0
    assert any('solar' in b['title'].lower() for b in json_data['data'])


def test_alerts_endpoint(client):
    """Verifies PhonePe-style alerts endpoint."""
    res = client.get('/api/portal/alerts')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    assert len(json_data['data']) > 0
    alert = json_data['data'][0]
    assert 'type' in alert
    assert 'message' in alert
    assert 'bidNumber' in alert

