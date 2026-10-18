// One request at a time, and no polling while the tab is hidden. The caller
// invalidates late results when its account or route changes.
export function startVisiblePolling(task, { document:doc = document, clock = window, interval = 30000, immediate = true } = {}) {
  let active = true;
  let pending = false;
  const refresh = async () => {
    if (!active || pending || doc.visibilityState === 'hidden') return;
    pending = true;
    try { await task(); } catch {} finally { pending = false; }
  };
  const onVisible = () => { if (doc.visibilityState === 'visible') void refresh(); };
  const timer = clock.setInterval(refresh, interval);
  doc.addEventListener('visibilitychange', onVisible);
  if (immediate) void refresh();
  return { refresh, stop() { active = false; clock.clearInterval(timer); doc.removeEventListener('visibilitychange', onVisible); } };
}
