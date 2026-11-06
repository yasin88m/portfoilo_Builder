import {translations} from './translations.js';

const storageKey = 'pfb-language';
const root = globalThis.document?.documentElement;
const attributes = ['aria-label','alt','title','placeholder','content'];
const originals = new WeakMap();

function english(value) {
 const trimmed = value.trim();
 if (!trimmed) return value;
 const plain = trimmed.replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
 const exact = Object.hasOwn(translations,trimmed) && translations[trimmed];
 if (exact) return value.replace(trimmed,exact);
 const status = /^(\d+) نمونه‌کار · آماده دریافت خروجی$/.exec(plain);
 if (status) return value.replace(trimmed,`${status[1]} projects · ready to export`);
 const count = /^(قدم|پروژه|پلن|نظر|حذف تصویر) (\d+)(?: از 4)?$/.exec(plain);
 if (count) {
  const [, label, number] = count;
  return value.replace(trimmed, label === 'قدم' ? `Step ${number} of 4` : `${translations[label]} ${number}`);
 }
 for (const label of ['حساب','پیش‌نمایش','انتخاب قالب','ساخت قالب انجام نشد:','ادامه مسیر','باز کردن']) {
  if (trimmed.startsWith(label+' ') && translations[label]) return value.replace(trimmed,translations[label]+' '+english(trimmed.slice(label.length+1)));
 }
 for (const prefix of ['درصد','کد رنگ','رنگ پیش‌فرض','انتقال']) {
  if (!trimmed.startsWith(prefix+' ')) continue;
  let suffix=trimmed.slice(prefix.length+1);
  suffix=suffix.replace(/ به (بالا|پایین)$/u,(_,direction)=>direction==='بالا'?' up':' down');
  const translated = english(suffix);
  return value.replace(trimmed,`${translations[prefix]} ${translated}`);
 }
 return /^\d+$/.test(plain) ? value.replace(trimmed,plain) : value;
}

function languageValue(node, key, value, apply) {
 const record = originals.get(node) || {};
 const previous = record[key];
 const source = previous?.rendered === value ? previous.source : value;
 const rendered = root.lang === 'en' ? english(source) : source;
 if (rendered !== value) apply(rendered);
 record[key] = {source,rendered};
 originals.set(node,record);
}

function translate(node) {
 if (node.nodeType === Node.TEXT_NODE) {
  if (!node.parentElement || node.parentElement.closest('script,style,textarea,[data-user-text]')) return;
  languageValue(node,'text',node.data,value=>{node.data=value;});
  return;
 }
 if (node.nodeType !== Node.ELEMENT_NODE) return;
 for (const attr of attributes) {
  if (node.hasAttribute(attr)) languageValue(node,attr,node.getAttribute(attr),value=>node.setAttribute(attr,value));
 }
 for (const child of node.childNodes) translate(child);
}

export function localText(value) {
 return root?.lang === 'en' ? english(value) : value;
}

const button = globalThis.document?.querySelector('.language-switch');
if (button) {
 const observer = new MutationObserver(records=>{
  for (const record of records) {
   if (record.type === 'childList') record.addedNodes.forEach(translate);
   else translate(record.target);
  }
 });
 function setLanguage(language) {
  root.lang=language;
  root.dir=language==='en'?'ltr':'rtl';
  button.textContent=language==='en'?'فارسی':'EN';
  button.setAttribute('aria-label',language==='en'?'Switch to Persian':'تغییر زبان به انگلیسی');
  translate(document.head.querySelector('title'));
  const description=document.head.querySelector('meta[name=description]');
  if(description)translate(description);
  translate(document.body);
 }
 let saved;
 try { saved=localStorage.getItem(storageKey); } catch {}
 setLanguage(saved==='en'?'en':'fa');
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
 button.onclick=()=>{
  const language=root.lang==='en'?'fa':'en';
  try { localStorage.setItem(storageKey,language); } catch {}
  setLanguage(language);
 };
}
