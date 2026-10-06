// Generated Worker only; no production network or DB.
const {default:worker}=await import(process.argv.includes('--cloudflare')?'../dist-cf/server/index.js':'../dist/server/index.js');
const checks=[];
const record=(name,actual,expected)=>checks.push({name,pass:actual===expected,actual,expected});
const env={MIGRATION_MODE:'open',PAYMENT_LIVE:'true',CHECKOUT_ENABLED:'false'};
for(const path of ['/payment/return','/','/jobs','/robots.txt','/unknown.php','/assets/missing.js']){
 for(const method of ['POST','PUT','PATCH','DELETE']){
  const r=await worker.fetch(new Request('https://audit.local'+path,{method,body:'resultCode=0000'}),env,{});
  record(method+' '+path,r.status,405);
  record(method+' '+path+' allow',r.headers.get('allow'),'GET, HEAD');
  record(method+' '+path+' uncached',r.headers.get('cache-control'),'no-store');
 }
}
for(const path of ['/','/jobs']){
 const r=await worker.fetch(new Request('https://audit.local'+path),env,{});
 record('GET still serves '+path,r.status,200);
 record('HTML type '+path,r.headers.get('content-type'),'text/html; charset=utf-8');
}
const unknown=await worker.fetch(new Request('https://audit.local/api/not-a-real-callback',{method:'POST'}),env,{});
record('unknown API remains 404',unknown.status,404);
record('unknown API remains JSON',unknown.headers.get('content-type')?.includes('application/json'),true);
const payment=await worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{origin:'https://audit.local','content-type':'application/json'},body:'{}'}),env,{});
record('real payment endpoint keeps checkout gate',payment.status,503);
console.log(JSON.stringify({checks,failed:checks.filter(c=>!c.pass)},null,2));
if(checks.some(c=>!c.pass))process.exitCode=1;
