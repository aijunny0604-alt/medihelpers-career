// Generated Cloudflare Worker, synthetic requests and fake origin only.
import assert from 'node:assert/strict';
const {default:worker}=await import('../dist-cf/server/index.js');
const originalFetch=globalThis.fetch;
const checks=[];
const calls=[];
globalThis.fetch=async request=>{
  calls.push({url:request.url,method:request.method,headers:new Headers(request.headers),body:await request.text(),redirect:request.redirect});
  return new Response('SYNTHETIC LEGACY RESPONSE',{headers:{'set-cookie':'PHPSESSID=oldSession; Path=/','cache-control':'public'}});
};
const check=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);checks.push(name);};
const base='https://www.medihelpers.co.kr';
const prefix='/rankup_module/rankup_payment/inistdpay/';
const blocked={MIGRATION_MODE:'frozen',STAGING_READ_ONLY:'true',PAYMENT_LIVE:'true',CHECKOUT_ENABLED:'false',SIGNUP_ENABLED:'false'};
try {
 for(const path of ['INIStdPayReturn.php','close.php','popup.php']) {
  const response=await worker.fetch(new Request(base+prefix+path,{method:'POST',headers:{cookie:'mh_session=NEW_SECRET; PHPSESSID=oldSession',authorization:'Bearer NEW_SECRET'},body:'synthetic=old-order'}),{...blocked,LEGACY_PAYMENT_BRIDGE_ENABLED:'true'},{});
  check('legacy reply survives maintenance '+path,response.status,200);
  check('legacy body '+path,await response.text(),'SYNTHETIC LEGACY RESPONSE');
  check('uncached '+path,response.headers.get('cache-control'),'no-store');
  check('new bearer stripped '+path,calls.at(-1).headers.has('authorization'),false);
  check('only old session '+path,calls.at(-1).headers.get('cookie'),'PHPSESSID=oldSession');
  check('body retained '+path,calls.at(-1).body,'synthetic=old-order');
  check('no redirect retry '+path,calls.at(-1).redirect,'manual');
 }
 check('exactly one origin request per reply',calls.length,3);
 for(const [path,method,status] of [[prefix+'INIStdPayReturn.php','DELETE',405],['/api/payment-approve','POST',503],['/api/account','POST',503],['/RAD/index.html','POST',503],['/unknown-notify.php','POST',503]]) {
  const response=await worker.fetch(new Request(base+path,{method}),{...blocked,LEGACY_PAYMENT_BRIDGE_ENABLED:'true'},{});
  check('no other operation bypass '+path,response.status,status);
 }
 check('new operations never sent to old server',calls.length,3);
 for(const env of [blocked,{...blocked,LEGACY_PAYMENT_BRIDGE_ENABLED:'false'},{...blocked,LEGACY_PAYMENT_BRIDGE_ENABLED:'TRUE'}]) {
  check('disabled flag stays closed '+String(env.LEGACY_PAYMENT_BRIDGE_ENABLED),(await worker.fetch(new Request(base+prefix+'INIStdPayReturn.php',{method:'POST'}),env,{})).status,503);
 }
 check('disabled flag performs no origin request',calls.length,3);
 globalThis.fetch=async()=>{throw new Error('synthetic origin unavailable');};
 const failed=await worker.fetch(new Request(base+prefix+'INIStdPayReturn.php',{method:'POST'}),{...blocked,LEGACY_PAYMENT_BRIDGE_ENABLED:'true'},{});
 check('origin failure is not fake success',failed.status,502);
 check('failure warns against repayment',(await failed.text()).includes('재결제하지 말고'),true);
 console.log(JSON.stringify({passed:checks.length,checks,scope:'Synthetic generated-Worker checks; no real network, accounts, DB or PG transaction'}));
} finally {globalThis.fetch=originalFetch;}
