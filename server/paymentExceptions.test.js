import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readPaymentExceptions} from './paymentExceptions.js';

function fixture(){
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE payment_orders(id TEXT PRIMARY KEY,order_number TEXT,total_amount INTEGER,status TEXT);
    CREATE TABLE payment_pg_attempts(order_id TEXT,status TEXT,updated_at TEXT);
    CREATE TABLE payment_pg_refunds(order_id TEXT,status TEXT,updated_at TEXT);
    CREATE TABLE payment_transactions(id TEXT,order_id TEXT,provider TEXT,transaction_type TEXT,status TEXT,provider_transaction_id TEXT,processed_at TEXT);`);
  return {db,adapter:{prepare:sql=>({all:async()=>({results:db.prepare(sql).all()})})}};
}
test('exception queue includes ambiguous states and excludes completed attempts without mutating records',async()=>{
  const {db,adapter}=fixture();
  for(const [i,status] of ['approving','review','captured','net_cancelled','rejected'].entries()){
    db.prepare('INSERT INTO payment_orders VALUES (?,?,1000,?)').run('a'+i,'ORDER-A'+i,'awaiting_payment');
    db.prepare("INSERT INTO payment_pg_attempts VALUES (?,?,'2026-10-09 01:00:00')").run('a'+i,status);
  }
  for(const [i,status] of ['processing','review','provider_confirmed','completed','manual_completed'].entries()){
    db.prepare('INSERT INTO payment_orders VALUES (?,?,1000,?)').run('r'+i,'ORDER-R'+i,'paid');
    db.prepare("INSERT INTO payment_pg_refunds VALUES (?,?,'2026-10-09 02:00:00')").run('r'+i,status);
  }
  db.exec("INSERT INTO payment_transactions VALUES ('t','r1','inicis','capture','succeeded','KNOWN-TID','2026-10-08 00:00:00')");
  const before=db.prepare('SELECT total_changes() n').get().n;
  const q=await readPaymentExceptions(adapter);
  assert.equal(q.total,5);assert.equal(q.items.length,5);
  assert.equal(q.items.find(x=>x.orderNumber==='ORDER-R1').tid,'KNOWN-TID');
  assert.equal(q.items[0].tid,null);assert.ok(!('total' in q.items[0]));
  assert.equal(db.prepare('SELECT total_changes() n').get().n,before);
  db.close();
});
test('exception queue reports total beyond visible limit and oldest unresolved first',async()=>{
  const {db,adapter}=fixture();
  for(let i=0;i<105;i++){
    db.prepare("INSERT INTO payment_orders VALUES (?,?,1000,'paid')").run(String(i),'ORDER-'+String(i).padStart(3,'0'));
    db.prepare("INSERT INTO payment_pg_refunds VALUES (?,'review','2026-10-09 01:00:00')").run(String(i));
  }
  const q=await readPaymentExceptions(adapter);
  assert.equal(q.total,105);assert.equal(q.items.length,100);assert.equal(q.items[0].orderNumber,'ORDER-000');
  db.exec('DELETE FROM payment_pg_refunds');assert.deepEqual(await readPaymentExceptions(adapter),{total:0,items:[]});
  db.close();
});
