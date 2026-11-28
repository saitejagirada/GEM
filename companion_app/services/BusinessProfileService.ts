/**
 * GeM Mobile Companion App - Private On-Device Business Profile Service
 *
 * Stores seller/firm eligibility criteria 100% locally in AsyncStorage so
 * DisqualificationShieldEngine can compute real Go / No-Go verdicts on every
 * opened GeM tender without any backend server, login, or pre-filled dummy PII.
 */

import type { MsmeCategory, UserAgentProfile } from '../types/index.ts';
import type { CompanyProfilePatch } from './CompanyDocExtractor.ts';

const PROFILE_STORAGE_KEY = '@gem-mobile-companion/business-profile-v1';

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface BusinessProfileInput {
  organizationName?: string;
  msmeCategory: MsmeCategory;
  annualTurnoverLakhs: number;
  yearsExperience: number;
  isOem: boolean;
  isServiceProvider?: boolean;
  hasUdyamCertificate: boolean;
  targetStates: string[];
  productCategories?: string[];
  gstin?: string;
  panNumber?: string;
  udyamNumber?: string;
  registeredAddress?: string;
  maxSingleOrderValueInr?: number;
  hasVerifiedUdin?: boolean;
}

export const INDIAN_STATES_AND_UTS: readonly string[] = [
  'Pan-India',
  'Delhi',
  'Maharashtra',
  'Uttar Pradesh',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'Rajasthan',
  'West Bengal',
  'Madhya Pradesh',
  'Haryana',
  'Punjab',
  'Kerala',
  'Bihar',
  'Odisha',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Jammu and Kashmir',
  'Himachal Pradesh',
  'Goa',
] as const;

export const TURNOVER_PRESETS_LAKHS: ReadonlyArray<{ label: string; lakhs: number }> = [
  { label: '₹25L', lakhs: 25 },
  { label: '₹50L', lakhs: 50 },
  { label: '₹1 Cr', lakhs: 100 },
  { label: '₹5 Cr', lakhs: 500 },
  { label: '₹10 Cr', lakhs: 1000 },
];

export const EXPERIENCE_PRESETS_YEARS: readonly number[] = [0, 1, 2, 3, 5, 10];

type ProfileListener = (profile: UserAgentProfile | null) => void;

const VALID_MSME: ReadonlySet<MsmeCategory> = new Set([
  'MICRO',
  'SMALL',
  'MEDIUM',
  'STARTUP',
  'LARGE',
]);

function normalizeStates(states: string[] | undefined): string[] {
  if (!Array.isArray(states) || states.length === 0) return ['Pan-India'];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of states) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (key === 'pan-india' || key === 'all india') {
      return ['Pan-India'];
    }
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(trimmed);
    }
  }
  return cleaned.length > 0 ? cleaned.slice(0, 12) : ['Pan-India'];
}

function sanitizeProfile(raw: Partial<UserAgentProfile> | null | undefined): UserAgentProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const msmeCategory: MsmeCategory = VALID_MSME.has(raw.msmeCategory as MsmeCategory)
    ? (raw.msmeCategory as MsmeCategory)
    : 'MICRO';

  const turnover = Number(raw.annualTurnoverInr);
  const safeTurnover = Number.isFinite(turnover) && turnover >= 0 ? Math.round(turnover) : 0;

  const exp = Number(raw.yearsExperience);
  const safeExp = Number.isFinite(exp) && exp >= 0 ? Math.min(60, Math.round(exp)) : 0;

  const isOem = Boolean(raw.isOem);
  const isServiceProvider = raw.isServiceProvider !== undefined ? Boolean(raw.isServiceProvider) : undefined;
  const hasUdyamCertificate = msmeCategory === 'LARGE' ? false : Boolean(raw.hasUdyamCertificate);
  const organizationName = String(raw.organizationName || '').trim().slice(0, 90);
  const targetStates = normalizeStates(raw.targetStates);
  const productCategories = Array.isArray(raw.productCategories)
    ? raw.productCategories
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const gstin = raw.gstin ? String(raw.gstin).trim().toUpperCase().slice(0, 15) : undefined;
  const panNumber = raw.panNumber ? String(raw.panNumber).trim().toUpperCase().slice(0, 10) : undefined;
  const udyamNumber = raw.udyamNumber ? String(raw.udyamNumber).trim().toUpperCase().slice(0, 22) : undefined;
  const registeredAddress = raw.registeredAddress
    ? String(raw.registeredAddress).trim().slice(0, 140)
    : undefined;
  const maxOrderRaw = Number(raw.maxSingleOrderValueInr);
  const maxSingleOrderValueInr =
    Number.isFinite(maxOrderRaw) && maxOrderRaw > 0 ? Math.round(maxOrderRaw) : undefined;
  const hasVerifiedUdin = raw.hasVerifiedUdin ? true : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : 'local-business-profile',
    organizationName,
    msmeCategory,
    annualTurnoverInr: safeTurnover,
    yearsExperience: safeExp,
    productCategories,
    targetStates,
    isOem,
    ...(isServiceProvider !== undefined ? { isServiceProvider } : {}),
    hasUdyamCertificate,
    ...(gstin ? { gstin } : {}),
    ...(panNumber ? { panNumber } : {}),
    ...(udyamNumber ? { udyamNumber } : {}),
    ...(registeredAddress ? { registeredAddress } : {}),
    ...(maxSingleOrderValueInr ? { maxSingleOrderValueInr } : {}),
    ...(hasVerifiedUdin ? { hasVerifiedUdin } : {}),
  };
}

