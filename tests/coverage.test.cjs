'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateCoverage,current}=require('../evals/coverage.cjs');
const coverage=require('../evals/coverage.json'),cases=require('../evals/cases.json'),suites=require('./suites.json');
test('all cases and sample suites are mapped without claiming execution',()=>{
 assert.deepEqual(current(),{capabilities:11,defined_model_cases:52,mapped_sample_suites:7,model_status:'not_run',integration_status:'not_run'});
});
for(const kind of ['missing-case','missing-suite','fake-pass','unsafe-owner','orphan'])test(`coverage rejects ${kind}`,()=>{
 const data=structuredClone(coverage),c=data.capabilities[0];
 if(kind==='missing-case')c.model_cases.push('undefined');
 if(kind==='missing-suite')c.sample_suites.push('undefined');
 if(kind==='fake-pass')c.model_status='pass';
 if(kind==='unsafe-owner')c.rule_owner='../outside';
 if(kind==='orphan')c.model_cases.pop();
 assert.throws(()=>validateCoverage(data,cases,suites));
});
