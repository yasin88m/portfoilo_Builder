import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('preview uses native mobile scrolling and synchronizes desktop only with its parent',async()=>{
 const events={},messages=[],scrolls=[];const parent={postMessage:(message)=>messages.push(message)};
 const window={parent,scrollTo:(_,y)=>scrolls.push(y)};
 const context={window,parent,innerHeight:500,document:{documentElement:{scrollHeight:1500}},addEventListener:(name,fn)=>events[name]=fn,ResizeObserver:class{observe(){}},Number,Math};
 vm.runInNewContext(await readFile(new URL('../public/preview-bridge.js',import.meta.url),'utf8'),context);
 events.message({source:parent,data:{type:'portfolio:mode',nativeScroll:false}});
 events.message({source:{},data:{type:'portfolio:scroll',ratio:.5}});assert.equal(scrolls.length,0);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:.5}});assert.equal(scrolls.at(-1),500);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:2}});assert.equal(scrolls.at(-1),1000);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:NaN}});assert.equal(scrolls.at(-1),1000);
 let prevented=false;events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(messages.at(-1).type,'portfolio:wheel');assert.equal(messages.at(-1).delta,80);
 assert.equal(events.touchmove,undefined,'touch gestures must stay native');
 for(const state of [{nativeScroll:true},{expanded:true}]){
  events.message({source:parent,data:{type:'portfolio:mode',...state}});
  prevented=false;
  const before=scrolls.length,messagesBefore=messages.length;
  events.message({source:parent,data:{type:'portfolio:scroll',ratio:.2}});
  events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});
  assert.equal(scrolls.length,before);
  assert.equal(prevented,false);
  assert.equal(messages.length,messagesBefore);
 }
 events.message({source:parent,data:{type:'portfolio:mode',nativeScroll:false}});
 events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
});
