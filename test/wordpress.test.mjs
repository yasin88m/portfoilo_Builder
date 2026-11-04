import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {wordpressFiles,wordpressZIP} from '../public/wordpress.js';
import {templates} from '../public/shared.js';
import {zipFiles} from '../public/zip.js';
const sample={name:'سارا',title:'طراح',field:'طراحی',slug:'sara',skills:'طراحی، توسعه',services:'طراحی\nمشاوره',projects:[{title:'اول',description:'نمونه‌کار اول'}]};
test('all six WordPress themes have native templates, hooks, editable data and no unresolved markers',()=>{
 for(const template of templates){
  const {files}=wordpressFiles({...sample,template});const get=name=>files.find(f=>f.path==='portfolio-sara/'+name)?.content;
  for(const required of ['style.css','index.php','functions.php','front-page.php','header.php','footer.php','singular.php','comments.php','404.php','theme.json','rtl.css','portfolio-data.json','readme.txt'])assert.ok(get(required),required);
  assert.match(get('style.css'),/Theme Name:/);assert.match(get('header.php'),/wp_head\(\)/);assert.match(get('header.php'),/wp_body_open\(\)/);assert.match(get('footer.php'),/wp_footer\(\)/);
  assert.match(get('functions.php'),/customize_register/);assert.match(get('functions.php'),/get_the_post_thumbnail_url/);assert.match(get('functions.php'),/wp_insert_post/);assert.match(get('functions.php'),/check_admin_referer/);
  assert.match(get('front-page.php'),/pfb_project_cards\(\)/);assert.ok(!get('front-page.php').includes('<iframe'));
  for(const file of files)if(typeof file.content==='string'&&file.path.endsWith('.php'))assert.doesNotMatch(file.content,/PFBTOKEN|PFBPROJECT|UEZCQVZBVEFS|UEZCQ09WRVI=/);
  const seed=JSON.parse(get('portfolio-data.json'));assert.equal(seed.name,sample.name);assert.equal(seed.projects[0].title,'اول');assert.equal(seed.headline,sample.title);assert.equal(JSON.parse(get('theme.json')).version,2);
  assert.equal(files.filter(f=>f.path.endsWith('.woff')).length,2);
 }
});
test('uploaded content cannot inject PHP code into templates',()=>{
 const attack='<?php die("INJECTED"); ?><script>alert(1)</script>';
 const {files}=wordpressFiles({...sample,name:attack,bio:attack,projects:[{title:attack,description:attack}]});
 for(const f of files)if(f.path.endsWith('.php'))assert.ok(!f.content.includes('INJECTED'));
 assert.ok(files.some(f=>f.path.endsWith('portfolio-data.json')&&f.content.includes('INJECTED')));
});
test('ZIP round trip preserves binary images, fonts and UTF-8 filenames using Python independent decoder',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pfb-zip-'));
 try{
  const zip=wordpressZIP({...sample,avatar:'data:image/png;base64,'+(await readFile(new URL('../public/assets/demo/woman.png',import.meta.url))).toString('base64')});
  await writeFile(join(dir,'theme.zip'),zip);
  await writeFile(join(dir,'unicode.zip'),zipFiles([{path:'قالب/آزمایش.txt',content:'سلام'},{path:'قالب/binary.bin',content:new Uint8Array([0,255,128,10])}]));
  const verify=spawnSync('python3',['-c',`import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert 'portfolio-sara/style.css' in z.namelist();assert len(z.read('portfolio-sara/assets/images/avatar.png'))==214060\nu=zipfile.ZipFile(sys.argv[2]);assert u.read('قالب/آزمایش.txt').decode()=='سلام';assert u.read('قالب/binary.bin')==bytes([0,255,128,10])`,join(dir,'theme.zip'),join(dir,'unicode.zip')],{encoding:'utf8'});
  assert.equal(verify.status,0,verify.stderr);
  assert.throws(()=>zipFiles([{path:'../evil.php',content:'x'}]));
 }finally{await rm(dir,{recursive:true,force:true});}
});
const php=process.env.PFB_PHP_BIN||'php';const phpReady=spawnSync(php,['-v']).status===0;
test('generated PHP syntax is valid for every template',{skip:!phpReady},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pfb-php-'));
 try{for(const template of templates){for(const f of wordpressFiles({...sample,template}).files.filter(f=>f.path.endsWith('.php'))){const path=join(dir,template,f.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,f.content);const r=spawnSync(php,['-l',path],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}}}finally{await rm(dir,{recursive:true,force:true});}
});
