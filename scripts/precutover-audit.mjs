// Local generated-Worker checks only. No production credentials, deployment or PG calls.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const suites=[
 ['unit',['--test','src/*.test.js','server/*.test.js'],'tap'],
 ...['readiness','admin-storage','member-flow','integration','hospital-document',
 'transition-contact','talent-unlock','mobile-assets','legacy-login','inicis','adversarial']
 .map(name=>[name,['scripts/runtime-'+name+'-audit.mjs'],'json']),
];
const results=[];
for(const [name,args,format] of suites){
 const run=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024,timeout:120000});
 let checks=0,reportedFailure=false,parseError='';
 try{
  if(format==='tap'){
   checks=Number(run.stdout.match(/^# tests (\d+)$/m)?.[1]);
   reportedFailure=Number(run.stdout.match(/^# fail (\d+)$/m)?.[1])!==0;
  }else{
   const data=JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));
   checks=Array.isArray(data.checks)?data.checks.length:Number(data.total??data.checks??data.passed);
   reportedFailure=[data.failed,data.failures].some(value=>Array.isArray(value)?value.length>0:Boolean(value))
    || [data.checks,data.results].some(value=>Array.isArray(value)&&value.some(row=>row.pass===false));
  }
 }catch(error){parseError=error.message;}
 const passed=run.status===0&&!run.error&&!parseError&&!reportedFailure&&checks>0;
 results.push({suite:name,checks:Number.isFinite(checks)?checks:0,passed});
 console.log(`${passed?'PASS':'FAIL'} ${name}: ${checks||0}`);
 if(!passed){
  // These suites contain synthetic fixtures only. Preserve useful diagnostics on failure.
  console.error(run.error?.message||parseError||'Suite reported failure');
  console.error((run.stderr+'\n'+run.stdout).slice(-16000));
 }
}
const failed=results.filter(r=>!r.passed);
console.log(JSON.stringify({scope:'local isolated tests only; no real accounts, payments or deployment',
 checks:results.reduce((sum,r)=>sum+r.checks,0),suites:results,failed},null,2));
if(failed.length)process.exitCode=1;
