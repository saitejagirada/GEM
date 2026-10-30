import type {
  ParticipatedBid,
  WorkspaceDocument,
  WorkspaceDocumentPersistence,
} from '../types/index.ts';
import { WorkspaceService } from './WorkspaceService.ts';

const DOCUMENTS_KEY = '@gem-mobile-companion/workspace-documents-v1';
const PORTFOLIO_KEY = '@gem-mobile-companion/workspace-portfolio-v1';
const WORKSPACE_DIRECTORY = 'gem-workspace/';

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

export interface WorkspacePickedAsset {
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
}

export interface WorkspacePersistResult {
  documents: WorkspaceDocument[];
  persistedCount: number;
  sessionOnlyCount: number;
}

/**
 * Phase 2 local persistence boundary.
 *
 * This service stores only preparation metadata and app-private file copies.
 * It deliberately has no credential, OTP, cookie, or official GeM submission
 * responsibilities.
 */
export class WorkspaceStorage {
  public static readonly documentsKey = DOCUMENTS_KEY;
  public static readonly portfolioKey = PORTFOLIO_KEY;

  public static sanitizeFileName(fileName: string): string {
    const sanitized = fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^[^a-zA-Z0-9]+/, '')
      .slice(0, 120);

    return sanitized || 'document';
  }

  public static isPersisted(document: WorkspaceDocument): boolean {
    return document.persistence === 'PERSISTED';
  }

  public static mergePortfolioRecords(records: ParticipatedBid[]): ParticipatedBid[] {
    const byBidNumber = new Map<string, ParticipatedBid>();
    for (const record of records) {
      if (record.bidNumber) byBidNumber.set(record.bidNumber, record);
    }
    return Array.from(byBidNumber.values());
  }

  public static async loadPortfolio(): Promise<ParticipatedBid[]> {
    const storage = await this.getKeyValueStorage();
    if (!storage) return [];

    try {
      const raw = await storage.getItem(PORTFOLIO_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return this.mergePortfolioRecords(parsed.filter(this.isStoredPortfolioRecord));
    } catch {
      return [];
    }
  }

  public static async savePortfolioRecord(record: ParticipatedBid): Promise<boolean> {
    const storage = await this.getKeyValueStorage();
    if (!storage) return false;

    const records = this.mergePortfolioRecords([...(await this.loadPortfolio()), record]);
    try {
      await storage.setItem(PORTFOLIO_KEY, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  public static async loadDocuments(): Promise<WorkspaceDocument[]> {
    const storage = await this.getKeyValueStorage();
    if (!storage) return [];

    try {
      const raw = await storage.getItem(DOCUMENTS_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(this.isStoredDocument).map((document) => ({
        ...document,
        persistence: 'PERSISTED' as WorkspaceDocumentPersistence,
      }));
    } catch {
      return [];
    }
  }

  public static async persistPickedDocuments(
    assets: WorkspacePickedAsset[],
    linkedBidNumber: string,
    existingDocuments: WorkspaceDocument[] = []
  ): Promise<WorkspacePersistResult> {
    const storage = await this.getKeyValueStorage();
    const fileSystem = await this.getFileSystem();
    const documentDirectory = fileSystem?.documentDirectory?.replace(/\/?$/, '/');
    const canPersist = Boolean(storage && fileSystem && documentDirectory);
    const pickedAt = new Date().toISOString();
    const copiedUris: string[] = [];

    if (canPersist && fileSystem && documentDirectory) {
      try {
        await fileSystem.makeDirectoryAsync(documentDirectory + WORKSPACE_DIRECTORY, {
          intermediates: true,
        });
      } catch {
        // The documents will be retained in memory as session-only records.
      }
    }

    const newDocuments: WorkspaceDocument[] = [];
    for (const [index, asset] of assets.entries()) {
      const id = 'workspace-doc-' + Date.now() + '-' + index;
      let uri = asset.uri;
      let persistence: WorkspaceDocumentPersistence = 'SESSION_ONLY';

      if (canPersist && fileSystem && documentDirectory) {
        const destination =
          documentDirectory +
          WORKSPACE_DIRECTORY +
          id +
          '-' +
          this.sanitizeFileName(asset.name);

        try {
          await fileSystem.copyAsync({ from: asset.uri, to: destination });
          uri = destination;
          persistence = 'PERSISTED';
          copiedUris.push(destination);
        } catch {
          // Keep the picker URI so the user can still work during this session.
        }
      }

      newDocuments.push({
        id,
        name: asset.name,
        uri,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        addedAtUtc: pickedAt,
        kind: WorkspaceService.inferDocumentKind(asset.name),
        linkedBidNumber,
        source: 'DEVICE_PICKER',
        persistence,
      });
    }

    const documents = [...newDocuments, ...existingDocuments];
    const persisted = documents.filter((document) => this.isPersisted(document));
    const saved = storage ? await this.saveDocuments(persisted, storage) : false;

    if (!saved && copiedUris.length > 0 && fileSystem) {
      await Promise.all(
        copiedUris.map((uri) => fileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined))
      );

      for (const document of newDocuments) {
        if (document.persistence === 'PERSISTED') {
          document.persistence = 'SESSION_ONLY';
          document.uri = assets.find((asset) => asset.name === document.name)?.uri || document.uri;
        }
      }
    }

    const persistedCount = newDocuments.filter((document) => this.isPersisted(document)).length;
    return {
      documents: [...newDocuments, ...existingDocuments],
      persistedCount,
      sessionOnlyCount: newDocuments.length - persistedCount,
    };
  }

  public static async removeDocument(document: WorkspaceDocument): Promise<void> {
    const storage = await this.getKeyValueStorage();
    const fileSystem = await this.getFileSystem();
    const documentDirectory = fileSystem?.documentDirectory?.replace(/\/?$/, '/');

    if (
      fileSystem &&
      documentDirectory &&
      this.isPersisted(document) &&
      document.uri.startsWith(documentDirectory + WORKSPACE_DIRECTORY)
    ) {
      await fileSystem.deleteAsync(document.uri, { idempotent: true }).catch(() => undefined);
    }

    if (storage) {
      const remaining = (await this.loadDocuments()).filter((item) => item.id !== document.id);
      await this.saveDocuments(remaining, storage);
    }
  }

  public static async clearDocuments(documents: WorkspaceDocument[]): Promise<void> {
    const storage = await this.getKeyValueStorage();
    const fileSystem = await this.getFileSystem();
    const documentDirectory = fileSystem?.documentDirectory?.replace(/\/?$/, '/');

    if (fileSystem && documentDirectory) {
      await Promise.all(
        documents
          .filter(
            (document) =>
              this.isPersisted(document) &&
              document.uri.startsWith(documentDirectory + WORKSPACE_DIRECTORY)
          )
          .map((document) => fileSystem.deleteAsync(document.uri, { idempotent: true }).catch(() => undefined))
      );
    }

    if (storage) {
      await storage.removeItem(DOCUMENTS_KEY).catch(() => undefined);
    }
  }

  private static async saveDocuments(
    documents: WorkspaceDocument[],
    storage: KeyValueStorage
  ): Promise<boolean> {
    try {
      await storage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
      return true;
    } catch {
      return false;
    }
  }

  private static isStoredDocument(value: unknown): value is WorkspaceDocument {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<WorkspaceDocument>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.uri === 'string' &&
      typeof candidate.addedAtUtc === 'string' &&
      typeof candidate.kind === 'string' &&
      candidate.source === 'DEVICE_PICKER' &&
      candidate.persistence === 'PERSISTED'
    );
  }

  private static isStoredPortfolioRecord(value: unknown): value is ParticipatedBid {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ParticipatedBid>;
    return (
      typeof candidate.bidNumber === 'string' &&
      typeof candidate.itemTitle === 'string' &&
      typeof candidate.department === 'string' &&
      typeof candidate.quotedPriceInr === 'number' &&
      typeof candidate.expectedL1BenchmarkInr === 'number' &&
      typeof candidate.submittedAtUtc === 'string' &&
      typeof candidate.stage === 'string' &&
      typeof candidate.corrigendumCount === 'number'
    );
  }

  private static async getKeyValueStorage(): Promise<KeyValueStorage | null> {
    try {
      const module = await import('@react-native-async-storage/async-storage');
      return (module.default || module) as unknown as KeyValueStorage;
    } catch {
      return null;
    }
  }

  private static async getFileSystem(): Promise<LocalFileSystem | null> {
    try {
      const module = await import('expo-file-system');
      return module as unknown as LocalFileSystem;
    } catch {
      return null;
    }
  }
}
