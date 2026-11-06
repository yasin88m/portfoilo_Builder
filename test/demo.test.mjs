import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDemo,repairDemoPortrait} from '../public/demo.js';
import {templates,normalize,portfolioHTML} from '../public/shared.js';
test('all template demos include portable portraits, cover, projects, plans and reviews',async()=>{
 const original=globalThis.fetch;let count=0;
 globalThis.fetch=async url=>{count++;assert.match(url,/^\/assets\/demo\/[a-z-]+\.(png|webp)$/);return new Response(await readFile(new URL('../public'+url,import.meta.url)));};
 try{
 for(const template of templates)for(const gender of ['man','woman']){
  const d=normalize(await getDemo({template,gender,color:'#059669',paletteOverride:true}));assert.equal(d.template,template);assert.equal(d.paletteOverride,true);assert.ok(d.avatar.startsWith('data:image/png;base64,'));assert.ok(d.cover.startsWith('data:image/webp;base64,'));assert.equal(d.projects.length,3);assert.ok(d.projects.every(p=>p.image.startsWith('data:image/webp;base64,')));assert.ok(JSON.stringify(d).length<5_000_000);
  assert.equal(d.plans.enabled,true);
  assert.equal(d.plans.items.length,3);
  assert.equal(d.plans.items.filter(plan=>plan.featured).length,1);
  assert.equal(d.reviews.length,5);
  const plansPage=portfolioHTML(d,{page:'plans'});
  assert.ok(d.plans.items.every(plan=>plansPage.includes(plan.name)));
  const restored=normalize(JSON.parse(JSON.stringify(d)));assert.equal(restored.avatar,d.avatar);assert.equal(restored.projects[0].image,d.projects[0].image);const html=portfolioHTML(restored);assert.ok(d.reviews.every(review=>html.includes(review.quote)));assert.ok(html.includes(d.avatar));assert.ok(d.projects.every(p=>html.includes(p.image)));assert.ok(!html.includes('/assets/demo/'));
 }
 assert.equal(count,7,'shared assets should download only once');
 for(const [gender,length] of [['woman',47199],['man',81638]]){
  const bytes=await readFile(new URL('../public/assets/demo/'+gender+'.png',import.meta.url));
  const bad='data:image/png;base64,'+bytes.subarray(0,length).toString('base64');
  const fixed=await repairDemoPortrait(bad);assert.equal(fixed,'data:image/png;base64,'+bytes.toString('base64'));
 }
 const custom='data:image/png;base64,AAAA';assert.equal(await repairDemoPortrait(custom),custom);

 }finally{globalThis.fetch=original;}
});
