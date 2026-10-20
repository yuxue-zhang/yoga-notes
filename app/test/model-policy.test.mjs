import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness} from '../pipeline.mjs';
import {visionModel} from '../model-policy.mjs';
test('更换模型不能沿用另一模型的免费额度保护确认',()=>{
 const env={DASHSCOPE_API_KEY:'test',BAILIAN_WORKSPACE_ID:'test',BAILIAN_FREE_QUOTA_CONFIRMED:'true'};
 assert.equal(readiness(env),true);
 const alternate={...env,YOGA_VISION_MODEL:'qwen3.7-plus'};
 assert.equal(readiness(alternate),false);
 assert.equal(readiness({...alternate,BAILIAN_FREE_QUOTA_CONFIRMED_MODELS:'qwen3.7-plus'}),true);
 assert.equal(visionModel(alternate),'qwen3.7-plus');
 assert.equal(readiness({...alternate,YOGA_VISION_MODEL:'unapproved-model',BAILIAN_FREE_QUOTA_CONFIRMED_MODELS:'unapproved-model'}),false);
});
