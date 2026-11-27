/**
 * GeM Mobile Companion App - Bilingual UI Strings (English / हिन्दी) & GeM Jargon Glossary
 *
 * Makes government procurement accessible to MSME & regional sellers across India:
 * - Persisted UI language preference ('en' | 'hi') stored privately on device.
 * - 14 official GeM procurement terms with plain 2-line explainers in BOTH English & Hindi.
 */

export type AppLanguage = 'en' | 'hi';

export interface GemGlossaryEntry {
  key: string;
  term: string;
  fullNameEn: string;
  fullNameHi: string;
  summaryEn: string;
  summaryHi: string;
  tipEn: string;
  tipHi: string;
}

export const GEM_GLOSSARY_ENTRIES: readonly GemGlossaryEntry[] = [
  {
    key: 'EMD',
    term: 'EMD',
    fullNameEn: 'Earnest Money Deposit',
    fullNameHi: 'अर्नेस्ट मनी डिपॉज़िट (बयाना राशि)',
    summaryEn: 'Refundable bid security deposit required by a buyer to ensure serious participation.',
    summaryHi: 'गंभीर बोली सुनिश्चित करने के लिए खरीदार द्वारा मांगी गई वापसी योग्य सुरक्षा राशि।',
    tipEn: 'MSE exemption on Goods applies ONLY to OEM Manufacturers with valid Udyam — not traders.',
    tipHi: 'माल (Goods) में MSE छूट केवल वैध उद्यम वाले OEM निर्माता को मिलती है, ट्रेडर को नहीं।',
  },
  {
    key: 'EPBG',
    term: 'e-PBG',
    fullNameEn: 'Electronic Performance Bank Guarantee',
    fullNameHi: 'इलेक्ट्रॉनिक परफॉर्मेंस बैंक गारंटी',
    summaryEn: 'Post-award security (typically 3%–5% of contract value) furnished only by the winning L1 bidder.',
    summaryHi: 'टेंडर जीतने वाले L1 विक्रेता द्वारा अनुबंध के बाद दी जाने वाली सुरक्षा गारंटी (आमतौर पर 3%–5%)।',
    tipEn: 'Factor the e-PBG lock-in months into your working capital before quoting.',
    tipHi: 'बोली लगाने से पहले e-PBG की अवधि को अपनी कार्यशील पूंजी में जोड़कर देखें।',
  },
  {
    key: 'MII',
    term: 'MII',
    fullNameEn: 'Make in India Local Content Preference',
    fullNameHi: 'मेक इन इंडिया स्थानीय सामग्री प्राथमिकता',
    summaryEn: 'Class-1 suppliers (≥50% Indian local content) and Class-2 (≥20%) receive purchase preference.',
    summaryHi: 'क्लास-1 (≥50% भारतीय सामग्री) और क्लास-2 (≥20%) आपूर्तिकर्ताओं को सरकारी खरीद में प्राथमिकता मिलती है।',
    tipEn: 'Always upload a signed MII local content self-declaration on company letterhead.',
    tipHi: 'कंपनी लेटरहेड पर हस्ताक्षरित MII स्व-घोषणा पत्र अवश्य अपलोड करें।',
  },
  {
    key: 'ATC',
    term: 'ATC',
    fullNameEn: 'Additional Terms and Conditions',
    fullNameHi: 'अतिरिक्त नियम एवं शर्तें (खरीदार द्वारा जोड़ी गईं)',
    summaryEn: 'Buyer-specific clauses appended to a bid PDF covering ISO/BIS certs, samples, warranty, or service centers.',
    summaryHi: 'खरीदार द्वारा जोड़ी गई विशेष शर्तें जैसे ISO/BIS प्रमाणपत्र, सैंपल, वारंटी या लोकल सर्विस सेंटर।',
    tipEn: 'Most technical rejections happen due to missed ATC clauses — always scan ATC before quoting.',
    tipHi: 'अधिकांश तकनीकी अस्वीकृतियां ATC शर्तें छूटने से होती हैं — बोली से पहले ATC अवश्य जांचें।',
  },
  {
    key: 'RA',
    term: 'RA',
    fullNameEn: 'Reverse Auction',
    fullNameHi: 'रिवर्स ऑक्शन (उलटी नीलामी)',
    summaryEn: 'Live price-bidding stage after technical qualification where sellers compete by lowering prices toward L1.',
    summaryHi: 'तकनीकी योग्यता के बाद लाइव कीमत घटाने की प्रक्रिया, जहां सबसे कम कीमत (L1) वाला जीतता है।',
    tipEn: 'Calculate your Hard Walk-Away Floor Price beforehand so you never panic-bid at a loss.',
    tipHi: 'नीलामी से पहले अपना न्यूनतम सुरक्षित भाव (Floor Price) तय कर लें ताकि घाटे में बोली न लगे।',
  },
  {
    key: 'BOQ',
    term: 'BOQ',
    fullNameEn: 'Bill of Quantities',
    fullNameHi: 'बिल ऑफ़ क्वांटिटीज़ (मात्रा सूची)',
    summaryEn: 'Itemized schedule listing exact product specifications, units, and quantities required by the buyer.',
    summaryHi: 'खरीदार द्वारा मांगी गई वस्तुओं, तकनीकी विवरण और कुल मात्रा की विस्तृत सूची।',
    tipEn: 'Verify each BOQ row & attached Excel sheet so no accessory or installation cost is missed.',
    tipHi: 'हर BOQ पंक्ति और संलग्न एक्सेल शीट की जांच करें ताकि कोई खर्च छूट न जाए।',
  },
  {
    key: 'CRAC',
    term: 'CRAC',
    fullNameEn: 'Consignee Receipt and Acceptance Certificate',
    fullNameHi: 'प्राप्तकर्ता रसीद एवं स्वीकृति प्रमाणपत्र',
    summaryEn: 'Official acceptance document issued after delivery & inspection that triggers seller payment.',
    summaryHi: 'डिलीवरी और जांच के बाद जारी स्वीकृति प्रमाणपत्र, जिसके बाद विक्रेता का भुगतान शुरू होता है।',
    tipEn: 'Save your past CRAC PDFs in Company Doc Locker — buyers accept them as Experience Proof.',
    tipHi: 'पुराने CRAC PDF कंपनी लॉकर में सहेजें — नए टेंडर में यह अनुभव प्रमाण के रूप में काम आते हैं।',
  },
  {
    key: 'MSE',
    term: 'MSE',
    fullNameEn: 'Micro & Small Enterprise (Udyam)',
    fullNameHi: 'सूक्ष्म एवं लघु उद्यम (उद्यम पंजीकृत)',
    summaryEn: 'Registered Micro/Small enterprises eligible for purchase preference (L1+15% matching) and relaxations.',
    summaryHi: 'पंजीकृत सूक्ष्म/लघु उद्यम जिन्हें L1+15% खरीद प्राथमिकता और पात्रता में छूट मिलती है।',
    tipEn: 'Keep your latest Udyam Registration PDF updated in Company Doc Locker.',
    tipHi: 'अपना नवीनतम उद्यम प्रमाणपत्र हमेशा कंपनी डॉक लॉकर में अपडेट रखें।',
  },
  {
    key: 'UDIN',
    term: 'UDIN',
    fullNameEn: 'Unique Document Identification Number (ICAI)',
    fullNameHi: 'यूनिक डॉक्यूमेंट आइडेंटिफिकेशन नंबर (ICAI)',
    summaryEn: 'Mandatory 18-digit ICAI verification number printed on Chartered Accountant turnover certificates.',
    summaryHi: 'चार्टर्ड अकाउंटेंट के टर्नओवर प्रमाणपत्र पर अनिवार्य 18-अंकों की ICAI सत्यापन संख्या।',
    tipEn: 'Turnover certificates without a valid UDIN are frequently rejected during technical evaluation.',
    tipHi: 'बिना वैध UDIN के टर्नओवर प्रमाणपत्र तकनीकी मूल्यांकन में अक्सर अस्वीकार कर दिए जाते हैं।',
  },
  {
    key: 'MAF',
    term: 'MAF',
    fullNameEn: 'Manufacturer Authorization Form',
    fullNameHi: 'निर्माता प्राधिकरण पत्र (OEM अनुमति)',
    summaryEn: 'Bid-specific letter from the Original Equipment Manufacturer authorizing a reseller/dealer to quote.',
    summaryHi: 'मूल निर्माता (OEM) द्वारा डीलर/रीसेलर को विशेष टेंडर में बोली लगाने हेतु दिया गया अनुमति पत्र।',
    tipEn: 'Use our 1-tap "Ask OEM (MAF)" WhatsApp brief to request MAF citing the exact Bid Number.',
    tipHi: 'सटीक बिड नंबर के साथ MAF मांगने के लिए हमारे "Ask OEM" व्हाट्सऐप ब्रीफ का उपयोग करें।',
  },
  {
    key: 'GFR_149',
    term: 'GFR 149',
    fullNameEn: 'General Financial Rules — Rule 149 (GeM Buying Modes)',
    fullNameHi: 'सामान्य वित्तीय नियम 149 (GeM खरीद सीमाएं)',
    summaryEn: 'Defines when govt buyers can use Direct Purchase, 3-OEM L1 Comparison, or Mandatory Bid/RA.',
    summaryHi: 'तय करता है कि सरकारी खरीदार कब सीधी खरीद, 3-OEM L1 तुलना या अनिवार्य बिड/RA करेंगे।',
    tipEn: 'Use the GFR 149 Helper in Search to verify thresholds and 3 distinct OEMs before buying.',
    tipHi: 'खरीद से पहले सीमा और 3 अलग OEM जांचने के लिए Search में GFR 149 हेल्पर का उपयोग करें।',
  },
  {
    key: 'L1',
    term: 'L1',
    fullNameEn: 'Lowest Evaluated Technically Qualified Bidder',
    fullNameHi: 'सबसे कम कीमत वाला तकनीकी रूप से योग्य बोलीदाता',
    summaryEn: 'The bidder who passes technical evaluation and quotes the lowest total landed GST-inclusive price.',
    summaryHi: 'वह बोलीदाता जो तकनीकी जांच पास करता है और GST सहित सबसे कम कुल कीमत देता है।',
    tipEn: 'GeM always evaluates prices inclusive of GST, packing, freight, and installation.',
    tipHi: 'GeM पर कीमत का मूल्यांकन हमेशा GST, पैकिंग, भाड़ा और इंस्टॉलेशन सहित किया जाता है।',
  },
  {
    key: 'OPTION_CLAUSE',
    term: 'Option Clause',
    fullNameEn: '±25% Quantity Variation Clause',
    fullNameHi: '±25% मात्रा परिवर्तन विकल्प खंड',
    summaryEn: 'Allows the buyer to increase or decrease contracted quantity by up to 25% at the same unit rate.',
    summaryHi: 'खरीदार को उसी दर पर अनुबंध की मात्रा को 25% तक बढ़ाने या घटाने का अधिकार देता है।',
    tipEn: 'Ensure your supplier can honor up to 125% quantity at your quoted rate.',
    tipHi: 'सुनिश्चित करें कि आपका सप्लायर उसी कीमत पर 125% तक माल दे सकता है।',
  },
  {
    key: 'CORRIGENDUM',
    term: 'Corrigendum',
    fullNameEn: 'Official Tender Amendment / Extension',
    fullNameHi: 'आधिकारिक टेंडर संशोधन / तिथि विस्तार',
    summaryEn: 'Buyer-issued update modifying specs, eligibility rules, or extending the bid closing date.',
    summaryHi: 'खरीदार द्वारा जारी अपडेट जिसमें तकनीकी शर्तें, पात्रता या अंतिम तिथि बदली जाती है।',
    tipEn: 'Watch important tenders on Home so you can probe live corrigenda in 1 tap.',
    tipHi: 'होम पर महत्वपूर्ण टेंडर Watch करें ताकि एक टैप में नए संशोधन (Corrigendum) जांच सकें।',
  },
];

