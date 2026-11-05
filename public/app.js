import {zipFiles} from './zip.js';
import {siteEditor,projectFields,bindSiteEditor} from './site-editor.js';
import {designControls,skillControls,bindCustomization} from './customize-ui.js';
import {normalizeDesign,paletteNames} from './customize.js';
import {wordpressZIP} from './wordpress.js';
import {icon,mountIcons} from './icons.js';
import {initBuilderScroll} from './builder-scroll.js';
import {initPreviews} from './preview.js';
import {getDemo,repairDemoPortrait} from './demo.js';
import{normalize,portfolioHTML,portfolioFiles,palettes,templates,templateNames,templateDescriptions,socialNetworks,safeURL,escapeHTML as e}from'./shared.js';
const $=s=>document.querySelector(s);
const builderURL = new URL(location.href);
const requestedSite = builderURL.searchParams.get('site');
const newSite = builderURL.searchParams.has('new');
const localKey = 'portfolio-builder-v1';
let key = newSite ? localKey + ':new' : localKey;
let data={name:'',title:'',field:'',bio:'',skills:'',experience:'',education:'',email:'',phone:'',location:'',social:'',avatar:'',cover:'',services:'',headline:'',paletteOverride:false,projects:[],plans:{enabled:false,items:[]},reviews:[],color:palettes[0],template:'codecraft',design:normalizeDesign({}),skillsMode:'list',skillLevels:[],slug:'my-portfolio',domain:''},step=0,user=null;
try{const saved=requestedSite ? null : localStorage.getItem(key);if(saved)data={...data,...normalize(JSON.parse(saved))};}catch{}
function selectTemplate(template) {
 data.template = template;
 data.color = palettes[0];
 data.paletteOverride = false;
 data.design = normalizeDesign();
}
const entryUrl = new URL(location.href);
const requested = entryUrl.searchParams.get('template');
if (templates.includes(requested)) {
 selectTemplate(requested);
 entryUrl.searchParams.delete('template');
 history.replaceState(history.state, '', entryUrl);
}
const names=['اطلاعات شما','نمونه‌کارها','قالب و رنگ','دامنه و خروجی'];const descriptions=['با معرفی خودت شروع کن؛ اینجا نقطه آغاز داستان توست.','بهترین کارهایت را انتخاب کن؛ کیفیت مهم‌تر از تعداد است.','ظاهر وب‌سایتت را با سلیقه و تخصص خودت هماهنگ کن.','آدرس دلخواه را ثبت کن و سایتت را برای انتشار تحویل بگیر.'];
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500);}
let saveTimer = 0;
function flushSave() {
 clearTimeout(saveTimer);
 saveTimer = 0;
 if (publication?.id || requestedSite) { $('#saveState').textContent = 'برای ثبت تغییرات، سایت را در حساب ذخیره کن'; return; }
 try {
  localStorage.setItem(key, JSON.stringify(data));
  $('#saveState').textContent = 'ذخیره شد · روی این دستگاه';
 } catch {
  toast('حافظه مرورگر پر است؛ پشتیبان اطلاعات را دریافت کنید.');
 }
}
function save() {
 clearTimeout(saveTimer);
 saveTimer = setTimeout(flushSave, 300);
}
addEventListener('pagehide', () => { if (saveTimer) flushSave(); });
if (templates.includes(requested)) save();

const previewFrame = $('#preview');
let previewTimer = 0;
let previewPort;
let lastView;
const previewPage = $('#previewPage');
previewPage.onchange = () => preview();
function previewPages() {
 const current=previewPage.value;
 const pages=[['home','خانه'],['works','همه نمونه‌کارها'],...data.projects.filter(project=>project.id&&project.title).map(project=>[project.id,project.title]),...(data.plans.enabled?[['plans','پلن‌ها']]:[])];
 const markup=pages.map(([id,title])=>`<option value="${e(id)}">${e(title)}</option>`).join('');
 if(previewPage.innerHTML!==markup){
  previewPage.innerHTML=markup;
  previewPage.value=pages.some(([id])=>id===current)?current:'home';
 }
}

function preview() {
 if (!previewTimer) previewTimer = setTimeout(updatePreview, 100);
}

