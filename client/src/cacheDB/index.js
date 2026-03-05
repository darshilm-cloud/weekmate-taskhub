import Dexie from "dexie";

const NEW_DB_NAME = "cacheDB_v2"; // New database name for Dexie

// 🔥 Initialize Dexie after deleting old IndexedDB
const initDexieDB = async () => {
  const db = new Dexie(NEW_DB_NAME);
  db.version(1).stores({
    cacheStore: "&key", // Set primary key correctly
    commentStore: "&key",
  });

  // Load all data from IndexedDB into memory
  await loadAllDataIntoMemory(db);

  return db;
};

// Load all data from IndexedDB into in-memory cache
const loadAllDataIntoMemory = async (db) => {
  const allData = await db.cacheStore.toArray(); // Retrieve all records
  allData.forEach((record) => {
    cacheMemory.set(record.key, record.data); // Store each record in memory
  });
};

// In-memory cache to avoid unnecessary DB reads
const cacheMemory = new Map();

// Store data in IndexedDB + Memory
export const cacheData = async (key, data) => {
  const db = await dbPromise;
  cacheMemory.set(key, data); // Cache in memory
  await db.cacheStore.put({ key, data });
};

// Retrieve cached data (fastest possible)
export const getCachedData = async (key) => {
  if (cacheMemory.has(key)) {
    return cacheMemory.get(key); // 🚀 Instant memory retrieval
  }
  const db = await dbPromise;
  const cached = await db.cacheStore.get(key);
  if (cached) {
    cacheMemory.set(key, cached.data); // Cache for future reads
    return cached.data;
  }
  return null;
};

export const hasDraftComment = async (taskId) => {
  const key = `comment_${taskId}`;

  // Check memory first for performance
  if (cacheMemory.has(key)) {
    const data = cacheMemory.get(key);
    return Boolean(data?.trim());
  }

  // Check DB if not in memory
  const db = await dbPromise;
  const cached = await db.cacheStore.get(key);
  return Boolean(cached?.data?.trim());
};

// ...existing code...

// Check if a draft note exists
export const hasNotesDraft = async (noteId) => {
  const key = `note_draft_${noteId}`;

  // Check memory first for performance
  if (cacheMemory.has(key)) {
    const data = cacheMemory.get(key);
    return Boolean(data?.trim());
  }

  // Check DB if not in memory
  const db = await dbPromise;
  const cached = await db.cacheStore.get(key);
  return Boolean(cached?.data?.trim());
};

// Store draft note content
export const saveNotesDraft = async (noteId, content) => {
  const key = `note_draft_${noteId}`;
  await cacheData(key, content);
};

// Get draft note content
export const getNotesDraft = async (noteId) => {
  const key = `note_draft_${noteId}`;
  return await getCachedData(key);
};

// Add this new function to handle bug comment drafts
export const hasBugCommentDraft = async (bugId) => {
  const key = `bug_comment_${bugId}`;

  // Check memory first for performance
  if (cacheMemory.has(key)) {
    const data = cacheMemory.get(key);
    return Boolean(data?.trim());
  }

  // Check DB if not in memory
  const db = await dbPromise;
  const cached = await db.cacheStore.get(key);
  return Boolean(cached?.data?.trim());
};

export const saveBugCommentDraft = async (bugId, content) => {
  const key = `bug_comment_${bugId}`;
  await cacheData(key, content);
};

export const getBugCommentDraft = async (bugId) => {
  const key = `bug_comment_${bugId}`;
  return await getCachedData(key);
};

// Add these functions for note comments
export const hasNoteCommentDraft = async (noteId) => {
  const key = `note_comment_${noteId}`;
  
  // Check memory first for performance
  if (cacheMemory.has(key)) {
    const data = cacheMemory.get(key);
    return Boolean(data?.trim());
  }

  // Check DB if not in memory
  const db = await dbPromise;
  const cached = await db.cacheStore.get(key);
  return Boolean(cached?.data?.trim());
};

export const saveNoteCommentDraft = async (noteId, content) => {
  const key = `note_comment_${noteId}`;
  await cacheData(key, content);
};

export const getNoteCommentDraft = async (noteId) => {
  const key = `note_comment_${noteId}`;
  return await getCachedData(key);
};

// Initialize Dexie Database and load all data into memory
const dbPromise = initDexieDB();