export class BusinessProfileService {
  public static readonly storageKey = PROFILE_STORAGE_KEY;

  private static profile: UserAgentProfile | null = null;
  private static hydrated = false;
  private static listeners = new Set<ProfileListener>();
  private static customStorage: KeyValueStorage | null = null;

  /** Allows deterministic unit testing without native AsyncStorage. */
  public static setStorageAdapterForTests(storage: KeyValueStorage | null): void {
    this.customStorage = storage;
    this.profile = null;
    this.hydrated = false;
  }

  public static subscribe(listener: ProfileListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static emit(): void {
    const snap = this.profile ? { ...this.profile } : null;
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch {
        // Isolate subscriber errors
      }
    }
  }

  public static getProfile(): UserAgentProfile | null {
    return this.profile ? { ...this.profile } : null;
  }

  public static hasConfiguredProfile(): boolean {
    return this.profile !== null;
  }

  public static async hydrate(force = false): Promise<UserAgentProfile | null> {
    if (this.hydrated && !force) {
      return this.getProfile();
    }

    const storage = await this.getStorage();
    if (!storage) {
      this.hydrated = true;
      return this.getProfile();
    }

    try {
      const raw = await storage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserAgentProfile>;
        this.profile = sanitizeProfile(parsed);
      } else {
        this.profile = null;
      }
    } catch {
      this.profile = null;
    }

