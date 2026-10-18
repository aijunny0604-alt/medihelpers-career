import test from 'node:test';
import assert from 'node:assert/strict';
import { startVisiblePolling } from './visiblePolling.js';
function fixture(task, options={}) {
  const events=new Map();let tick,cleared=false;
  const document={visibilityState:'visible',addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
  const clock={setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{cleared=true;}};
  const poll=startVisiblePolling(task,{document,clock,...options});
  return {poll,document,events,tick:()=>tick(),get cleared(){return cleared;}};
}
test('hidden tabs stop requests and visible tabs refresh immediately', async()=>{
  let calls=0;const f=fixture(()=>{calls++;},{immediate:false});
  f.document.visibilityState='hidden';await f.tick();assert.equal(calls,0);
  f.document.visibilityState='visible';await f.tick();assert.equal(calls,1);
  f.events.get('visibilitychange')();await Promise.resolve();assert.equal(calls,2);f.poll.stop();
});
test('slow requests never overlap interval or focus refreshes', async()=>{
  let calls=0,resolve;const f=fixture(()=>{calls++;return new Promise(r=>resolve=r);});
  await f.tick();await f.poll.refresh();assert.equal(calls,1);
  resolve();await Promise.resolve();await Promise.resolve();void f.tick();assert.equal(calls,2);
  resolve();f.poll.stop();
});
test('cleanup removes listeners and prevents later work', async()=>{
  let calls=0;const f=fixture(()=>{calls++;},{immediate:false});
  f.poll.stop();await f.tick();await f.poll.refresh();assert.equal(calls,0);assert.equal(f.cleared,true);assert.equal(f.events.size,0);
});
test('failed request releases polling lock', async()=>{
  let calls=0;const f=fixture(()=>{calls++;throw Error('offline');},{immediate:false});
  await f.tick();await f.tick();assert.equal(calls,2);f.poll.stop();
});