export type UiTextKey =
  | 'tabHome'
  | 'tabSearch'
  | 'tabBids'
  | 'tabAuctions'
  | 'tabMore'
  | 'findBid'
  | 'portal'
  | 'homeHeroTitle'
  | 'homeHeroSub'
  | 'homeSearchPlaceholder'
  | 'watchedTenders'
  | 'myDailyRadar'
  | 'quickAccess'
  | 'yourWorkspace'
  | 'registrationSupport'
  | 'displayComfort'
  | 'languageLabel'
  | 'languageSub'
  | 'businessProfile'
  | 'companyDocLocker'
  | 'jargonGuide'
  | 'keyTenderTerms'
  | 'officialDocuments'
  | 'atcAndSearch'
  | 'similarConcludedBids';

const TRANSLATIONS: Record<AppLanguage, Record<UiTextKey, string>> = {
  en: {
    tabHome: 'Home',
    tabSearch: 'Search',
    tabBids: 'Bids',
    tabAuctions: 'Auctions',
    tabMore: 'More',
    findBid: 'Find Bid',
    portal: 'Portal ↗',
    homeHeroTitle: 'Procurement, made simpler',
    homeHeroSub: 'Discover live tenders, products, services, and buyer attachments directly from GeM.',
    homeSearchPlaceholder: 'Search products, services, bids or contracts',
    watchedTenders: 'Watched Tenders',
    myDailyRadar: 'My Daily Tender Radar',
    quickAccess: 'Quick access',
    yourWorkspace: 'YOUR WORKSPACE',
    registrationSupport: 'REGISTRATION & SUPPORT',
    displayComfort: 'DISPLAY & COMFORT',
    languageLabel: 'Language',
    languageSub: 'English or हिन्दी (Hindi) interface',
    businessProfile: 'My Business Profile',
    companyDocLocker: 'Company Doc Locker',
    jargonGuide: 'GeM Jargon Guide (?)',
    keyTenderTerms: 'Key Tender Terms',
    officialDocuments: 'Official Documents',
    atcAndSearch: 'ATC Traps & PDF Search',
    similarConcludedBids: 'Similar Concluded Bids',
  },
  hi: {
    tabHome: 'होम',
    tabSearch: 'खोजें',
    tabBids: 'निविदाएं',
    tabAuctions: 'नीलामी',
    tabMore: 'अधिक',
    findBid: 'बिड खोजें',
    portal: 'पोर्टल ↗',
    homeHeroTitle: 'सरकारी खरीद, अब सरल',
    homeHeroSub: 'GeM से सीधे लाइव टेंडर, उत्पाद, सेवाएं और खरीदार दस्तावेज़ देखें।',
    homeSearchPlaceholder: 'उत्पाद, सेवाएं, बिड या अनुबंध खोजें',
    watchedTenders: 'वॉच किए गए टेंडर',
    myDailyRadar: 'मेरा दैनिक टेंडर रडार',
    quickAccess: 'त्वरित पहुंच',
    yourWorkspace: 'आपका कार्यक्षेत्र',
    registrationSupport: 'पंजीकरण एवं सहायता',
    displayComfort: 'डिस्प्ले एवं भाषा',
    languageLabel: 'भाषा / Language',
    languageSub: 'English या हिन्दी चुनें',
    businessProfile: 'मेरा बिज़नेस प्रोफ़ाइल',
    companyDocLocker: 'कंपनी डॉक लॉकर',
    jargonGuide: 'GeM शब्दावली गाइड (?)',
    keyTenderTerms: 'प्रमुख टेंडर शर्तें',
    officialDocuments: 'आधिकारिक दस्तावेज़',
    atcAndSearch: 'ATC शर्तें और PDF खोज',
    similarConcludedBids: 'समान समाप्त निविदाएं',
  },
};

