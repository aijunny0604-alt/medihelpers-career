import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ledgerDateRange,ledgerKst,paymentLedgerCsv,readPaymentLedger} from './paymentLedger.js';
test('KST date boundaries include the full final day',()=>{
 assert.deepEqual(ledgerDateRange('2026-10-09','2026-10-09'),{from:'2026-10-08T15:00:00.000Z',until:'2026-10-09T15:00:00.000Z'});
 assert.doesNotThrow(()=>ledgerDateRange('2026-01-01','2026-01-31'));
});
test('malformed, reversed, overflowing dates and oversized ranges rejected',()=>{
 for(const pair of [[null,'2026-01-01'],['2026-02-30','2026-03-01'],['2026-01-02','2026-01-01'],['2026-01-01','2026-02-01'],['2026-1-1','2026-01-01']])assert.throws(()=>ledgerDateRange(...pair));
});
test('CSV neutralizes formulas, escapes quotes and excludes unlisted private fields',()=>{
 const csv=paymentLedgerCsv([{orderNumber:'\t=IMPORT("x")',tid:'TID,quoted',kind:'refund',amount:1000,recordedAt:'2026-10-08 15:00:00',canceledAt:'2026-10-08T14:30:00Z',orderStatus:'refunded',manual:1,email:'PRIVATE-EMAIL',reference:'PRIVATE-NOTE'}]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'\t=IMPORT("));assert.ok(csv.includes('""x""'));assert.ok(csv.includes('"TID,quoted"'));assert.ok(csv.includes('2026-10-09 00:00:00'));assert.ok(csv.includes('2026-10-08 23:30:00'));assert.ok(csv.includes('운영자 확인'));assert.ok(!csv.includes('PRIVATE'));
});
test('invalid financial values fail rather than silently produce a misleading report',()=>{
 for(const amount of [-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>paymentLedgerCsv([{amount}]));
 assert.equal(ledgerKst('invalid'),'');
});
test('real SQL excludes boundary/outside/mock rows and preserves delayed cancellation date',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE payment_orders(id TEXT,order_number TEXT,status TEXT);CREATE TABLE payment_transactions(id TEXT,order_id TEXT,provider_transaction_id TEXT,transaction_type TEXT,amount INTEGER,processed_at TEXT,provider TEXT,status TEXT);CREATE TABLE payment_events(id TEXT,detail_json TEXT);INSERT INTO payment_orders VALUES ('o','ORDER','refunded')");
 const add=(id,time,provider='inicis',kind='capture')=>db.prepare("INSERT INTO payment_transactions VALUES (?,'o',?,?,1000,?,?,'succeeded')").run(id,'TID-'+id,kind,time,provider);
 add('before','2026-10-08 14:59:59');add('start','2026-10-08T15:00:00Z');add('end','2026-10-09 14:59:59','inicis','refund');add('after','2026-10-09 15:00:00');add('mock','2026-10-09 01:00:00','virtual');
 db.prepare('INSERT INTO payment_events VALUES (?,?)').run('inicis-manual-refund-event-o',JSON.stringify({canceledAt:'2026-10-07T23:00:00Z'}));
 const DB={prepare:sql=>({bind:(...args)=>({all:async()=>({results:db.prepare(sql).all(...args)})})})};
 const before=db.prepare('SELECT COUNT(*) n FROM payment_transactions').get().n;
 const csv=await readPaymentLedger(DB,'2026-10-09','2026-10-09');
 assert.ok(csv.includes('TID-start'));assert.ok(csv.includes('TID-end'));for(const x of ['before','after','mock'])assert.ok(!csv.includes('TID-'+x));assert.ok(csv.includes('2026-10-08 08:00:00'));
 assert.equal(csv.trim().split('\r\n').length,3);assert.equal(db.prepare('SELECT COUNT(*) n FROM payment_transactions').get().n,before);db.close();
});
test('report never silently truncates at the download limit',async()=>{
 const DB={prepare:()=>({bind:()=>({all:async()=>({results:new Array(10001).fill({})})})})};
 await assert.rejects(readPaymentLedger(DB,'2026-10-09','2026-10-09'),/LEDGER_RANGE_TOO_LARGE/);
});