function updatePreview() {
 previewTimer = 0;
 try {
  previewPages();
  const html = portfolioHTML({
   ...data,
   domain: '',
   email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? data.email : '',
   slug: 'my-portfolio'
  }, {page:previewPage.value});
  const [, className, style, markup] = /<body class="([^"]*)" style="([^"]*)">([\s\S]*)<\/body>/.exec(html);
  $('#previewAddress').textContent = data.domain || `${data.slug || 'your-name'}.portfolio`;
  if (!previewPort) return;
  const view = { type: 'portfolio:update' };
  if (!lastView) view.stylesheet = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  if (lastView?.className !== className) view.className = className;
  if (lastView?.style !== style) view.style = style;
  if (lastView?.markup !== markup) view.markup = markup;
  if (Object.keys(view).length > 1) previewPort.postMessage(view);
  lastView = { className, style, markup };
 } catch {
  // Keep the last valid preview while input is incomplete.
 }
}

addEventListener('message', event => {
 if (previewPort || event.source !== previewFrame.contentWindow || event.data?.type !== 'portfolio:ready' || !event.ports[0]) return;
 previewPort = event.ports[0];
 preview();
});

function connectPreview() {
 if (!previewPort) previewFrame.contentWindow?.postMessage({ type: 'portfolio:hello' }, '*');
}
previewFrame.addEventListener('load', connectPreview);
connectPreview();

function field(label,name,type='text',full=false){return `<label class="field ${full?'full':''}">${label}${type==='textarea'?`<textarea data-key="${name}" rows="3" maxlength="3000">${e(data[name])}</textarea>`:`<input data-key="${name}" type="${type}" value="${e(data[name])}" ${['email','url'].includes(type)?'dir="ltr"':''} maxlength="600">`}</label>`;}
let onlineConfigured = null;
let publication = null;
let publicationBusy = false;
let publicationError = '';

function publicationControls() {
 const panel = $('#publication');
 if (!panel) return;
 const heading = '<h3>انتشار و لینک اشتراک‌گذاری</h3>';
 if (onlineConfigured === null) {
  panel.innerHTML = heading + '<p>در حال بررسی وضعیت حساب…</p>';
  return;
 }
 if (!onlineConfigured) {
  panel.innerHTML = heading + '<p>ارتباط با حساب کاربری برقرار نشد.</p>';
  return;
 }
 if (!user) {
  panel.innerHTML = heading + '<a class="button secondary" href="/account?from=builder">ورود یا ساخت حساب برای انتشار</a>';
  return;
 }
 const url = publication?.url;
 const disabled = publicationBusy ? 'disabled' : '';
 panel.innerHTML = `${heading}<p>اطلاعات این نسخه عمومی می‌شود. ویرایش پیش‌نویس تا انتشار دوباره روی لینک اثر نمی‌گذارد.</p>
  ${url ? `<label class="field">لینک عمومی<input id="publishedUrl" type="url" readonly dir="ltr" value="${e(url)}"></label>
  <div><a class="button secondary" href="${e(url)}" target="_blank" rel="noopener">باز کردن سایت</a>
  <button type="button" class="button secondary" id="copyPublished">کپی لینک</button></div>` : ''}
  <div>${!requestedSite || publication ? `<button type="button" class="button" id="publishPortfolio" ${disabled}>${url ? 'به‌روزرسانی سایت' : 'انتشار و ساخت لینک'}</button>` : ''}
  ${url ? `<button type="button" class="textbutton" id="unpublishPortfolio" ${disabled}>لغو انتشار</button>` : ''}
  <button type="button" class="textbutton" id="refreshPublication" ${disabled}>تازه‌کردن وضعیت</button></div>
  <p role="status">${publicationBusy ? 'در حال انجام…' : e(publicationError || (url ? 'منتشر شده' : publication ? 'هنوز منتشر نشده' : ''))}</p>`;
 $('#refreshPublication').onclick = () => loadSite();
 if ($('#publishPortfolio')) $('#publishPortfolio').onclick = () => {
  if (valid()) updatePublication('publish');
 };
 if ($('#unpublishPortfolio')) $('#unpublishPortfolio').onclick = () => {
  if (confirm('لینک عمومی تا انتشار دوباره غیرفعال شود؟')) updatePublication('unpublish');
 };
 if ($('#copyPublished')) $('#copyPublished').onclick = async () => {
  try { await navigator.clipboard.writeText(url); toast('لینک کپی شد.'); }
  catch { $('#publishedUrl')?.select(); toast('لینک انتخاب شد. آن را کپی کن.'); }
 };
}

async function siteRequest(path, options) {
 const response = await fetch(path, options);
 const result = await response.json();
 if (!response.ok) throw Error(result.error || 'ارتباط با حساب برقرار نشد.');
 return result;
}

