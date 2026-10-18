import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { createSavedItemsController } from './savedItemsController.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function setup(overrides = {}) {
  const server = new Set(); const calls = []; const snapshots = []; const failures = []; const persisted = [];
  const controller = createSavedItemsController({ member:true,
    load:async () => ({ok:true,signedIn:true,saved:[...server]}),
    save:async (id, selected) => { calls.push([id,selected]); if(selected)server.add(id);else server.delete(id); return {ok:true,saved:selected}; },
    changed:items => snapshots.push([...items]), failed:message => failures.push(message), persist:items => persisted.push([...items]), ...overrides });
  return {controller, server, calls, snapshots, failures, persisted};
}
test('member hydration replaces local values with the server list, including empty lists', async () => {
  const x=setup({initial:['stale']}); await x.controller.start(); assert.deepEqual(x.controller.snapshot(),[]);
  assert.deepEqual(x.persisted,[]);
});
test('click during hydration waits and toggles the actual saved state', async () => {
  const gate=deferred(); const x=setup({load:()=>gate.promise}); const pending=x.controller.toggle('a');
  await turn(); assert.equal(x.calls.length,0); gate.resolve({ok:true,signedIn:true,saved:['a']}); await pending;
  assert.deepEqual(x.calls,[['a',false]]); assert.deepEqual(x.controller.snapshot(),[]);
});
test('rapid clicks are serialized and the last desired state wins', async () => {
  const gate=deferred(); let count=0; const calls=[];
  const x=setup({save:async(id,selected)=>{calls.push([id,selected]);if(++count===1)await gate.promise;return{ok:true,saved:selected};}});
  await x.controller.start(); const pending=[x.controller.toggle('a'),x.controller.toggle('a'),x.controller.toggle('a')];
  await turn(); assert.equal(calls.length,1); assert.deepEqual(x.controller.snapshot(),['a']);
  gate.resolve(); await Promise.all(pending); assert.deepEqual(calls,[['a',true],['a',false],['a',true]]);
  assert.deepEqual(x.controller.snapshot(),['a']); assert.deepEqual(x.persisted,[]);
});
test('a late save response does not undo the next removal', async () => {
  const gate=deferred(); const x=setup({save:async(id,selected)=>{if(selected)await gate.promise;return{ok:true,saved:selected};}});
  await x.controller.start(); const a=x.controller.toggle('a'), b=x.controller.toggle('a'); await turn();
  assert.deepEqual(x.controller.snapshot(),[]); gate.resolve(); await Promise.all([a,b]);
  assert.ok(x.snapshots.slice(2).every(items=>items.length===0));
});
test('different targets can save independently', async () => {
  const gate=deferred(); const x=setup({save:async(id,selected)=>{if(id==='a')await gate.promise;return{ok:true,saved:selected};}});
  await x.controller.start(); const a=x.controller.toggle('a'); await x.controller.toggle('b');
  assert.deepEqual(x.controller.snapshot(),['a','b']); gate.resolve(); await a;
});
test('response lost after commit is reconciled from server without toggling again', async () => {
  const x=setup({save:async(id)=>{x.server.add(id);throw Error('network interrupted');}});
  await x.controller.toggle('a'); assert.deepEqual(x.controller.snapshot(),['a']); assert.equal(x.failures.length,1);
});
test('a rejected save returns to the persisted state', async () => {
  const x=setup({save:async()=>({ok:false,message:'storage unavailable'})});
  await x.controller.toggle('a'); assert.deepEqual(x.controller.snapshot(),[]); assert.deepEqual(x.failures,['storage unavailable']);
});
test('failed hydration prevents a write based on another account or stale cache', async () => {
  const x=setup({load:async()=>({ok:false,signedIn:false,saved:[]})});
  await x.controller.toggle('a'); assert.equal(x.calls.length,0); assert.equal(x.failures.length,1);
});
test('guest favorites use local storage without server requests', async () => {
  const x=setup({member:false,initial:['a'],load:()=>{throw Error('guest request');}});
  await x.controller.toggle('a'); await x.controller.toggle('b');
  assert.deepEqual(x.persisted,[[],['b']]); assert.deepEqual(x.calls,[]);
});
test('account switch discards late hydration and cancels queued writes', async () => {
  const gate=deferred(); const x=setup({load:()=>gate.promise}); const click=x.controller.toggle('a');
  x.controller.dispose(); gate.resolve({ok:true,signedIn:true,saved:['private-old-account']}); await click;
  assert.deepEqual(x.snapshots,[]); assert.deepEqual(x.calls,[]);
});
test('disposed controller cannot send its queued removal under a new account', async () => {
  const gate=deferred(); const calls=[]; const x=setup({save:async(id,selected)=>{calls.push([id,selected]);await gate.promise;return{ok:true,saved:selected};}});
  await x.controller.start(); const a=x.controller.toggle('a'),b=x.controller.toggle('a'); await turn();
  x.controller.dispose(); gate.resolve(); await Promise.all([a,b]); assert.deepEqual(calls,[['a',true]]);
});
