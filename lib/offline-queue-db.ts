"use client";

export type OfflineFormDataEntry =
  | { key: string; type: "text"; value: string }
  | { key: string; type: "file"; name: string; mimeType: string; file: File };

export type SerializedBody =
  | { kind: "none" }
  | { kind: "json"; value: string }
  | { kind: "form-data"; entries: OfflineFormDataEntry[] };

export type OfflineMutation = {
  id: string;
  createdAt: number;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: SerializedBody;
};

const DB_NAME = "rent-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "offlineMutations";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d'ouvrir IndexedDB."));
  });
}

export async function addOfflineMutation(item: OfflineMutation) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Echec d'ecriture IndexedDB."));
  });
}

export async function listOfflineMutations(): Promise<OfflineMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("createdAt");
    const request = index.getAll();
    request.onsuccess = () => resolve((request.result ?? []) as OfflineMutation[]);
    request.onerror = () => reject(request.error ?? new Error("Echec de lecture IndexedDB."));
  });
}

export async function deleteOfflineMutations(ids: string[]) {
  if (ids.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Echec suppression IndexedDB."));
  });
}

export async function countOfflineMutations(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result ?? 0);
    request.onerror = () => reject(request.error ?? new Error("Echec compteur IndexedDB."));
  });
}
