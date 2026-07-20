import type { SavedRequest } from "./types";

const DB_NAME = "wizdler-db";
const DB_VERSION = 2;
const STORE_NAME = "requests";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("favorited", "favorited", { unique: false });
      } else {
        const store = req.transaction!.objectStore(STORE_NAME);
        if (!store.indexNames.contains("favorited")) {
          store.createIndex("favorited", "favorited", { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const MAX_HISTORY = 100;

function isDuplicate(
  a: Omit<SavedRequest, "id">,
  b: SavedRequest
): boolean {
  return (
    a.wsdlUrl === b.wsdlUrl &&
    a.serviceName === b.serviceName &&
    a.operationName === b.operationName &&
    a.method === b.method &&
    a.requestUrl === b.requestUrl &&
    a.requestBody === b.requestBody
  );
}

export async function upsertRequest(
  data: Omit<SavedRequest, "id">
): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("createdAt");

  const existing = await new Promise<SavedRequest | undefined>((resolve, reject) => {
    const req = index.openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (isDuplicate(data, cursor.value)) {
          resolve(cursor.value);
          return;
        }
        cursor.continue();
      } else {
        resolve(undefined);
      }
    };
    req.onerror = () => reject(req.error);
  });

  if (existing) {
    existing.createdAt = Date.now();
    existing.responseBody = data.responseBody;
    existing.status = data.status;
    const writeTx = db.transaction(STORE_NAME, "readwrite");
    const writeStore = writeTx.objectStore(STORE_NAME);
    return new Promise<number>((resolve, reject) => {
      const req = writeStore.put(existing);
      req.onsuccess = () => resolve(existing.id!);
      req.onerror = () => reject(req.error);
    });
  }

  return saveRequest(data);
}

export async function saveRequest(
  data: Omit<SavedRequest, "id">
): Promise<number> {
  const db = await openDb();
  const id = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(data);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
  await trimRequests(db);
  return id;
}

async function trimRequests(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("createdAt");

  const all = await new Promise<number>((resolve, reject) => {
    const req = index.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (all <= MAX_HISTORY) return;

  const excess = all - MAX_HISTORY;
  const cursorReq = index.openCursor(null, "next");
  let deleted = 0;

  return new Promise((resolve, reject) => {
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || deleted >= excess) {
        resolve();
        return;
      }
      if (!cursor.value.favorited) {
        store.delete(cursor.primaryKey);
        deleted++;
      }
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export async function getAllRequests(): Promise<SavedRequest[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const req = index.openCursor(null, "prev");
    const results: SavedRequest[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRequest(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function toggleFavorite(id: number): Promise<SavedRequest | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = (getReq as IDBRequest<SavedRequest>).result;
      if (!record) {
        resolve(null);
        return;
      }
      record.favorited = !record.favorited;
      store.put(record);
      resolve(record);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function clearRequests(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
