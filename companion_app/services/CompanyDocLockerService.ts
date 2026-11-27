/**
 * GeM Mobile Companion App - Reusable Company Document Locker Service
 *
 * Lets sellers store their 7 standard reusable GeM compliance documents ONCE
 * privately on-device (GST, PAN, Udyam/MSE, 3-Yr Turnover/UDIN, Past CRACs,
 * ISO/BIS, Bank Mandate) with optional expiry alerts, and automatically matches
 * them against every tender's required checklist & Eligibility Shield!
 */

import type { WorkspaceDocument } from '../types/index.ts';

const LOCKER_STORAGE_KEY = '@gem-mobile-companion/company-doc-locker-v1';
const LOCKER_DIR = 'gem-company-locker/';

export type CompanyDocSlotId =
  | 'GST'
  | 'PAN'
  | 'UDYAM'
  | 'TURNOVER'
  | 'EXPERIENCE'
  | 'ISO_QUALITY'
  | 'BANK_MANDATE';

export interface CompanyDocSlotMeta {
  id: CompanyDocSlotId;
  title: string;
  shortTag: string;
  hint: string;
  matchKeywords: RegExp;
  syntheticFilenameToken: string;
}

export interface CompanyLockerDocument {
  id: string;
  slotId: CompanyDocSlotId;
  name: string;
  uri: string;
  mimeType?: string;
  sizeBytes?: number;
  addedAtUtc: string;
  expiresAtIso?: string; // Optional YYYY-MM-DD expiry reminder
  persistence: 'PERSISTED' | 'SESSION_ONLY';
}

export type ExpiryStatus = 'NONE' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface LockerChecklistMatch {
  totalRequired: number;
  readyCount: number;
  matchedFromLocker: Array<{ requirement: string; doc: CompanyLockerDocument }>;
  matchedFromBidFiles: Array<{ requirement: string; fileName: string }>;
  missingRequirements: string[];
}

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface LocalFileSystem {
  documentDirectory?: string | null;
  makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
}

export interface PickedLockerAsset {
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
}

export const COMPANY_LOCKER_SLOTS: readonly CompanyDocSlotMeta[] = [
  {
    id: 'GST',
    title: 'GST Registration Certificate',
    shortTag: 'GST',
    hint: 'REG-06 certificate required across almost all GeM bids',
    matchKeywords: /\b(gst|gstin|tax\s*registration|statutory)\b/i,
    syntheticFilenameToken: 'GST_Registration_Certificate',
  },
  {
    id: 'PAN',
    title: 'Company / Proprietor PAN',
    shortTag: 'PAN',
    hint: 'Permanent Account Number copy for statutory compliance',
    matchKeywords: /\b(pan\b|income\s*tax|statutory)\b/i,
    syntheticFilenameToken: 'PAN_Card_Registration',
  },
  {
    id: 'UDYAM',
    title: 'Udyam MSME / Startup Certificate',
    shortTag: 'UDYAM',
    hint: 'Unlocks MSE purchase preference & OEM EMD exemption checks',
    matchKeywords: /\b(udyam|msme|mse|startup|dpiit|exemption|registration)\b/i,
    syntheticFilenameToken: 'Udyam_MSME_Registration_Certificate',
  },
  {
    id: 'TURNOVER',
    title: '3-Yr Audited Turnover / CA UDIN',
    shortTag: 'CA UDIN',
    hint: 'Audited balance sheets or CA Average Annual Turnover certificate',
    matchKeywords: /\b(turnover|auditor|audited|balance\s*sheet|ca\s*cert|udin|financial|itr)\b/i,
    syntheticFilenameToken: 'CA_Turnover_Certificate_UDIN',
  },
  {
    id: 'EXPERIENCE',
    title: 'Past GeM Contracts & CRACs',
    shortTag: 'CRAC',
    hint: 'Executed government/PSU orders & CRAC completion proofs',
    matchKeywords: /\b(experience|past\s*performance|crac|contract|completion|work\s*order|supply\s*order)\b/i,
    syntheticFilenameToken: 'Past_Orders_CRAC_Experience',
  },
  {
    id: 'ISO_QUALITY',
    title: 'ISO / BIS / Quality Certificates',
    shortTag: 'ISO / BIS',
    hint: 'ISO 9001, BIS/ISI license, NABL test report, or FSSAI',
    matchKeywords: /\b(iso|bis|isi|nabl|quality|certificate\s*\(requested|atc|test\s*report|fssai)\b/i,
    syntheticFilenameToken: 'ISO_BIS_Quality_Certificate',
  },
  {
    id: 'BANK_MANDATE',
    title: 'Cancelled Cheque / Bank Mandate',
    shortTag: 'BANK',
    hint: 'Bank account & IFSC verification for PFMS disbursements',
    matchKeywords: /\b(bank|cheque|mandate|neft|rtgs|pfms|emd)\b/i,
    syntheticFilenameToken: 'Bank_Mandate_Cancelled_Cheque',
  },
];

type LockerListener = (docs: CompanyLockerDocument[]) => void;

function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^[^a-zA-Z0-9]+/, '')
      .slice(0, 100) || 'document'
  );
}

