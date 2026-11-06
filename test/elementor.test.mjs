import test from 'node:test';
import assert from 'node:assert/strict';
import {wordpressFiles} from '../public/wordpress.js';
import {templates,normalize,portfolioHTML,socialNetworks} from '../public/shared.js';
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
 assert.equal(new Set(layouts).size,templates.length,'layouts should retain distinct styling and composition');
});
test('Elementor template text is escaped and media stays packaged instead of embedded in JSON',()=>{
 const {files}=wordpressFiles({...input,name:'<script>bad</script>',template:'coral',avatar:'data:image/png;base64,AAAA'});
 const doc=JSON.parse(files.find(f=>f.path.endsWith('/elementor/page.json')).content);
 const all=nodes(doc.content);assert.ok(all.some(n=>n.settings.title?.includes('&lt;script&gt;')));const photo=all.find(n=>n.widgetType==='image');assert.equal(photo.settings.image.url,'assets/images/avatar.png');assert.equal(photo.settings['object-fit'],'contain');assert.equal(photo.settings.image_border_radius.top,'0');assert.ok(!JSON.stringify(doc).includes('data:image/'));
});

test('footer networks survive export and only configured links are shown', () => {
 const migrated = normalize({social:'https://www.instagram.com/old'});
 assert.equal(migrated.socialInstagram,'https://www.instagram.com/old');
 assert.equal(migrated.social,'');
 assert.equal(normalize({...migrated,socialInstagram:''}).socialInstagram,'');
 assert.equal(normalize({social:'https://example.com'}).social,'https://example.com/');
 const links = Object.fromEntries(socialNetworks.map(({key},index)=>[key,'https://example.com/'+index]));
 delete links.socialFacebook;
 links.socialYouTube = 'javascript:alert(1)';
 for (const template of templates) {
  const data = {...input,...links,template};
  const footer = portfolioHTML(data).match(/<footer>(.*?)<\/footer>/s)[1];
  assert.equal((footer.match(/<svg /g)||[]).length,4);
  assert.match(footer,/aria-label="ایکس"/);
  assert.doesNotMatch(footer,/فیسبوک|یوتیوب|javascript:/);
  assert.doesNotMatch(portfolioHTML({...input,template}).match(/<footer>(.*?)<\/footer>/s)[1],/<nav/);
  const {files} = wordpressFiles(data);
  const file = suffix => files.find(entry=>entry.path.endsWith(suffix)).content;
  const widget = nodes(JSON.parse(file('/elementor/footer.json')).content).find(node=>node.widgetType==='social-icons');
  assert.deepEqual(widget.settings.social_icon_list.map(item=>item.link.url), [links.socialInstagram,links.socialLinkedIn,links.socialX,links.socialTelegram]);
  assert.equal(widget.settings.social_icon_list[2].social_icon.value,'fab fa-x-twitter');
  assert.match(file('/footer.php'),/pfb_social_footer\(\)/);
  assert.equal(JSON.parse(file('/portfolio-data.json')).socialX,links.socialX);
 }
});
