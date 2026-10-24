"""
GeM Portal & Official Tenders Ingestion Service
Aggregates live opportunities from bidplus.gem.gov.in and forwardauction.gem.gov.in.
Provides structured tender deconstruction, scoring, and market pulse analytics.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta


class GemPortalService:
    """Service providing deconstructed GeM bids, auctions, and portfolio intelligence."""

    @staticmethod
    def get_market_pulse() -> Dict[str, int]:
        """Returns glanceable market volume metrics."""
        return {
            "totalBidsToday": 1420,
            "liveReverseAuctions": 18,
            "liveForwardAuctions": 9,
            "closingIn24Hours": 34,
            "zeroEmdBids": 812,
        }

    @staticmethod
    def get_mock_bids() -> List[Dict[str, Any]]:
        """Returns realistic official GeM bids structured per DeconstructedBidDoc."""
        now = datetime.now(timezone.utc)
        return [
            {
                "bidNumber": "GEM/2026/B/890123",
                "title": "Supply and Commissioning of 40W Solar LED Street Lighting Systems",
                "department": "Department of Rural Development",
                "ministry": "Ministry of Rural Development",
                "type": "PRODUCT",
                "estimatedBidValueInr": 2800000,
                "emdAmountInr": 56000,
                "isEmdExemptForMse": True,
                "epbgPercentage": 3.0,
                "minAnnualTurnoverInr": 1500000,
                "yearsExperienceRequired": 2,
                "pastPerformancePercentage": 20,
                "deliveryPeriodDays": 45,
                "splittingRatio": "100% to L1",
                "makeInIndiaClass": "CLASS_1",
                "boqItems": [
                    {
                        "itemTitle": "40W Integrated Solar LED Street Light",
                        "quantity": 250,
                        "unit": "Units",
                        "specsSummary": "LiFePO4 battery 12.8V 30Ah, 6500K CCT, IP65 die-cast aluminum housing"
                    },
                    {
                        "itemTitle": "6-Meter Octagonal Galvanized Pole with Bracket",
                        "quantity": 250,
                        "unit": "Units",
                        "specsSummary": "Hot-dip galvanized min 86 microns, MS base plate with J-bolts"
                    }
                ],
                "consignees": [
                    {
                        "location": "Varanasi Central Stores",
                        "state": "Uttar Pradesh",
                        "pincode": "221002",
                        "quantity": 150,
                        "reportingOfficer": "Executive Engineer (Rural)"
                    },
                    {
                        "location": "Prayagraj Regional Yard",
                        "state": "Uttar Pradesh",
                        "pincode": "211001",
                        "quantity": 100,
                        "reportingOfficer": "Assistant Engineer (Stores)"
                    }
                ],
                "requiredDocuments": [
                    "Udyam MSE Certificate",
                    "Chartered Accountant Audited Turnover Certificate (3 FY)",
                    "OEM Authorization Certificate (MAF)",
                    "BIS / MNRE Type Test Certificate"
                ],
                "closingTimeUtc": (now + timedelta(days=4)).isoformat(),
                "docUrl": "https://bidplus.gem.gov.in/showbidDocument/890123.pdf",
                "matchScore": 94,
                "verdictTag": "HIGH_MATCH",
                "verdictSummary": "100% category match for Solar LED. EMD waived for your MSE registration. Turnover criteria (₹15L) easily met."
            },
            {
                "bidNumber": "GEM/2026/B/890456",
                "title": "Industrial Grade Unmanaged Gigabit PoE Switches (24-Port)",
                "department": "Western Railway Headquarters",
                "ministry": "Ministry of Railways",
                "type": "PRODUCT",
                "estimatedBidValueInr": 4200000,
                "emdAmountInr": 84000,
                "isEmdExemptForMse": True,
                "epbgPercentage": 5.0,
                "minAnnualTurnoverInr": 3000000,
                "yearsExperienceRequired": 3,
                "pastPerformancePercentage": 30,
                "deliveryPeriodDays": 30,
                "splittingRatio": "70:30 MSE Preference",
                "makeInIndiaClass": "CLASS_1",
                "boqItems": [
                    {
                        "itemTitle": "24-Port Gigabit L2 PoE+ Industrial Switch",
                        "quantity": 80,
                        "unit": "Units",
                        "specsSummary": "370W PoE budget, operating temp -40°C to +75°C, dual redundant DC power"
                    }
                ],
                "consignees": [
                    {
                        "location": "Signal & Telecom Yard, Mumbai Central",
                        "state": "Maharashtra",
                        "pincode": "400008",
                        "quantity": 80,
                        "reportingOfficer": "Sr. Divisional Signal & Telecom Engineer"
                    }
                ],
                "requiredDocuments": [
                    "OEM Authorization (MAF)",
                    "Past Performance Invoices (Min 24 units supplied)",
                    "RDSO / CE / FCC Compliance Certificate",
                    "GST Registration Certificate"
                ],
                "closingTimeUtc": (now + timedelta(hours=18)).isoformat(),
                "docUrl": "https://bidplus.gem.gov.in/showbidDocument/890456.pdf",
                "matchScore": 88,
                "verdictTag": "HIGH_MATCH",
                "verdictSummary": "High match for Network Hardware. Closing soon (18h left). 70:30 MSE purchase preference available."
            },
            {
                "bidNumber": "GEM/2026/B/891102",
                "title": "Custom Heavy Duty High-Tensile Fasteners & Anchorage Bolts",
                "department": "Border Roads Organisation (BRO)",
                "ministry": "Ministry of Defence",
                "type": "CUSTOM",
                "estimatedBidValueInr": 7800000,
                "emdAmountInr": 156000,
                "isEmdExemptForMse": False,
                "epbgPercentage": 5.0,
                "minAnnualTurnoverInr": 8000000,
                "yearsExperienceRequired": 5,
                "pastPerformancePercentage": 40,
                "deliveryPeriodDays": 60,
                "splittingRatio": "100% to L1",
                "makeInIndiaClass": "CLASS_1",
                "boqItems": [
                    {
                        "itemTitle": "Grade 10.9 Structural Bolts M36 x 300mm",
                        "quantity": 5000,
                        "unit": "Sets",
                        "specsSummary": "IS 1367 compliant, hot-dip galvanized coating, with double washers and nyloc nuts"
                    }
                ],
                "consignees": [
                    {
                        "location": "BRO Supply Depot Rishikesh",
                        "state": "Uttarakhand",
                        "pincode": "249201",
                        "quantity": 5000,
                        "reportingOfficer": "Commander 21 BRTF"
                    }
                ],
                "requiredDocuments": [
                    "NABL Accredited Lab Test Certificate",
                    "5 Years Past Experience in Defence/Infrastructure Supply",
                    "Bank Solvency Certificate (₹50 Lakhs)"
                ],
                "closingTimeUtc": (now + timedelta(days=8)).isoformat(),
                "docUrl": "https://bidplus.gem.gov.in/showbidDocument/891102.pdf",
                "matchScore": 42,
                "verdictTag": "DISQUALIFIED",
                "verdictSummary": "Turnover threshold (₹80L) and 5-year experience requirement exceed your current profile. EMD is mandatory."
            }
        ]

    @classmethod
    def get_feed(
        cls,
        user_id: Optional[str] = None,
        category: Optional[str] = None,
        state: Optional[str] = None,
        min_score: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Filters and ranks tenders based on match criteria."""
        bids = cls.get_mock_bids()

        if category:
            cat = category.lower().strip()
            cat_keywords = {
                "railways": ["railway", "rail", "switches"],
                "defence": ["defence", "defense", "bro", "ordnance", "fasteners"],
                "solar": ["solar", "led", "lighting"],
                "healthcare": ["health", "hospital", "medical"],
                "it": ["network", "poe", "server", "switch", "telecom"]
            }.get(cat, [cat])

            bids = [
                b for b in bids
                if any(
                    kw in b.get("title", "").lower()
                    or kw in b.get("department", "").lower()
                    or kw in b.get("ministry", "").lower()
                    for kw in cat_keywords
                )
            ]

        if state:
            bids = [
                b for b in bids
                if any(c.get("state", "").lower() == state.lower() for c in b.get("consignees", []))
            ]

        if min_score is not None:
            bids = [b for b in bids if b.get("matchScore", 0) >= min_score]

        # Rank by matchScore descending
        bids.sort(key=lambda x: x.get("matchScore", 0), reverse=True)
        return bids

    @classmethod
    def search_bids(cls, query: str) -> List[Dict[str, Any]]:
        """Searches tenders matching keyword across title, department, or bid number."""
        if not query or not query.strip():
            return cls.get_mock_bids()

        q = query.lower().strip()
        bids = cls.get_mock_bids()
        return [
            b for b in bids
            if q in b.get("title", "").lower()
            or q in b.get("department", "").lower()
            or q in b.get("ministry", "").lower()
            or q in b.get("bidNumber", "").lower()
            or any(q in item.get("itemTitle", "").lower() for item in b.get("boqItems", []))
        ]

    @staticmethod
    def get_alerts() -> List[Dict[str, Any]]:
        """Returns real-time notifications for the PhonePe Alerts tab."""
        now = datetime.now(timezone.utc)
        return [
            {
                "id": "alert-1",
                "title": "Corrigendum Issued",
                "type": "CORRIGENDUM",
                "bidNumber": "GEM/2026/B/890456",
                "message": "Delivery period extended by 15 days for Western Railway Gigabit PoE Switches.",
                "timestamp": (now - timedelta(minutes=45)).isoformat(),
                "priority": "HIGH"
            },
            {
                "id": "alert-2",
                "title": "Outbid in Live Reverse Auction",
                "type": "OUTBID",
                "bidNumber": "GEM-2026-RA-99201",
                "message": "New L1 bid of ₹38,25,000 entered by Competitor #4. Counter-bid available.",
                "timestamp": (now - timedelta(hours=2)).isoformat(),
                "priority": "URGENT"
            },
            {
                "id": "alert-3",
                "title": "Tender Closing in < 24 Hours",
                "type": "CLOSING_SOON",
                "bidNumber": "GEM/2026/B/890456",
                "message": "Technical bid submission closes tomorrow at 18:00 IST. Ensure MAF is uploaded.",
                "timestamp": (now - timedelta(hours=4)).isoformat(),
                "priority": "NORMAL"
            }
        ]

    @classmethod
    def get_bid_fundamentals(cls, bid_number: str) -> Optional[Dict[str, Any]]:
        """Fetches a specific deconstructed tender by bid number."""
        bids = cls.get_mock_bids()
        for b in bids:
            if b["bidNumber"] == bid_number:
                return b
        # Fallback dynamic mock if not found
        return {
            "bidNumber": bid_number,
            "title": f"Procurement Contract for Consignment {bid_number}",
            "department": "Central Public Procurement Office",
            "ministry": "Government of India",
            "type": "PRODUCT",
            "estimatedBidValueInr": 2000000,
            "emdAmountInr": 40000,
            "isEmdExemptForMse": True,
            "epbgPercentage": 3.0,
            "minAnnualTurnoverInr": 1000000,
            "yearsExperienceRequired": 2,
            "pastPerformancePercentage": 25,
            "deliveryPeriodDays": 30,
            "splittingRatio": "100% to L1",
            "makeInIndiaClass": "CLASS_1",
            "boqItems": [{"itemTitle": "Standard Specified Consignment", "quantity": 100, "unit": "Units", "specsSummary": "Compliant with BIS guidelines"}],
            "consignees": [{"location": "Central Stores", "state": "Delhi", "pincode": "110001", "quantity": 100}],
            "requiredDocuments": ["Udyam MSE Certificate", "CA Audited Turnover Certificate"],
            "closingTimeUtc": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "docUrl": f"https://bidplus.gem.gov.in/showbidDocument/{bid_number}.pdf",
            "matchScore": 78,
            "verdictTag": "MODERATE_MATCH",
            "verdictSummary": "Standard match. EMD exempted under MSE policy."
        }

    @staticmethod
    def get_auctions(auction_type: str = "reverse") -> List[Dict[str, Any]]:
        """Returns live reverse auctions or forward e-scrap auctions."""
        now = datetime.now(timezone.utc)
        if auction_type == "forward":
            return [
                {
                    "id": "fa-lot-101",
                    "auctionNumber": "GEM/2026/FA/301",
                    "title": "Condemned Military Heavy Vehicles & Transport Trucks (Lot of 12)",
                    "department": "Army Base Workshop, Delhi Cantt",
                    "locationYard": "Central Ordnance Depot Yard 4, Delhi",
                    "reservePriceInr": 1850000,
                    "currentHighestBidInr": 2240000,
                    "minimumIncrementInr": 25000,
                    "closingTimeUtc": (now + timedelta(hours=3, minutes=45)).isoformat(),
                    "category": "VEHICLES"
                },
                {
                    "id": "fa-lot-102",
                    "auctionNumber": "GEM/2026/FA/302",
                    "title": "Heavy Copper Transformer Windings & Mixed Ferrous Scrap (35 MT)",
                    "department": "NTPC Dadri Thermal Power Plant",
                    "locationYard": "NTPC Scrap Yard, Gautam Buddha Nagar, UP",
                    "reservePriceInr": 4500000,
                    "currentHighestBidInr": 4950000,
                    "minimumIncrementInr": 50000,
                    "closingTimeUtc": (now + timedelta(hours=6, minutes=10)).isoformat(),
                    "category": "SCRAP_METAL"
                }
            ]
        
        # Default: reverse auctions
        return [
            {
                "id": "auc-7788",
                "contractNumber": "GEM-2026-RA-99201",
                "title": "High-Density Rugged Tactical Routers",
                "category": "Network & Telecommunications",
                "buyerOrganization": "Border Security Force (BSF)",
                "closingTimeUtc": (now + timedelta(minutes=45)).isoformat(),
                "currentLowestBid": 3850000,
                "sellerRank": 2,
                "sellerCurrentBid": 3900000,
                "minimumDecrement": 25000,
                "autoExtensionMinutes": 5,
                "isExtended": False
            },
            {
                "id": "auc-7789",
                "contractNumber": "GEM-2026-RA-99202",
                "title": "Energy-Efficient Brushless DC Ceiling Fans (5000 Units)",
                "department": "Central Public Works Department (CPWD)",
                "buyerOrganization": "CPWD Directorate General",
                "category": "Electrical Appliances",
                "closingTimeUtc": (now + timedelta(hours=2)).isoformat(),
                "currentLowestBid": 9200000,
                "sellerRank": 1,
                "sellerCurrentBid": 9200000,
                "minimumDecrement": 50000,
                "autoExtensionMinutes": 5,
                "isExtended": True
            }
        ]

    @staticmethod
    def get_portfolio(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns the user's active tracked and participated bids."""
        now = datetime.now(timezone.utc)
        return [
            {
                "bidNumber": "GEM/2026/B/881920",
                "itemTitle": "High-Tensile Structural Fasteners (M24 Grade 8.8)",
                "department": "Ministry of Defence (Ordnance Factory)",
                "quotedPriceInr": 4850000,
                "expectedL1BenchmarkInr": 4750000,
                "submittedAtUtc": (now - timedelta(days=2)).isoformat(),
                "stage": "TECHNICAL_EVALUATION",
                "currentRank": 1,
                "corrigendumCount": 1
            },
            {
                "bidNumber": "GEM/2026/B/877410",
                "itemTitle": "Server Rack Cabinets & PDU Units",
                "department": "National Informatics Centre (NIC)",
                "quotedPriceInr": 1820000,
                "expectedL1BenchmarkInr": 1800000,
                "submittedAtUtc": (now - timedelta(days=5)).isoformat(),
                "stage": "REVERSE_AUCTION",
                "currentRank": 2,
                "corrigendumCount": 0
            }
        ]
