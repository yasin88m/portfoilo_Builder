import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDemo} from '../public/demo.js';
import {templates,normalize,portfolioHTML} from '../public/shared.js';
test('all template demos include portable portraits, cover and three project images',async()=>{
 const original=globalThis.fetch;let count=0;
 globalThis.fetch=async url=>{count++;assert.match(url,/^\/assets\/demo\/[a-z]+\.(png|webp)$/);return new Response(await readFile(new URL('../public'+url,import.meta.url)));};
 try{
 for(const template of templates)for(const gender of ['man','woman']){
  const d=normalize(await getDemo({template,gender,color:'#059669',paletteOverride:true}));assert.equal(d.template,template);assert.equal(d.paletteOverride,true);assert.ok(d.avatar.startsWith('data:image/png;base64,'));assert.ok(d.cover.startsWith('data:image/webp;base64,'));assert.equal(d.projects.length,3);assert.ok(d.projects.every(p=>p.image.startsWith('data:image/webp;base64,')));assert.ok(JSON.stringify(d).length<5_000_000);
  const restored=normalize(JSON.parse(JSON.stringify(d)));assert.equal(restored.avatar,d.avatar);assert.equal(restored.projects[0].image,d.projects[0].image);const html=portfolioHTML(restored);assert.ok(html.includes(d.avatar));assert.ok(d.projects.every(p=>html.includes(p.image)));assert.ok(!html.includes('/assets/demo/'));
 }
 assert.equal(count,5,'shared assets should download only once');
 }finally{globalThis.fetch=original;}
});
