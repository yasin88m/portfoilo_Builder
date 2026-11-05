import {escapeHTML as e} from './shared.js';

function field(group, index, row, key, label, multiline=false) {
 const attr = `data-site-group="${group}" data-site-index="${index}" data-site-key="${key}"`;
 return `<label class="field ${multiline?'full':''}">${label}${multiline?`<textarea ${attr} rows="3" maxlength="2400">${e(row[key]||'')}</textarea>`:`<input ${attr} maxlength="600" value="${e(row[key]||'')}">`}</label>`;
}

export function projectFields(project, index) {
 const get = (key,label,multiline) => field('projects',index,project,key,label,multiline);
 return `${get('client','نام کارفرما')}${get('date','زمان اجرا')}${get('activities','فعالیت‌های انجام‌شده (هر فعالیت در یک خط)',true)}
  <label class="field full">گالری جزئیات (حداکثر ۴ تصویر)<input type="file" data-gallery="${index}" accept="image/png,image/jpeg,image/webp" multiple></label>
  <div class="full">${(project.gallery||[]).map((src,i)=>`<span><img src="${e(src)}" alt="تصویر گالری" style="width:64px;height:54px;object-fit:cover"><button type="button" class="textbutton" data-gallery-remove="${index}:${i}">حذف تصویر ${i+1}</button></span>`).join('')}</div>`;
}

export function siteEditor(data) {
 const plans = data.plans;
 const group = (name,rows,fields) => rows.map((row,i)=>`<article class="project-editor"><div class="project-heading"><strong>${name==='plans'?'پلن':'نظر'} ${i+1}</strong><button type="button" class="textbutton" data-site-delete="${name}:${i}">حذف</button></div><div class="form-grid">${fields.map(args=>field(name,i,row,...args)).join('')}${name==='plans'?`<label class="field"><input type="checkbox" data-site-group="plans" data-site-index="${i}" data-site-key="featured" ${row.featured?'checked':''}> پلن پیشنهادی</label>`:`<label class="field">امتیاز<select data-site-group="reviews" data-site-index="${i}" data-site-key="rating">${[5,4,3,2,1].map(n=>`<option ${Number(row.rating||5)===n?'selected':''}>${n}</option>`).join('')}</select></label>`}</div></article>`).join('');
 return `<section class="export-options"><h3>صفحه پلن‌های همکاری</h3><label><input id="enablePlans" type="checkbox" ${plans.enabled?'checked':''}> نمایش صفحه پلن‌ها در سایت</label>
  ${plans.enabled?`<div class="form-grid">${field('settings',0,plans,'heading','عنوان صفحه')}${field('settings',0,plans,'description','توضیح صفحه',true)}</div>${group('plans',plans.items,[['name','نام پلن'],['price','قیمت و واحد پول'],['period','دوره یا نوع پرداخت'],['description','جزئیات پلن',true],['features','امکانات (هر مورد در یک خط)',true],['button','متن دکمه'],['url','لینک دکمه (اختیاری)']])}<button type="button" class="button secondary" data-site-add="plans" ${plans.items.length>=6?'disabled':''}>افزودن پلن</button>`:''}</section>
  <section class="export-options"><h3>نظرات مشتریان</h3><p>نظرهایی که نام و متن دارند در صفحه اصلی نمایش داده می‌شوند.</p>${group('reviews',data.reviews,[['name','نام مشتری'],['role','سمت یا شرکت'],['quote','متن نظر',true]])}<button type="button" class="button secondary" data-site-add="reviews" ${data.reviews.length>=9?'disabled':''}>افزودن نظر</button></section>`;
}

export function bindSiteEditor(root,data,{change,render,readImage,toast}) {
 const rows = name => name==='plans'?data.plans.items:data[name];
 root.querySelectorAll('[data-site-key]').forEach(input=>input.oninput=()=>{
  const {siteGroup,siteIndex,siteKey}=input.dataset;
  const row=siteGroup==='settings'?data.plans:rows(siteGroup)[Number(siteIndex)];
  row[siteKey]=input.type==='checkbox'?input.checked:input.value;
  change();
 });
 const toggle=root.querySelector('#enablePlans');
 if(toggle)toggle.onchange=()=>{data.plans.enabled=toggle.checked;change();render();};
 root.querySelectorAll('[data-site-add]').forEach(button=>button.onclick=()=>{rows(button.dataset.siteAdd).push({});change();render();});
 root.querySelectorAll('[data-site-delete]').forEach(button=>button.onclick=()=>{const [name,i]=button.dataset.siteDelete.split(':');rows(name).splice(Number(i),1);change();render();});
 root.querySelectorAll('[data-gallery]').forEach(input=>input.onchange=async()=>{
  const project=data.projects[Number(input.dataset.gallery)];
  try{
   const gallery=project.gallery||[];
   const images=await Promise.all([...input.files].slice(0,4-gallery.length).map(readImage));
   if(!data.projects.includes(project))return;
   project.gallery=[...(project.gallery||[]),...images].slice(0,4);
   change();render();
  }catch(error){toast(error.message);}
 });
 root.querySelectorAll('[data-gallery-remove]').forEach(button=>button.onclick=()=>{
  const [project,index]=button.dataset.galleryRemove.split(':').map(Number);
  data.projects[project].gallery.splice(index,1);change();render();
 });
}