    this.hydrated = true;
    this.emit();
    return this.getProfile();
  }

  public static buildProfileFromInput(input: BusinessProfileInput): UserAgentProfile {
    const safeLakhs = Number.isFinite(input.annualTurnoverLakhs) && input.annualTurnoverLakhs >= 0
      ? input.annualTurnoverLakhs
      : 0;
    const sanitized = sanitizeProfile({
      id: 'local-business-profile',
      organizationName: input.organizationName || '',
      msmeCategory: input.msmeCategory,
      annualTurnoverInr: Math.round(safeLakhs * 100000),
      yearsExperience: input.yearsExperience,
      isOem: input.isOem,
      isServiceProvider: input.isServiceProvider,
      hasUdyamCertificate: input.hasUdyamCertificate,
      targetStates: input.targetStates,
      productCategories: input.productCategories || [],
      gstin: input.gstin,
      panNumber: input.panNumber,
      udyamNumber: input.udyamNumber,
      registeredAddress: input.registeredAddress,
      maxSingleOrderValueInr: input.maxSingleOrderValueInr,
      hasVerifiedUdin: input.hasVerifiedUdin,
    });

    return sanitized!;
  }

  public static async saveProfile(input: BusinessProfileInput): Promise<UserAgentProfile> {
    const existing = this.profile;
    const next = this.buildProfileFromInput({
      ...input,
      gstin: input.gstin ?? existing?.gstin,
      panNumber: input.panNumber ?? existing?.panNumber,
      udyamNumber: input.udyamNumber ?? existing?.udyamNumber,
      registeredAddress: input.registeredAddress ?? existing?.registeredAddress,
      maxSingleOrderValueInr: input.maxSingleOrderValueInr ?? existing?.maxSingleOrderValueInr,
      hasVerifiedUdin: input.hasVerifiedUdin ?? existing?.hasVerifiedUdin,
      isServiceProvider: input.isServiceProvider ?? existing?.isServiceProvider,
    });
    this.profile = next;
    this.hydrated = true;

    const storage = await this.getStorage();
    if (storage) {
      try {
        await storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep in-memory state active even if disk write fails
      }
    }

    this.emit();
    return { ...next };
  }

  /**
   * Merges user-confirmed fields extracted locally from an uploaded company PDF
   * (Udyam, GST REG-06, CA Turnover, or CRAC) into the saved Business Profile.
   */
  public static async applyExtractedPatch(patch: CompanyProfilePatch): Promise<UserAgentProfile> {
    const base = (await this.hydrate()) || {
      id: 'local-business-profile',
      organizationName: '',
      msmeCategory: 'MICRO' as MsmeCategory,
      annualTurnoverInr: 0,
      yearsExperience: 0,
      productCategories: [],
      targetStates: ['Pan-India'],
      isOem: false,
      hasUdyamCertificate: false,
    };

    const merged = sanitizeProfile({
      ...base,
      ...(patch.organizationName !== undefined ? { organizationName: patch.organizationName } : {}),
      ...(patch.msmeCategory !== undefined ? { msmeCategory: patch.msmeCategory } : {}),
      ...(patch.hasUdyamCertificate !== undefined
        ? { hasUdyamCertificate: patch.hasUdyamCertificate }
        : {}),
      ...(patch.isOem !== undefined ? { isOem: patch.isOem } : {}),
      ...(patch.isServiceProvider !== undefined
        ? { isServiceProvider: patch.isServiceProvider }
        : {}),
      ...(patch.annualTurnoverInr !== undefined
        ? { annualTurnoverInr: patch.annualTurnoverInr }
        : {}),
      ...(patch.yearsExperience !== undefined ? { yearsExperience: patch.yearsExperience } : {}),
      ...(patch.targetStates !== undefined ? { targetStates: patch.targetStates } : {}),
      ...(patch.gstin !== undefined ? { gstin: patch.gstin } : {}),
      ...(patch.panNumber !== undefined ? { panNumber: patch.panNumber } : {}),
      ...(patch.udyamNumber !== undefined ? { udyamNumber: patch.udyamNumber } : {}),
      ...(patch.registeredAddress !== undefined
        ? { registeredAddress: patch.registeredAddress }
        : {}),
      ...(patch.maxSingleOrderValueInr !== undefined
        ? { maxSingleOrderValueInr: patch.maxSingleOrderValueInr }
        : {}),
      ...(patch.hasVerifiedUdin !== undefined ? { hasVerifiedUdin: patch.hasVerifiedUdin } : {}),
    })!;

    this.profile = merged;
    this.hydrated = true;

    const storage = await this.getStorage();
    if (storage) {
      try {
        await storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Keep in-memory state active even if disk write fails
      }
    }

    this.emit();
    return { ...merged };
  }

  public static async clearProfile(): Promise<void> {
    this.profile = null;
    this.hydrated = true;

    const storage = await this.getStorage();
    if (storage) {
      try {
        await storage.removeItem(PROFILE_STORAGE_KEY);
      } catch {
        // Ignore storage removal errors
      }
    }

    this.emit();
  }

  /** Concise human-readable profile summary for badges and menu subtitles. */
  public static formatProfileSummary(profile: UserAgentProfile | null): string {
    if (!profile) return 'Not configured — tap to enable Go/No-Go verdicts';

    const roleLabel = profile.isOem ? 'OEM' : 'Reseller';
    const tierMap: Record<MsmeCategory, string> = {
      MICRO: 'Micro MSE',
      SMALL: 'Small MSE',
      MEDIUM: 'Medium MSE',
      STARTUP: 'Startup',
      LARGE: 'Non-MSE',
    };
    const tierLabel = tierMap[profile.msmeCategory] || 'Enterprise';

    const lakhs = profile.annualTurnoverInr / 100000;
    const turnoverLabel =
      lakhs >= 100
        ? `₹${Number((lakhs / 100).toFixed(1))} Cr`
        : `₹${Number(lakhs.toFixed(1))}L`;

    const expLabel = `${profile.yearsExperience} yr${profile.yearsExperience === 1 ? '' : 's'}`;
    const stateLabel =
      !profile.targetStates || profile.targetStates.length === 0
        ? 'Pan-India'
        : profile.targetStates.length === 1
          ? profile.targetStates[0]
          : `${profile.targetStates.length} states`;

    return `${roleLabel} · ${tierLabel} · ${turnoverLabel} · ${expLabel} · ${stateLabel}`;
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
