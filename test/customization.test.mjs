import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,portfolioHTML,templates,palettes} from '../public/shared.js';
import {wordpressFiles} from '../public/wordpress.js';
const nodes=all=>all.flatMap(n=>[n,...nodes(n.elements||[])]);
const sample={name:'آزمایش',title:'طراح',skills:'طراحی، توسعه، پژوهش',skillsMode:'percent',skillLevels:[{name:'طراحی',percent:50},{name:'توسعه',percent:0},{name:'پژوهش',percent:100}],projects:[{title:'نمونه',url:'https://example.com'}],design:{colors:{buttonBg:'#123456',buttonText:'#fff',heading:'#abc',heroHeading:'#abcdef',skill:'#098765'},text:{heroTitle:'سلام تازه',projectsHeading:'کارهای سفارشی',primaryButton:'دیدن آثار',serviceButton:'خدمات تازه'},order:['projects','skills','about','services','contact'],sections:{services:false},radius:24,projectColumns:2}};
test('design normalization accepts arbitrary colors, migrates old backups and rejects unsafe configuration',()=>{
 assert.ok(palettes.length>=32);const old=normalize({name:'قدیمی',color:'#123456'});assert.equal(old.color,'#123456');assert.equal(old.skillsMode,'list');assert.deepEqual(old.design.colors,{});
 const safe=normalize({...sample,design:{colors:{heading:'red;display:none',buttonText:'#fff',unknown:'#123456'},text:{heroTitle:'<script>evil</script>',unknown:'bad'},order:['projects','bad','projects'],radius:100,projectColumns:100}});
 const attack=wordpressFiles({...sample,design:{text:{heroTitle:'<?php die("CUSTOM_INJECTED"); ?>',projectsHeading:'<?php die("CUSTOM_INJECTED"); ?>'}}});for(const file of attack.files.filter(f=>f.path.endsWith('.php')))assert.ok(!file.content.includes('CUSTOM_INJECTED'));
 assert.deepEqual(safe.design.colors,{buttonText:'#ffffff'});assert.equal(safe.design.radius,40);assert.equal(safe.design.projectColumns,3);assert.deepEqual(safe.design.order,['projects']);assert.match(portfolioHTML(safe),/&lt;script&gt;evil&lt;\/script&gt;/);
 const percentages=normalize({skills:'طراحی:۵۰، توسعه ١٠٠٪، تست:999، صفر:0',skillsMode:'percent'}).skillLevels;assert.deepEqual(percentages.map(s=>s.percent),[50,100,100,0]);assert.deepEqual(percentages.map(s=>s.name),['طراحی','توسعه','تست','صفر']);
});
test('every template carries custom design and real 0/50/100 skill bars through HTML and WordPress/Elementor',()=>{
 for(const template of templates){
  const p={...sample,template},html=portfolioHTML(p),main=html.match(/<main>([\s\S]*?)<\/main>/)[1];
  assert.match(html,/--button-bg:#123456/);assert.match(html,/--button-text:#ffffff/);assert.match(main,/سلام تازه/);assert.match(main,/کارهای سفارشی/);assert.ok(main.indexOf('id="projects"')<main.indexOf('id="skills"'));assert.doesNotMatch(main,/id="services"/);
  for(const percent of [0,50,100])assert.match(main,new RegExp(`aria-valuenow="${percent}"><span style="width:${percent}%"`));
  const list=portfolioHTML({...p,skillsMode:'list'}).match(/<main>([\s\S]*?)<\/main>/)[1];assert.doesNotMatch(list,/role="progressbar"|class="skill-line"/);
  const {files}=wordpressFiles(p),get=name=>files.find(f=>f.path.endsWith('/'+name)).content;
  assert.match(get('front-page.php'),/pfb_skill_cards\(\)/);assert.match(get('front-page.php'),/pfb_label\('projectsHeading'\)/);assert.doesNotMatch(get('front-page.php'),/PFBLABEL|PFBTOKEN/);assert.match(get('header.php'),/custom-buttonBg/);assert.match(get('header.php'),/pfb_color\('buttonBg'\)/);
  const seed=JSON.parse(get('portfolio-data.json'));assert.equal(seed.labels.projectsHeading,'کارهای سفارشی');assert.equal(seed.colors.buttonBg,'#123456');assert.equal(seed.skillLevels[0].percent,50);
  const doc=JSON.parse(get('elementor/page.json')),all=nodes(doc.content),progress=all.filter(n=>n.widgetType==='progress');assert.deepEqual(progress.map(n=>n.settings.percent.size),[50,0,100]);assert.ok(progress.every(n=>n.settings.bar_color==='#098765'));assert.ok(all.some(n=>n.settings.title==='کارهای سفارشی'));assert.ok(all.some(n=>n.widgetType==='button'&&n.settings.text==='دیدن آثار'&&n.settings.background_color==='#123456'));assert.equal(doc.content[1].settings._element_id,'projects');assert.ok(!all.some(n=>n.settings._element_id==='services'));
 }
});

test('a palette recolors coral surfaces and gradient tones while preserving manual overrides', () => {
 const input = {template:'coral', color:'#2563eb', paletteOverride:true, design:{colors:{buttonBg:'#123456'}}};
 const html = portfolioHTML(input);
 const rgb = color => color.slice(1).match(/../g).map(channel => parseInt(channel,16));
 for (const token of ['bg','panel','tone-ffb79888','tone-dfd2c5']) {
  const color = html.match(new RegExp('--'+token+':(#[a-f0-9]+)'))[1];
  const [red,,blue] = rgb(color);
  assert.ok(blue > red, token + ' should be blue');
  if (token.endsWith('88')) assert.equal(color.slice(-2),'88');
 }
 assert.match(html,/--button-bg:#123456/);
 assert.doesNotMatch(portfolioHTML({...input,paletteOverride:false}),/--tone-ffb79888:/);
});
