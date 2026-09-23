/**
 * Offline storage for downloaded songs.
 * Audio + cover blobs and song metadata live in IndexedDB so the app can play
 * them with no network at all.
 */

export type OfflineSong = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  audio: Blob;
  cover: Blob | null;
  savedAt: number;
};

export type SongMeta = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
};

const DB_NAME = "aurora-music";
const DB_VERSION = 1;
const STORE = "tracks";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSong(song: OfflineSong): Promise<void> {
  await tx("readwrite", (store) => store.put(song) as IDBRequest<IDBValidKey>);
}

export async function getOfflineSong(id: string): Promise<OfflineSong | undefined> {
  try {
    return await tx<OfflineSong | undefined>("readonly", (store) => store.get(id));
  } catch {
    return undefined;
  }
}

export async function deleteOfflineSong(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id) as unknown as IDBRequest<undefined>);
}

export async function listOfflineSongs(): Promise<OfflineSong[]> {
  try {
    const all = await tx<OfflineSong[]>("readonly", (store) => store.getAll() as IDBRequest<OfflineSong[]>);
    return all.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function listOfflineIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    return keys.map(String);
  } catch {
    return [];
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
