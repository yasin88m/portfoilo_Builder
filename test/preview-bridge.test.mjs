import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('preview accepts only parent scrolling and relays wheel/touch to the page',async()=>{
 const events={},messages=[],scrolls=[];const parent={postMessage:(message)=>messages.push(message)};
 const window={parent,scrollTo:(_,y)=>scrolls.push(y)};
 const context={window,parent,innerHeight:500,document:{documentElement:{scrollHeight:1500}},addEventListener:(name,fn)=>events[name]=fn,ResizeObserver:class{observe(){}},Number,Math};
 vm.runInNewContext(await readFile(new URL('../public/preview-bridge.js',import.meta.url),'utf8'),context);
 events.message({source:{},data:{type:'portfolio:scroll',ratio:.5}});assert.equal(scrolls.length,0);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:.5}});assert.equal(scrolls.at(-1),500);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:2}});assert.equal(scrolls.at(-1),1000);
 events.message({source:parent,data:{type:'portfolio:scroll',ratio:NaN}});assert.equal(scrolls.at(-1),1000);
 let prevented=false;events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(messages.at(-1).type,'portfolio:wheel');assert.equal(messages.at(-1).delta,80);
 events.touchstart({touches:[{clientY:300}]});events.touchmove({touches:[{clientY:260}],preventDefault(){}});assert.equal(messages.at(-1).delta,40);
 events.message({source:parent,data:{type:'portfolio:local',delta:-200}});assert.equal(scrolls.at(-1),800);
 events.message({source:parent,data:{type:'portfolio:mode',expanded:true}});
 prevented=false;const messagesBefore=messages.length;
 events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});
 assert.equal(prevented,false,'expanded preview must keep native wheel scrolling');assert.equal(messages.length,messagesBefore);
 events.touchmove({touches:[{clientY:200}],preventDefault(){throw Error('expanded touch must stay native');}});
 events.message({source:parent,data:{type:'portfolio:mode',expanded:false}});
 events.wheel({ctrlKey:false,deltaY:80,deltaMode:0,preventDefault(){prevented=true;}});assert.equal(prevented,true);

});