const LANGUAGE_STORAGE_KEY = '@gem-mobile-companion/ui-language-v1';

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class LanguageAndGlossaryService {
  public static readonly storageKey = LANGUAGE_STORAGE_KEY;
  private static customStorage: KeyValueStorage | null = null;

  public static setStorageAdapterForTests(storage: KeyValueStorage | null): void {
    this.customStorage = storage;
  }

  public static translate(lang: AppLanguage, key: UiTextKey): string {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key];
  }

  public static findGlossaryEntry(keyOrTerm: string): GemGlossaryEntry | undefined {
    const clean = keyOrTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return GEM_GLOSSARY_ENTRIES.find(
      (entry) =>
        entry.key.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
        entry.term.toLowerCase().replace(/[^a-z0-9]/g, '') === clean
    );
  }

  public static async loadLanguage(): Promise<AppLanguage> {
    const storage = await this.getStorage();
    if (!storage) return 'en';
    try {
      const saved = await storage.getItem(LANGUAGE_STORAGE_KEY);
      return saved === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  }

  public static async saveLanguage(lang: AppLanguage): Promise<void> {
    const storage = await this.getStorage();
    if (!storage) return;
    await storage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => undefined);
  }

  private static async getStorage(): Promise<KeyValueStorage | null> {
    if (this.customStorage) return this.customStorage;
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      return (mod.default || mod) as unknown as KeyValueStorage;
    } catch {
      return null;
    }
  }
}
