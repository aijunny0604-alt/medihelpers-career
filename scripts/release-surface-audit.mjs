import {build} from 'esbuild';
import assert from 'node:assert/strict';
let checks=0;
for(const dev of [false,true]) {
 const result=await build({stdin:{contents:"export {jobs,talent} from './src/data.js'; export {TEST_ACCOUNTS} from './src/accountApi.js'; export {normalizeQaState} from './src/qaPreview.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':JSON.stringify({DEV:dev,VITE_DEMO_MODE:''})}});
 const values=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 for(const name of ['jobs','talent','TEST_ACCOUNTS']) {assert.equal(values[name].length>0,dev,name);checks++;}
 assert.equal(values.normalizeQaState('admin'),dev?'admin':'');checks++;
}
console.log(JSON.stringify({passed:checks,total:checks,scope:'production fixtures excluded; local fixtures and QA preserved'}));
