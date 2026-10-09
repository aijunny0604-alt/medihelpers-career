// Cache only initialization completion, never member data or permission results.
export function createDbInitializer() {
  const databases = new WeakMap();
  return async function initialize(db, key, work) {
    let tasks = databases.get(db);
    if (!tasks) { tasks = new Map(); databases.set(db, tasks); }
    if (!tasks.has(key)) tasks.set(key, Promise.resolve().then(work));
    const task = tasks.get(key);
    try { await task; }
    catch (error) { if (tasks.get(key) === task) tasks.delete(key); throw error; }
  };
}
