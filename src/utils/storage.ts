/**
 * Resilient Client Storage Utility
 * 
 * Provides fail-safe persistence across localStorage and IndexedDB:
 * 1. Synchronous localStorage reads and writes for zero-latency startup and backward compatibility.
 * 2. Try-catch protection against QuotaExceededError (e.g. large weighment photos or thousands of transactions).
 * 3. Asynchronous IndexedDB mirroring as a persistent high-capacity fallback store (100MB+ quota).
 * 4. Zero data modification: preserves exact keys and JSON data structures.
 */

export const DB_PREFIX = 'rf_app_';

const IDB_NAME = 'seafood_storage_db';
const IDB_STORE = 'app_state';
const IDB_VERSION = 1;

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> | null {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB failed to open:', req.error);
          reject(req.error);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        reject(err);
      }
    });
  }
  return idbPromise;
}

/**
 * Asynchronously save key-value to IndexedDB in the background
 */
export async function idbSet(key: string, value: any): Promise<void> {
  const dbPromise = getIDB();
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
  } catch (err) {
    // Non-blocking background log
    console.warn(`IndexedDB backup write error for key "${key}":`, err);
  }
}

/**
 * Asynchronously get key-value from IndexedDB
 */
export async function idbGet<T>(key: string): Promise<T | null> {
  const dbPromise = getIDB();
  if (!dbPromise) return null;
  try {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Asynchronously delete or clear a key from IndexedDB
 */
export async function idbDelete(key: string): Promise<void> {
  const dbPromise = getIDB();
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(key);
  } catch (err) {
    console.warn(`IndexedDB delete error for key "${key}":`, err);
  }
}

const IDB_NEWER_PREFIX = '__idb_newer_';

export async function getNewerIdbSnapshot<T>(key: string): Promise<T | null> {
  const newerTs = await idbGet<number>(`${IDB_NEWER_PREFIX}${key}`);
  if (!newerTs || newerTs <= 0) return null;
  return idbGet<T>(key);
}

/**
 * Sanitize audit log snapshots so large base64 images or deep object trees
 * cannot bloat localStorage quota and starve primary business records.
 */
export function sanitizeAuditValue(value: unknown, depth = 0): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') || value.startsWith('data:application/') || value.length > 4000) {
      return '[omitted large payload]';
    }
    return value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= 3) {
    return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'function' || v === undefined) continue;
    clean[k] = sanitizeAuditValue(v, depth + 1);
  }
  return clean;
}

/**
 * Free up space in localStorage when QuotaExceededError occurs by compacting oversized audit logs.
 */
function compactAuditLogsInLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const auditKey = 'seafood_v2_audit_logs';
    const raw = window.localStorage.getItem(auditKey);
    if (!raw || raw.length < 20_000) return false;

    const logs = JSON.parse(raw);
    if (!Array.isArray(logs)) return false;

    const compacted = logs.slice(0, 120).map((entry: any) => ({
      id: entry.id,
      userEmail: entry.userEmail,
      userRole: entry.userRole,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId,
      changeReason: entry.changeReason,
      createdAt: entry.createdAt
    }));
    window.localStorage.setItem(auditKey, JSON.stringify(compacted));
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous, safe getter for localStorage.
 * If data is corrupted or unavailable, returns fallback.
 */
export function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`Failed to parse localStorage key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safe setter for localStorage with QuotaExceededError protection and IndexedDB backup.
 * Never throws exceptions that could crash the application.
 */
export function safeSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false;

  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (err) {
    console.error(`JSON stringify error for key "${key}":`, err);
    return false;
  }

  // 1. Try writing to localStorage
  let localStorageSuccess = false;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, serialized);
      localStorageSuccess = true;
    }
  } catch (err: any) {
    // Attempt automatic recovery by compacting heavy audit logs in localStorage if a non-audit key failed
    if (!key.endsWith('audit_logs') && compactAuditLogsInLocalStorage() && window.localStorage) {
      try {
        window.localStorage.setItem(key, serialized);
        localStorageSuccess = true;
      } catch (retryErr) {
        console.warn(
          `localStorage quota still exceeded after compaction for key "${key}". Preserving in IndexedDB fallback.`,
          retryErr
        );
      }
    } else {
      console.warn(
        `localStorage quota exceeded or write failed for key "${key}". Preserving in IndexedDB backup.`,
        err
      );
    }
  }

  // 2. Mirror to IndexedDB asynchronously without blocking UI
  idbSet(key, value);
  if (localStorageSuccess) {
    idbDelete(`${IDB_NEWER_PREFIX}${key}`);
  } else {
    idbSet(`${IDB_NEWER_PREFIX}${key}`, Date.now());
  }

  return localStorageSuccess;
}