async function updatePublication(action) {
 if (publicationBusy) return;
 if (!user) { location.assign('/account?from=builder'); return; }
 if (requestedSite && !publication) return;
 publicationBusy = true;
 publicationError = '';
 publicationControls();
 $('#next').disabled = true;
 try {
  const site = publication?.id;
  const result = await siteRequest('/api/sites' + (site ? '/' + site : ''), {
   method: site ? 'PUT' : 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ revision: publication?.revision, action, ...(action === 'unpublish' ? {} : { portfolio: normalize(data) }) })
  });
  publication = result;
  if (!site) {
   const url = new URL(location.href);
   url.searchParams.delete('new');
   url.searchParams.set('site', result.id);
   history.replaceState(history.state, '', url);
  }
  toast({ publish: 'صفحه عمومی سایت ساخته شد.', save: 'سایت در پنل شما ذخیره شد.', unpublish: 'انتشار لغو شد.' }[action]);
 } catch (error) {
  publicationError = error.message;
  toast(error.message);
 } finally {
  publicationBusy = false;
  $('#next').disabled = false;
  publicationControls();
 }
}

async function loadSite() {
 const site = publication?.id || requestedSite;
 if (!site || publicationBusy) return;
 if (publication && !confirm('نسخه حساب جایگزین پیش‌نویس فعلی شود؟')) return;
 publicationBusy = true;
 publicationError = '';
 publicationControls();
 try {
  const result = await siteRequest('/api/sites/' + encodeURIComponent(site));
  data = normalize(result.portfolio);
  publication = result;
  preview();
 } catch (error) {
  publicationError = error.message;
  toast(error.message);
 } finally {
  publicationBusy = false;
  render();
 }
}

