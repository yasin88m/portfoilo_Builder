import test from 'node:test';
import assert from 'node:assert/strict';
import {frameSize} from '../public/preview.js';
test('expanded desktop fills narrow and wide viewports without unused width',()=>{
 for(const available of [320,360,768,1000,1337,1920]){
  const size=frameSize(available,false,false,true);
  assert.equal(size.width*size.scale,available);
 }
});
test('normal previews fit their canvas and mobile keeps a phone viewport',()=>{
 for(const available of [280,360,590,900]){
  const size=frameSize(available);assert.ok(size.width*size.scale<=available);
  const mobile=frameSize(available,true,false,true);assert.equal(mobile.width,Math.min(360,available));assert.equal(mobile.scale,1);
 }
});
