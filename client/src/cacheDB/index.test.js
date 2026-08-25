/**
 * cacheDB - the drafts/response cache backing task, note, and bug comments.
 *
 * It talks to Dexie (IndexedDB), which jsdom doesn't provide and this repo
 * has no fake-indexeddb dependency for. Rather than add one, `dexie` is
 * mocked with a minimal in-memory store that implements exactly the surface
 * this module uses (version().stores(), cacheStore.put/get/toArray) - enough
 * to exercise the real caching logic (the in-memory Map layer, the DB
 * fallback, every draft helper) without a real database.
 */
jest.mock('dexie', () => {
  return jest.fn().mockImplementation(() => {
    const rows = new Map();
    return {
      version: () => ({ stores: () => {} }),
      cacheStore: {
        put: jest.fn(async (row) => { rows.set(row.key, row); }),
        get: jest.fn(async (key) => rows.get(key)),
        toArray: jest.fn(async () => []),
      },
    };
  });
});

describe('cacheDB', () => {
  let cacheData, getCachedData, hasDraftComment, hasNotesDraft, saveNotesDraft,
    getNotesDraft, hasBugCommentDraft, saveBugCommentDraft, getBugCommentDraft,
    hasNoteCommentDraft, saveNoteCommentDraft, getNoteCommentDraft;

  beforeEach(() => {
    jest.resetModules();
    // dbPromise is created once at module load and the in-memory cache is
    // module-scoped, so each test needs a fresh module instance.
    const mod = require('./index');
    ({
      cacheData, getCachedData, hasDraftComment, hasNotesDraft, saveNotesDraft,
      getNotesDraft, hasBugCommentDraft, saveBugCommentDraft, getBugCommentDraft,
      hasNoteCommentDraft, saveNoteCommentDraft, getNoteCommentDraft,
    } = mod);
  });

  test('cacheData then getCachedData round-trips through the in-memory layer', async () => {
    await cacheData('k1', { a: 1 });
    expect(await getCachedData('k1')).toEqual({ a: 1 });
  });

  test('getCachedData returns null for a key that was never cached', async () => {
    expect(await getCachedData('missing')).toBeNull();
  });

  test('hasDraftComment is false with nothing saved, true once a non-blank draft exists', async () => {
    expect(await hasDraftComment('task-1')).toBe(false);
    await cacheData('comment_task-1', 'work in progress');
    expect(await hasDraftComment('task-1')).toBe(true);
  });

  test('hasDraftComment treats a whitespace-only draft as absent', async () => {
    await cacheData('comment_task-2', '   ');
    expect(await hasDraftComment('task-2')).toBe(false);
  });

  test('note drafts save and load under their own key namespace', async () => {
    expect(await hasNotesDraft('note-1')).toBe(false);
    await saveNotesDraft('note-1', 'draft text');
    expect(await hasNotesDraft('note-1')).toBe(true);
    expect(await getNotesDraft('note-1')).toBe('draft text');
  });

  test('bug comment drafts save and load under their own key namespace', async () => {
    expect(await hasBugCommentDraft('bug-1')).toBe(false);
    await saveBugCommentDraft('bug-1', 'bug draft');
    expect(await hasBugCommentDraft('bug-1')).toBe(true);
    expect(await getBugCommentDraft('bug-1')).toBe('bug draft');
  });

  test('note comment drafts save and load under their own key namespace', async () => {
    expect(await hasNoteCommentDraft('note-9')).toBe(false);
    await saveNoteCommentDraft('note-9', 'note comment draft');
    expect(await hasNoteCommentDraft('note-9')).toBe(true);
    expect(await getNoteCommentDraft('note-9')).toBe('note comment draft');
  });
});