function render(){
 const openDetails=[...document.querySelectorAll('.design-studio details[open]')].map(x=>x.id);
 $('.steps').innerHTML=names.map((n,i)=>`<button type="button" class="step ${i===step?'active':''}" data-step="${i}" ${i===step?'aria-current="step"':''}><b>${(i+1).toLocaleString('fa')}</b>${n}</button>`).join('');$('#stepTitle').textContent=names[step];$('#stepCounter').textContent=`قدم ${(step+1).toLocaleString('fa')} از ۴`;$('#stepDescription').textContent=descriptions[step];$('#back').hidden=step===0;$('#next').innerHTML=step===3?`${icon('save')} ذخیره در حساب من`:`ادامه مسیر ${icon('arrowLeft')}`;$('#error').textContent='';
 let html='';if(step===0)html=`<div class="upload">${data.avatar?`<img class="avatar" src="${data.avatar}" alt="تصویر شما">`:'<span class="avatar">♙</span>'}<div><label>تصویر پروفایل<input type="file" data-image="avatar" accept="image/png,image/jpeg,image/webp"></label><small>عکس نیم‌تنه بارگذاری کن؛ تصویر کامل بدون برش نمایش داده می‌شود. JPG، PNG یا WebP · حداکثر ۸ مگابایت</small>${data.avatar?'<button type="button" id="removeAvatar" class="textbutton">حذف تصویر</button>':''}</div></div><div class="upload"><div><label>تصویر کاور (برای قالب طبیعت و بخش معرفی)<input type="file" data-image="cover" accept="image/png,image/jpeg,image/webp"></label>${data.cover?'<button type="button" id="removeCover" class="textbutton">حذف کاور</button>':''}</div>${data.cover?`<img src="${data.cover}" class="avatar" alt="کاور">`:''}</div><div class="form-grid">${field('نام و نام خانوادگی *','name')}${field('عنوان حرفه‌ای *','title')}${field('حیطه کاری *','field')}${field('شهر / محل فعالیت','location')}${field('تیتر اصلی سایت','headline','text',true)}${field('درباره من','bio','textarea',true)}${field('خدمات (هر خدمت در یک خط)','services','textarea',true)}${field('مهارت‌ها (با ویرگول جدا کن)','skills','textarea',true)}${skillControls(data)}${field('سوابق کاری','experience','textarea',true)}${field('تحصیلات و گواهینامه‌ها','education','textarea',true)}${field('ایمیل عمومی','email','email')}${field('شماره تماس عمومی','phone','tel')}</div><h3>شبکه‌های اجتماعی فوتر</h3><p class="note">لینک کامل هر شبکه را وارد کن. آیکن فیلدهای خالی نمایش داده نمی‌شود.</p><div class="form-grid">${socialNetworks.map(({key,label,icon:name})=>field(icon(name)+' لینک '+label,key,'url')).join('')}${data.social?field('لینک عمومی قبلی (بخش تماس)','social','url',true):''}</div>`;
 if(step===1)html=data.projects.map((p,i)=>`<article class="project-editor"><div class="project-heading"><strong>پروژه ${(i+1).toLocaleString('fa')}</strong><button type="button" data-delete="${i}" class="textbutton">${icon('trash')} حذف</button></div><div class="form-grid">${['title','category','description','url'].map((k,j)=>`<label class="field ${j>1?'full':''}">${['نام پروژه *','دسته / حوزه','توضیحات و نتیجه','لینک پروژه'][j]}<${k==='description'?'textarea':'input'} data-project="${i}" data-prop="${k}" ${k==='description'?'':`value="${e(p[k])}" type="${k==='url'?'url':'text'}"`}>${k==='description'?e(p[k])+'</textarea>':''}</label>`).join('')}<label class="field full">تصویر پروژه<input type="file" data-image="${i}" accept="image/png,image/jpeg,image/webp"></label>${projectFields(p,i)}${p.image?`<img src="${p.image}" alt="پروژه" style="max-width:100%;height:90px;border-radius:8px"><button type="button" data-remove-image="${i}" class="textbutton">حذف تصویر</button>`:''}</div></article>`).join('')+`<button type="button" id="addProject" class="button secondary">${icon('plus')} افزودن پروژه جدید</button><p class="note">می‌توانی بدون نمونه‌کار هم ادامه بدهی و بعداً آن‌ها را اضافه کنی. حداکثر ۱۲ پروژه.</p>`;
 if(step===2)html=`<h3>قالب وب‌سایت</h3><div class="templates">${templates.map((t,i)=>`<button type="button" data-template="${t}" aria-pressed="${data.template===t}" class="template ${data.template===t?'selected':''}"><div class="template-art"><iframe sandbox="" title="${templateNames[i]}" tabindex="-1"></iframe></div>${templateNames[i]}<small>${templateDescriptions[i]}</small></button>`).join('')}</div><h3>پالت رنگی</h3><div class="swatches">${palettes.map((c,i)=>`<button type="button" class="swatch ${data.paletteOverride&&data.color===c?'selected':''}" data-color="${c}" style="--swatch-color:${c}" title="${paletteNames[i]}" aria-label="${paletteNames[i]}" aria-pressed="${data.paletteOverride&&data.color===c}"></button>`).join('')}</div><p class="note">همه قالب‌ها واکنش‌گرا هستند. یک طیف برای کل قالب انتخاب کن یا در پایین، رنگ هر بخش را دقیق تنظیم کن.</p>${designControls(data)}`;
 if(step===3)html=`${siteEditor(data)}<div id="publication" class="export-options"></div><div class="export-options"><h3>نوع خروجی را انتخاب کن</h3><p>وب‌سایت مستقل یا قالب قابل نصب وردپرس؛ هر دو با اطلاعات و ظاهر انتخابی تو.</p><div><button type="button" id="exportHTMLStep" class="button secondary">${icon('monitor')} سایت مستقل HTML</button><button type="button" id="exportWordpressStep" class="button">${icon('layers')} وردپرس + المنتور ZIP</button></div><small>وردپرس + المنتور: از پنل راه‌اندازی قالب، صفحه اصلی، سربرگ و فوتر را بساز؛ متن‌ها، عکس‌ها، دکمه‌ها و کارت پروژه‌ها با المنتور رایگان قابل ویرایش‌اند.</small></div><div class="summary"><h3>${e(data.name||'پورتفولیوی شما')} ✦</h3><p>${e(data.title)} · ${data.projects.length.toLocaleString('fa')} نمونه‌کار · آماده دریافت خروجی</p></div><div class="form-grid">${field('شناسه سایت (انگلیسی)','slug','text',true)}${field('دامنه اختصاصی (اختیاری)','domain','text',true)}</div><p class="note">دامنه را مانند example.com وارد کن. این مرحله دامنه را خریداری یا خودکار متصل نمی‌کند.</p><details><summary>راهنمای نصب قالب وردپرس</summary><ol><li>وردپرس را روی هاست نصب کن.</li><li>از نمایش ← پوسته‌ها ← افزودن ← بارگذاری، ZIP دریافتی را نصب و فعال کن.</li><li>از نمایش ← راه‌اندازی پورتفولیو، المنتور رایگان را نصب و فعال کن؛ سپس صفحات آماده را بساز.</li><li>صفحه اصلی، سربرگ و فوتر را با دکمه «ویرایش با المنتور» تغییر بده؛ برای انتشار و تعیین صفحه اصلی از گزینه‌های راه‌انداز استفاده کن.</li></ol></details><details><summary>راهنمای اتصال به دامنه برای خروجی HTML</summary><ol><li>بسته ZIP سایت را باز کن و همه فایل‌ها را با هم در ریشه هاست بارگذاری کن.</li><li>دامنه را در پنل هاست اضافه کن.</li><li>رکورد A یا CNAME را دقیقاً طبق مقدار اعلام‌شده توسط شرکت هاست تنظیم کن.</li><li>پس از تأیید DNS، گواهی HTTPS را در پنل هاست فعال کن.</li></ol></details><p class="note">${user?'سایت را در پنل حساب ذخیره کن یا برای آن لینک عمومی بساز.':'برای ذخیره آنلاین وارد حساب شو. خروجی سایت و پشتیبان بدون ورود هم قابل دریافت‌اند.'}</p><a href="/account" class="button secondary">رفتن به پنل سایت‌ها</a>`;
 $('#fields').innerHTML=html;bindSiteEditor($('#fields'),data,{change:()=>{save();preview();},render,readImage,toast});publicationControls();bindCustomization(data,()=>{save();preview();},render);openDetails.forEach(id=>{const detail=document.getElementById(id);if(detail)detail.open=true;});if($('#exportHTMLStep'))$('#exportHTMLStep').onclick=exportHTML;if($('#exportWordpressStep'))$('#exportWordpressStep').onclick=exportWordpress;
 document.querySelectorAll('.template-art iframe').forEach((f,i)=>{getDemo({template:templates[i]}).then(d=>{if(f.isConnected)f.srcdoc=portfolioHTML(d);}).catch(()=>{if(f.isConnected)f.title='بارگذاری دمو ناموفق؛ دوباره قالب‌ها را باز کنید';});});
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(+b.dataset.step>step&&!valid())return;step=+b.dataset.step;render();});
 document.querySelectorAll('[data-key]').forEach(el=>el.oninput=()=>{data[el.dataset.key]=el.value;save();preview();});
 document.querySelectorAll('[data-project]').forEach(el=>el.oninput=()=>{data.projects[+el.dataset.project][el.dataset.prop]=el.value;save();preview();});
 document.querySelectorAll('[data-image]').forEach(el=>el.onchange=async()=>{try{const img=await readImage(el.files[0]);if(el.dataset.image==='avatar')data.avatar=img;else if(el.dataset.image==='cover')data.cover=img;else data.projects[+el.dataset.image].image=img;save();preview();render();}catch(err){toast(err.message);}});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('این پروژه حذف شود؟')){data.projects.splice(+b.dataset.delete,1);save();preview();render();}});
 document.querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=()=>{data.projects[+b.dataset.removeImage].image='';save();preview();render();});
 document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{selectTemplate(b.dataset.template);save();preview();render();});document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{data.color=b.dataset.color;data.paletteOverride=true;delete data.design.colors.accent;save();preview();render();});
 if($('#addProject'))$('#addProject').onclick=()=>{if(data.projects.length>=12)return toast('حداکثر ۱۲ پروژه مجاز است.');data.projects.push({id:'work-'+crypto.randomUUID(),gallery:[],title:'',category:'',description:'',url:'',image:''});save();render();};
 if($('#removeCover'))$('#removeCover').onclick=()=>{data.cover='';save();preview();render();};if($('#removeAvatar'))$('#removeAvatar').onclick=()=>{data.avatar='';save();preview();render();};
}
function valid(){try{if(!data.name.trim()||!data.title.trim()||!data.field.trim())throw Error('نام، عنوان حرفه‌ای و حیطه کاری را تکمیل کن.');if(step>=1&&data.projects.some(p=>!p.title.trim()))throw Error('نام همه پروژه‌ها را وارد کن یا پروژه خالی را حذف کن.');normalize(data);for(const p of data.projects)if(p.url&&!/^https?:\/\//i.test(p.url))throw Error('لینک پروژه باید با https:// یا http:// شروع شود.');for(const {key,label} of [...socialNetworks,{key:'social',label:'لینک عمومی'}])if(data[key]?.trim()&&!safeURL(data[key]))throw Error('آدرس '+label+' را با https:// یا http:// وارد کن.');return true;}catch(err){$('#error').textContent=err.message;return false;}}
async function readImage(file){if(!file)throw Error('تصویری انتخاب نشده');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('تصویر باید JPG، PNG یا WebP و کمتر از ۸ مگابایت باشد.');const img=await createImageBitmap(file);const scale=Math.min(1,1000/img.width,1000/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);img.close();return canvas.toDataURL('image/webp',.78);}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#wizard').onsubmit=async event=>{event.preventDefault();if(!valid())return;if(step<3){step++;render();return;}await updatePublication('save');};
$('#back').onclick=()=>{step=Math.max(0,step-1);render();};function exportHTML(){if(!valid())return;download(zipFiles(portfolioFiles(data)),'portfolio-'+(data.slug||'site')+'.zip','application/zip');toast('بسته HTML چندصفحه‌ای آماده شد.');}
function exportWordpress(){if(!valid())return;try{download(wordpressZIP(data),'portfolio-'+(data.slug||'my-portfolio')+'-wordpress.zip','application/zip');toast('قالب وردپرس آماده شد؛ ZIP را از نمایش ← پوسته‌ها ← افزودن نصب کن.');}catch(err){toast('ساخت قالب انجام نشد: '+err.message);}}
$('#export').onclick=exportHTML;$('#exportWordpress').onclick=exportWordpress;$('#backup').onclick=()=>download(JSON.stringify(data,null,2),'portfolio-backup.json','application/json');$('#restore').onchange=async ev=>{try{const file=ev.target.files[0];if(!file)return;if(file.size>5_000_000)throw Error('فایل بیش از حد بزرگ است');const p=normalize(JSON.parse(await file.text()));if(!confirm('اطلاعات فعلی با فایل پشتیبان جایگزین شود؟'))return;data=p;save();render();preview();toast('پشتیبان بازیابی شد');}catch(err){toast(err.message);}ev.target.value='';};
async function fillDemo(gender){if(data.name&&!confirm('اطلاعات فعلی با دموی تصویری جایگزین شود؟ ابتدا می‌توانی پشتیبان بگیری.'))return;const buttons=[$('#loadDemo'),$('#loadDemoMan')];buttons.forEach(b=>b.disabled=true);try{const sample=await getDemo({gender,template:data.template,color:data.color,paletteOverride:data.paletteOverride});sample.design=normalizeDesign(data.design);sample.skillsMode=data.skillsMode||'list';data=normalize(sample);save();preview();render();toast('دموی تصویری آماده شد؛ همه مشخصات قابل ویرایش هستند.');}catch(err){toast(err.message);}finally{buttons.forEach(b=>b.disabled=false);}}
$('#loadDemo').onclick=()=>fillDemo('woman');$('#loadDemoMan').onclick=()=>fillDemo('man');
$('#templatesLink').onclick=()=>{step=2;render();$('#workspace').scrollIntoView();};$('#help').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=()=>$('#helpDialog').close();function expandPreview(expanded){const panel=$('.preview-panel');panel.classList.toggle('fullscreen',expanded);document.body.classList.toggle('preview-expanded',expanded);$('#fullscreen').setAttribute('aria-pressed',String(expanded));$('#fullscreen').setAttribute('aria-label',expanded?'بستن پیش‌نمایش بزرگ':'بازکردن پیش‌نمایش بزرگ');$('#fullscreen').innerHTML=icon(expanded?'close':'expand');}$('#fullscreen').onclick=()=>expandPreview(!$('.preview-panel').classList.contains('fullscreen'));document.addEventListener('keydown',ev=>{if(ev.key==='Escape')expandPreview(false);});document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{$('.frame-wrap').classList.toggle('mobile',b.dataset.device==='mobile');document.querySelectorAll('[data-device]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
async function init(){
 try {
  ({user} = await siteRequest('/api/account'));
  onlineConfigured = true;
  if (user) {
   $('#login').textContent = 'پنل سایت‌های من';
   $('#login').href = '/account';
   if (requestedSite) await loadSite();
  } else if (requestedSite) {
   toast('برای باز کردن این سایت از پنل وارد حسابت شو.');
  }
 } catch {
  onlineConfigured = false;
 }
 try {
  const repaired = await repairDemoPortrait(data.avatar);
  if (repaired !== data.avatar) { data.avatar = repaired; save(); }
 } catch {}
 render();preview();
}
init();

initPreviews();

mountIcons();$('#back').innerHTML=icon('arrowRight')+' مرحله قبل';initBuilderScroll();
