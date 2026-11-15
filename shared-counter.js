export const COUNTER_API = 'https://closer-notes-counter.2263952184.workers.dev';
export const PENDING_KEY = 'closer-notes:pending-generations:v1';
const validId = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// Only random generation IDs leave the browser. Answers and reports stay local.
export function createSharedCounter({ baseURL = COUNTER_API, storage, fetchImpl = globalThis.fetch,
  onChange = () => {}, timeoutMs = 8000, retryDelayMs = 1500 } = {}) {
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch {} }
  const base = baseURL.replace(/\/$/, '');
  let pending = new Set(readPending());
  let total = null;
  let status = 'loading';
  let inFlight;
  let retryTimer;
  let retries = 0;
  let disposed = false;
  function readPending() {
    try {
      const saved = JSON.parse(storage?.getItem(PENDING_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(validId) : [];
    } catch { return []; }
  }
  function savePending(removeId) {
    pending = new Set([...readPending(), ...pending]);
    if (removeId) pending.delete(removeId);
    try {
      if (pending.size) storage?.setItem(PENDING_KEY, JSON.stringify([...pending]));
      else storage?.removeItem(PENDING_KEY);
    } catch { /* Keep pending work in memory when browser storage is unavailable. */ }
  }
  const snapshot = () => ({ total, status, pending: pending.size });
  function emit() { if (!disposed) onChange(snapshot()); }
  async function request(path, id) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${base}${path}`, {
        method: id ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
        signal: controller.signal,
        ...(id ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) } : {}),
      });
      if (!response.ok) throw new Error(`Counter HTTP ${response.status}`);
      const data = await response.json();
      if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid counter response');
      total = Math.max(total ?? 0, data.total);
      status = 'ready';
      return data.total;
    } finally { clearTimeout(timer); }
  }
  function scheduleRetry() {
    if (disposed || retryTimer || retries >= 2) return;
    retries++;
    retryTimer = setTimeout(() => { retryTimer = undefined; void sync(); }, retryDelayMs);
  }
  function sync() {
    if (disposed) return Promise.resolve(snapshot());
    if (inFlight) return inFlight;
    clearTimeout(retryTimer); retryTimer = undefined;
    inFlight = (async () => {
      try {
        pending = new Set([...readPending(), ...pending]);
        while (pending.size) {
          const id = pending.values().next().value;
          await request('/generate', id);
          savePending(id);
          emit();
        }
        await request('/count');
        retries = 0;
      } catch {
        status = 'error';
        if (pending.size) scheduleRetry();
      } finally { inFlight = undefined; emit(); }
      return snapshot();
    })();
    return inFlight;
  }
  function record() {
    let id;
    if (globalThis.crypto.randomUUID) id = globalThis.crypto.randomUUID();
    else {
      // getRandomValues also works on an HTTP LAN preview.
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    pending.add(id); savePending(); retries = 0; emit();
    // If a GET is already finishing, make sure this newly queued generation is sent next.
    void sync().then(() => { if (!disposed && pending.has(id) && status !== 'error') void sync(); });
    return id;
  }
  function refresh() { retries = 0; return sync(); }
  function clearLocal() {
    pending.clear();
    try { storage?.removeItem(PENDING_KEY); } catch {}
    clearTimeout(retryTimer); retryTimer = undefined;
    emit();
  }
  function dispose() { disposed = true; clearTimeout(retryTimer); }
  return { snapshot, record, refresh, sync, clearLocal, dispose };
}
