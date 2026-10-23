import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonFields, deploymentCost, factValue, towerType, validComparison} from '../src/lib/unit-tools.mjs';
test('comparison preserves distinct forms, removes unknown and duplicate IDs, and caps selection at three',()=>{
  const allowed=new Set(['vego','vego_evolved','attack_titan','fourth']);
  assert.deepEqual(validComparison(['vego','vego_evolved','vego','missing','attack_titan','fourth'],allowed),['vego','vego_evolved','attack_titan']);
  assert.deepEqual(validComparison(['<script>',null,42],allowed),[]);
});
test('comparison keeps source text and does not turn malformed or absent costs into zero',()=>{
  const unit={facts:[{label:'Deployment Cost',value:'1,300¥'},{label:'Tower Type',value:'Ground SUMN'}]};
  assert.equal(factValue(unit,'Deployment Cost'),'1,300¥');
  assert.equal(deploymentCost(unit),1300);
  assert.equal(towerType(unit),'ground');
  for(const value of ['true¥','false','1,300¥ + condition',''])assert.equal(deploymentCost({facts:[{label:'Deployment Cost',value}]}),null);
  assert.equal(factValue({facts:[{label:'Tower Type',value:'true'}]},'Tower Type'),null);
  assert.equal(towerType({facts:[]}), '');
  assert.equal(comparisonFields.length,4);
});
