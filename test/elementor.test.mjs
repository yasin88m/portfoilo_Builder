import test from 'node:test';
import assert from 'node:assert/strict';
import {wordpressFiles} from '../public/wordpress.js';
import {templates} from '../public/shared.js';
const input={name:'سارا',title:'طراح',field:'طراحی',skills:'طراحی، توسعه',services:'خدمت یک\nخدمت دو',projects:[{title:'پروژه یک',description:'جزئیات قابل ویرایش'},{title:'پروژه دو'}]};
function nodes(content){return content.flatMap(n=>[n,...nodes(n.elements||[])]);}
test('all layouts export independent native Elementor widgets for page, header and footer',()=>{
 const layouts=[];
 for(const template of templates){
  const {files}=wordpressFiles({...input,template});
  const docs=['page','header','footer'].map(role=>JSON.parse(files.find(f=>f.path.endsWith('/elementor/'+role+'.json')).content));
  for(const doc of docs){assert.equal(doc.version,'0.4');const all=nodes(doc.content);assert.equal(new Set(all.map(n=>n.id)).size,all.length);assert.ok(all.every(n=>['container','widget'].includes(n.elType)));const widgets=all.filter(n=>n.elType==='widget');assert.ok(widgets.length>=3);assert.ok(widgets.every(n=>['heading','image','button','text-editor'].includes(n.widgetType)));assert.ok(!widgets.some(n=>n.widgetType==='html'));}
  const page=docs[0],all=nodes(page.content),widgets=all.filter(n=>n.elType==='widget');assert.ok(widgets.some(n=>n.settings.title==='پروژه یک'));assert.ok(widgets.some(n=>n.settings.title==='پروژه دو'));assert.ok(widgets.some(n=>n.settings.editor?.includes('جزئیات قابل ویرایش')));assert.ok(all.some(n=>n.settings._element_id==='contact'));assert.ok(all.some(n=>n.settings._element_id==='about'));assert.ok(all.some(n=>n.settings._element_id==='projects'));
  layouts.push(JSON.stringify(all.map(n=>({type:n.widgetType||n.elType,settings:n.settings}))));
  const front=files.find(f=>f.path.endsWith('/front-page.php')).content;assert.ok(front.includes('the_content()'));assert.ok(files.some(f=>f.path.endsWith('/page.php')));assert.ok(files.some(f=>f.path.endsWith('/inc/elementor.php')));
 }
 assert.equal(new Set(layouts).size,6,'layouts should retain distinct styling and composition');
});
test('Elementor template text is escaped and media stays packaged instead of embedded in JSON',()=>{
 const {files}=wordpressFiles({...input,name:'<script>bad</script>',template:'coral',avatar:'data:image/png;base64,AAAA'});
 const doc=JSON.parse(files.find(f=>f.path.endsWith('/elementor/page.json')).content);
 const all=nodes(doc.content);assert.ok(all.some(n=>n.settings.title?.includes('&lt;script&gt;')));const photo=all.find(n=>n.widgetType==='image');assert.equal(photo.settings.image.url,'assets/images/avatar.png');assert.equal(photo.settings['object-fit'],'contain');assert.equal(photo.settings.image_border_radius.top,'0');assert.ok(!JSON.stringify(doc).includes('data:image/'));
});
