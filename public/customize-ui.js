import {localText} from './locale.js';
import {normalizeDesign,resolveColors,colorLabels,textLabels,copyFor,orderedSections,sectionLabels,normalizeSkillLevels,hexColor} from './customize.js';
import {escapeHTML as e} from './shared.js';
export function skillControls(p){return `<div class="field full skill-controls"><label>نمایش مهارت‌ها<select id="skillsMode"><option value="list" ${p.skillsMode!=='percent'?'selected':''}>فهرست عادی</option><option value="percent" ${p.skillsMode==='percent'?'selected':''}>نوار درصدی</option></select></label><small>مهارت‌ها را با ویرگول یا در خطوط جدا بنویس. درصد هر مهارت را می‌توانی اینجا تنظیم کنی.</small><div id="skillLevels" ${p.skillsMode!=='percent'?'hidden':''}>${skillRows(p)}</div></div>`;}
function skillRows(p){return normalizeSkillLevels(p.skills,p.skillLevels).map((skill,i)=>`<label class="skill-edit-row"><span>${e(skill.name)}</span><input type="number" inputmode="numeric" min="0" max="100" step="1" value="${skill.percent}" data-skill-percent="${i}" aria-label="درصد ${e(skill.name)}"><span>٪</span></label>`).join('')||'<p class="note">ابتدا نام مهارت‌ها را وارد کن.</p>';}
export function designControls(p){const colors=resolveColors(p),d=normalizeDesign(p.design);return `<div class="design-studio"><details open id="designColors"><summary>رنگ‌های دلخواه؛ انتخاب بدون محدودیت</summary><p class="note">پالت فقط نقطه شروع است. هر رنگ را جداگانه با انتخابگر یا کد HEX تغییر بده.</p><div class="design-color-grid">${Object.entries(colorLabels).map(([key,label])=>`<div class="design-color"><label for="color-${key}">${label}</label><div><input id="color-${key}" type="color" value="${colors[key]}" data-design-color="${key}" aria-label="${label}"><input type="text" dir="ltr" maxlength="7" value="${colors[key]}" data-color-hex="${key}" aria-label="کد رنگ ${label}"><button type="button" class="textbutton" data-clear-color="${key}" aria-label="رنگ پیش‌فرض ${label}">↺</button></div></div>`).join('')}</div></details><details id="designTexts"><summary>عنوان‌ها، متن‌ها و نام دکمه‌ها</summary><div class="form-grid">${Object.entries(textLabels).map(([key,label])=>`<label class="field full">${label}<textarea rows="2" maxlength="${key==='contactText'?1000:240}" data-design-text="${key}">${e(copyFor(p,key))}</textarea></label>`).join('')}</div></details><details id="designLayout"><summary>اندازه‌ها و چیدمان</summary><div class="form-grid">${[['fontSize','اندازه متن',12,22,15],['headingSize','اندازه تیتر هیرو',28,76,52],['radius','گردی گوشه‌ها',0,40,12],['spacing','فاصله عمودی بخش‌ها',24,90,48],['projectColumns','ستون‌های پروژه در دسکتاپ',2,3,3]].map(([key,label,min,max,fallback])=>`<label class="field">${label}<input type="number" min="${min}" max="${max}" value="${d[key]??fallback}" data-design-number="${key}"></label>`).join('')}</div></details><details id="designSections"><summary>نمایش و ترتیب بخش‌ها</summary><p class="note">با فلش‌ها ترتیب بخش‌ها را تغییر بده؛ برداشتن تیک، بخش را از خروجی حذف می‌کند.</p>${orderedSections(p).map((key,i,all)=>`<div class="design-section-row"><label><input type="checkbox" data-design-section="${key}" ${d.sections[key]!==false?'checked':''}>${sectionLabels[key]}</label><div><button type="button" class="textbutton" data-section-move="${key}" data-direction="-1" ${i===0?'disabled':''} aria-label="انتقال ${sectionLabels[key]} به بالا">↑</button><button type="button" class="textbutton" data-section-move="${key}" data-direction="1" ${i===all.length-1?'disabled':''} aria-label="انتقال ${sectionLabels[key]} به پایین">↓</button></div></div>`).join('')}</details><button type="button" id="resetDesign" class="textbutton">بازنشانی تنظیمات ظاهر به پیش‌فرض قالب</button></div>`;}
export function bindCustomization(p,changed,render){
 p.design=normalizeDesign(p.design);
 const mode=document.querySelector('#skillsMode'),levels=document.querySelector('#skillLevels');
 function bindLevels(){levels?.querySelectorAll('[data-skill-percent]').forEach(input=>input.oninput=()=>{p.skillLevels=normalizeSkillLevels(p.skills,p.skillLevels);p.skillLevels[+input.dataset.skillPercent].percent=Math.max(0,Math.min(100,Math.round(Number(input.value)||0)));changed();});}
 if(mode)mode.onchange=()=>{p.skillsMode=mode.value;p.skillLevels=normalizeSkillLevels(p.skills,p.skillLevels);levels.hidden=mode.value!=='percent';levels.innerHTML=skillRows(p);bindLevels();changed();};
 document.querySelector('[data-key="skills"]')?.addEventListener('input',event=>{p.skills=event.target.value;p.skillLevels=normalizeSkillLevels(p.skills,p.skillLevels);if(levels){levels.innerHTML=skillRows(p);bindLevels();}});bindLevels();
 function setColor(key, value, source) {
  const color = hexColor(value);
  if (!color || p.design.colors[key] === color) return;
  p.design.colors[key] = color;
  const resolved = resolveColors(p);
  for (const [name, value] of Object.entries(resolved)) {
   for (const selector of ['data-design-color', 'data-color-hex']) {
    const field = document.querySelector(`[${selector}="${name}"]`);
    if (field && field !== source && field.value !== value) field.value = value;
   }
  }
  changed();
 }
 document.querySelectorAll('[data-design-color]').forEach(input => {
  input.oninput = () => setColor(input.dataset.designColor, input.value, input);
 });
 document.querySelectorAll('[data-color-hex]').forEach(input => {
  input.oninput = () => {
   input.setCustomValidity('');
   if (/^#[0-9a-f]{6}$/i.test(input.value)) setColor(input.dataset.colorHex, input.value, input);
  };
  input.onchange = () => {
   const color = hexColor(input.value);
   input.setCustomValidity(color ? '' : 'کد رنگ باید مانند #7552ed باشد');
   if (!color) return;
   setColor(input.dataset.colorHex, color, input);
   input.value = color;
  };
 });
 document.querySelectorAll('[data-clear-color]').forEach(button=>button.onclick=()=>{delete p.design.colors[button.dataset.clearColor];changed();render();});
 document.querySelectorAll('[data-design-text]').forEach(input=>input.oninput=()=>{p.design.text[input.dataset.designText]=input.value;changed();});
 document.querySelectorAll('[data-design-number]').forEach(input=>input.oninput=()=>{p.design[input.dataset.designNumber]=Number(input.value);p.design=normalizeDesign(p.design);changed();});
 document.querySelectorAll('[data-design-section]').forEach(input=>input.onchange=()=>{p.design.sections[input.dataset.designSection]=input.checked;changed();});
 document.querySelectorAll('[data-section-move]').forEach(button=>button.onclick=()=>{const order=orderedSections(p),i=order.indexOf(button.dataset.sectionMove),j=i+Number(button.dataset.direction);if(j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];p.design.order=order;changed();render();});
 const reset=document.querySelector('#resetDesign');if(reset)reset.onclick=()=>{if(confirm(localText('تنظیمات ظاهر و متن‌های قالب به پیش‌فرض برگردند؟'))){p.design=normalizeDesign({});p.paletteOverride=false;changed();render();}};
}
