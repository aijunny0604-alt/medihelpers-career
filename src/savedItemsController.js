// Keep optimistic changes ordered; a late load/write must not undo newer clicks.
// Member lists are never persisted in shared browser storage.
export function createSavedItemsController({ member, initial = [], load, save, changed, persist = () => {}, failed = () => {} }) {
  let active = true;
  let items = [...new Set(initial.map(String))];
  let ready = !member;
  let loading;
  const writes = new Map();
  const revisions = new Map();
  const publish = next => {
    if (!active) return;
    items = next;
    if (!member) persist(items);
    changed(items);
  };
  const setItem = (id, selected) => publish(selected ? [...new Set([...items, id])] : items.filter(value => value !== id));
  const start = () => {
    if (ready) return Promise.resolve(true);
    if (!loading) loading = Promise.resolve().then(load).then(result => {
      if (!active) return false;
      if (!result.ok || !result.signedIn) throw Error('관심 목록을 불러오지 못했습니다. 새로고침하거나 다시 로그인해 주세요.');
      publish(result.saved);
      ready = true;
      return true;
    }).catch(error => { if (active) failed(error.message); return false; }).finally(() => { loading = null; });
    return loading;
  };
  const toggle = async value => {
    if (!active || !(await start()) || !active) return;
    const id = String(value);
    const desired = !items.includes(id);
    const revision = (revisions.get(id) || 0) + 1;
    revisions.set(id, revision);
    setItem(id, desired);
    if (!member) return;
    const previous = writes.get(id) || Promise.resolve();
    const pending = previous.then(async () => {
      if (!active) return;
      try {
        const result = await save(id, desired);
        if (!active || revisions.get(id) !== revision) return;
        if (!result.ok || result.localOnly || typeof result.saved !== 'boolean') throw Error(result.message || '관심 목록을 저장하지 못했습니다. 다시 로그인하거나 새로고침해 저장 상태를 확인해 주세요.');
        setItem(id, result.saved);
      } catch (error) {
        if (!active || revisions.get(id) !== revision) return;
        failed(error.message);
        try {
          const latest = await load();
          if (!active || revisions.get(id) !== revision) return;
          if (latest.ok && latest.signedIn) setItem(id, latest.saved.includes(id));
          else ready = false;
        } catch { ready = false; }
      }
    });
    writes.set(id, pending);
    await pending;
    if (writes.get(id) === pending) writes.delete(id);
  };
  return { start, toggle, snapshot: () => items, dispose: () => { active = false; } };
}
