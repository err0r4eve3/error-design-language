'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function validateCoverage(coverage, cases, suites) {
 if(coverage.schema_version!==1||!Array.isArray(coverage.capabilities))throw new Error('Invalid coverage schema');
 const ids=new Set(cases.cases.map(c=>c.id)), suiteIds=new Set(suites.suites.map(s=>s.id));
 const seen=new Set(),mapped=new Set(),usedSuites=new Set();
 for(const c of coverage.capabilities){
  if(!c.id||seen.has(c.id))throw new Error('Duplicate capability');seen.add(c.id);
  if(c.model_status!=='not_run'||c.integration_status!=='not_run')throw new Error('Source index cannot declare executed results');
  if(!c.rule_owner||path.isAbsolute(c.rule_owner)||c.rule_owner.split(/[\\/]/).includes('..')||!fs.existsSync(path.join(root,c.rule_owner)))throw new Error('Missing or unsafe rule owner');
  if(typeof c.gap!=='string'||!c.gap.trim())throw new Error('Coverage boundaries required');
  for(const id of c.model_cases){if(!ids.has(id))throw new Error(`Unknown model case: ${id}`);mapped.add(id);}
  for(const id of c.sample_suites){if(!suiteIds.has(id))throw new Error(`Unknown sample suite: ${id}`);usedSuites.add(id);}
 }
 if(mapped.size!==ids.size)throw new Error(`Unmapped model cases: ${[...ids].filter(id=>!mapped.has(id)).join(',')}`);
 if(usedSuites.size!==suiteIds.size)throw new Error('Unmapped sample suite');
 return {capabilities:seen.size,defined_model_cases:ids.size,mapped_sample_suites:usedSuites.size,model_status:'not_run',integration_status:'not_run'};
}
function current(){return validateCoverage(require('./coverage.json'),require('./cases.json'),require('../tests/suites.json'));}
if(require.main===module){try{console.log(JSON.stringify(current(),null,2));}catch(e){console.error(e);process.exitCode=1;}}
module.exports={validateCoverage,current};
