// Read-only readiness report. A successful build is not evidence of public reachability.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function inspectCutover(config) {
  const blockers=[];
  const routes=(config.routes||[]).map(r=>typeof r==='string'?r:r.pattern).filter(Boolean);
  const hasHost=host=>routes.some(r=>r===host||r===host+'/*');
  for(const host of ['www.medihelpers.co.kr','medihelpers.co.kr'])if(!hasHost(host))blockers.push('missing-route:'+host);
  if(config.workers_dev===false&&!routes.length)blockers.push('no-public-entrypoint');
  if(config.vars?.MIGRATION_MODE!=='open')blockers.push('migration-not-open');
  if(config.vars?.STAGING_READ_ONLY!=='false')blockers.push('read-only');
  return {configurationReady:blockers.length===0,blockers,
    checkoutEnabled:config.vars?.CHECKOUT_ENABLED==='true',
    signupEnabled:config.vars?.SIGNUP_ENABLED==='true',
    scope:'Static configuration only; does not verify DNS, TLS, deployed bindings, data, legal review or live payments.',
    deploymentPerformed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2]||new URL('../deploy/cloudflare.promotion.json',import.meta.url);
 const result=inspectCutover(JSON.parse(await readFile(file,'utf8')));
 console.log(JSON.stringify(result,null,2));
 if(!result.configurationReady)process.exitCode=2;
}