export class CompanyDocLockerService {
  public static readonly storageKey = LOCKER_STORAGE_KEY;

  private static docs: CompanyLockerDocument[] = [];
  private static hydrated = false;
  private static listeners = new Set<LockerListener>();
  private static customStorage: KeyValueStorage | null = null;
  private static customFs: LocalFileSystem | null = null;

  public static setAdaptersForTests(
    storage: KeyValueStorage | null,
    fs: LocalFileSystem | null = null
  ): void {
    this.customStorage = storage;
    this.customFs = fs;
    this.docs = [];
    this.hydrated = false;
  }

  public static subscribe(listener: LockerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static emit(): void {
    const snap = [...this.docs];
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch {
        // Isolate subscriber errors
      }
    }
  }

  public static getDocuments(): CompanyLockerDocument[] {
    return [...this.docs];
  }

  public static getDocumentForSlot(slotId: CompanyDocSlotId): CompanyLockerDocument | undefined {
    return this.docs.find((d) => d.slotId === slotId);
  }

  public static getExpiryStatus(expiresAtIso?: string, now = new Date()): ExpiryStatus {
    if (!expiresAtIso || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAtIso.trim())) return 'NONE';
    const expiry = new Date(`${expiresAtIso.trim()}T23:59:59Z`);
    if (Number.isNaN(expiry.getTime())) return 'NONE';
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 30) return 'EXPIRING_SOON';
    return 'VALID';
  }

  public static async hydrate(force = false): Promise<CompanyLockerDocument[]> {
    if (this.hydrated && !force) return this.getDocuments();

    const storage = await this.getStorage();
    if (!storage) {
      this.hydrated = true;
      return this.getDocuments();
    }

    try {
      const raw = await storage.getItem(LOCKER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.docs = parsed.filter(this.isValidDoc);
        }
      } else {
        this.docs = [];
      }
    } catch {
      this.docs = [];
    }

    this.hydrated = true;
    this.emit();
    return this.getDocuments();
  }

  public static async saveSlotDocument(
    slotId: CompanyDocSlotId,
    asset: PickedLockerAsset,
    expiresAtIso?: string
  ): Promise<CompanyLockerDocument> {
    const storage = await this.getStorage();
    const fs = await this.getFileSystem();
    const docDir = fs?.documentDirectory?.replace(/\/?$/, '/');

    const id = `locker-${slotId.toLowerCase()}-${Date.now()}`;
    let uri = asset.uri;
    let persistence: 'PERSISTED' | 'SESSION_ONLY' = 'SESSION_ONLY';

    if (fs && docDir) {
      try {
        await fs.makeDirectoryAsync(docDir + LOCKER_DIR, { intermediates: true });
        const dest = `${docDir}${LOCKER_DIR}${id}-${sanitizeName(asset.name)}`;
        await fs.copyAsync({ from: asset.uri, to: dest });
        uri = dest;
        persistence = 'PERSISTED';
      } catch {
        // Keep picker URI for current session
      }
    }

    // Remove previous copy in the same slot if present
    const previous = this.docs.find((d) => d.slotId === slotId);
    if (previous && fs && docDir && previous.uri.startsWith(docDir + LOCKER_DIR)) {
      await fs.deleteAsync(previous.uri, { idempotent: true }).catch(() => undefined);
    }

    const record: CompanyLockerDocument = {
      id,
      slotId,
      name: asset.name.trim() || `${slotId}.pdf`,
      uri,
      mimeType: asset.mimeType,
      sizeBytes: asset.size,
      addedAtUtc: new Date().toISOString(),
      expiresAtIso: expiresAtIso?.trim() || undefined,
      persistence,
    };

    this.docs = [record, ...this.docs.filter((d) => d.slotId !== slotId)];
    this.hydrated = true;

    if (storage) {
      await storage.setItem(LOCKER_STORAGE_KEY, JSON.stringify(this.docs)).catch(() => undefined);
    }

    this.emit();
    return record;
  }

  public static async updateExpiry(slotId: CompanyDocSlotId, expiresAtIso?: string): Promise<void> {
    const clean = expiresAtIso?.trim() || undefined;
    this.docs = this.docs.map((d) =>
      d.slotId === slotId ? { ...d, expiresAtIso: clean } : d
    );
    const storage = await this.getStorage();
    if (storage) {
      await storage.setItem(LOCKER_STORAGE_KEY, JSON.stringify(this.docs)).catch(() => undefined);
    }
    this.emit();
  }

  public static async removeSlotDocument(slotId: CompanyDocSlotId): Promise<void> {
    const existing = this.docs.find((d) => d.slotId === slotId);
    const fs = await this.getFileSystem();
    const docDir = fs?.documentDirectory?.replace(/\/?$/, '/');
    if (existing && fs && docDir && existing.uri.startsWith(docDir + LOCKER_DIR)) {
      await fs.deleteAsync(existing.uri, { idempotent: true }).catch(() => undefined);
    }

    this.docs = this.docs.filter((d) => d.slotId !== slotId);
    const storage = await this.getStorage();
    if (storage) {
      await storage.setItem(LOCKER_STORAGE_KEY, JSON.stringify(this.docs)).catch(() => undefined);
    }
    this.emit();
  }

  /**
   * Projects active non-expired Company Locker files as synthetic WorkspaceDocuments
   * so DisqualificationShieldEngine automatically credits reusable GST/Udyam/Turnover/CRAC proofs.
   */
  public static toWorkspaceDocuments(
    lockerDocs: CompanyLockerDocument[] = this.docs,
    now = new Date()
  ): WorkspaceDocument[] {
    return lockerDocs
      .filter((doc) => this.getExpiryStatus(doc.expiresAtIso, now) !== 'EXPIRED')
      .map((doc) => {
        const slot = COMPANY_LOCKER_SLOTS.find((s) => s.id === doc.slotId);
        const token = slot?.syntheticFilenameToken || doc.slotId;
        return {
          id: doc.id,
          name: `${token}_${doc.name}`,
          uri: doc.uri,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          addedAtUtc: doc.addedAtUtc,
          kind: doc.slotId === 'EXPERIENCE' ? 'TECHNICAL' : 'COMPLIANCE',
          source: 'DEVICE_PICKER',
          persistence: doc.persistence,
        };
      });
  }

  /**
   * Auto-matches tender required document names against BOTH Company Locker slots
   * and bid-specific uploaded files so sellers instantly see how many docs are already ready.
   */
  public static matchBidChecklistWithLocker(
    requiredDocuments: string[] = [],
    bidSpecificDocs: WorkspaceDocument[] = [],
    lockerDocs: CompanyLockerDocument[] = this.docs,
    now = new Date()
  ): LockerChecklistMatch {
    const activeLocker = lockerDocs.filter(
      (doc) => this.getExpiryStatus(doc.expiresAtIso, now) !== 'EXPIRED'
    );
    const matchedFromLocker: Array<{ requirement: string; doc: CompanyLockerDocument }> = [];
    const matchedFromBidFiles: Array<{ requirement: string; fileName: string }> = [];
    const missingRequirements: string[] = [];

    for (const req of requiredDocuments) {
      const reqLower = req.toLowerCase();

      // 1. Check bid-specific files first
      const bidFile = bidSpecificDocs.find((d) => {
        const n = (d.name || '').toLowerCase();
        const tokens = reqLower.split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
        return tokens.some((tok) => n.includes(tok));
      });
      if (bidFile) {
        matchedFromBidFiles.push({ requirement: req, fileName: bidFile.name });
        continue;
      }

      // 2. Auto-match against reusable Company Locker slots
      const lockerMatch = activeLocker.find((doc) => {
        const slot = COMPANY_LOCKER_SLOTS.find((s) => s.id === doc.slotId);
        if (slot && slot.matchKeywords.test(req)) return true;
        const n = doc.name.toLowerCase();
        const tokens = reqLower.split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
        return tokens.some((tok) => n.includes(tok));
      });

      if (lockerMatch) {
        matchedFromLocker.push({ requirement: req, doc: lockerMatch });
      } else {
        missingRequirements.push(req);
      }
    }

    return {
      totalRequired: requiredDocuments.length,
      readyCount: matchedFromLocker.length + matchedFromBidFiles.length,
      matchedFromLocker,
      matchedFromBidFiles,
      missingRequirements,
    };
  }

  private static isValidDoc(val: unknown): val is CompanyLockerDocument {
    if (!val || typeof val !== 'object') return false;
    const c = val as Partial<CompanyLockerDocument>;
    return (
      typeof c.id === 'string' &&
      typeof c.slotId === 'string' &&
      typeof c.name === 'string' &&
      typeof c.uri === 'string' &&
      typeof c.addedAtUtc === 'string'
    );
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

  private static async getFileSystem(): Promise<LocalFileSystem | null> {
    if (this.customFs) return this.customFs;
    try {
      const mod = await import('expo-file-system');
      return mod as unknown as LocalFileSystem;
    } catch {
      return null;
    }
  }
}
