import {siteLinks} from './public/site-pages.js';
import http from 'node:http';
import { accountRoutes, memoryRecords } from './accounts.mjs';
import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {normalize,portfolioHTML} from './public/shared.js';
export function createPortfolioServer({env, origin, loadAsset, authStore, records = memoryRecords(), fetchImpl = fetch}) {
const configured=Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_SECRET?.length>=32&&env.GITHUB_DATA_REPO&&env.GITHUB_DATA_TOKEN);
const memory = new Map();
const store = authStore || {
 allowAttempt(key) {
  const count = (memory.get(key)?.count || 0) + 1;
  if (count > 20) return false;
  memory.set(key, { count, expires: Date.now() + 300000 });
  return true;
 },
 get(key) { return memory.get(key); },
 put(key, value) { memory.set(key, value); },
 remove(key) { memory.delete(key); },
 take(key) { const value = memory.get(key); memory.delete(key); return value; }
};
const rates=new Map();
const backgroundRates=new Map();
let nextCleanup = 0;
function signature(s){return createHmac('sha256',env.SESSION_SECRET||'local-development-no-auth').update(s).digest('hex');}
function cookie(name,value,maxAge){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${origin.startsWith('https:')?'; Secure':''}`;}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1)];}));}
async function session(req){const value=cookies(req).pb_session||'',i=value.lastIndexOf('.'),id=value.slice(0,i),sig=value.slice(i+1),expected=signature(id);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const s=await store.get("session:"+id);return s&&s.expires>Date.now()?s:null;}
async function backgroundUserId(req) {
 const token = cookies(req).pb_account || '';
 if (/^[a-f0-9]{64}$/.test(token)) {
  const account = await store.get('account-session:' + token);
  if (account?.expires > Date.now() && account.user?.id) return 'account:' + String(account.user.id);
 }
 const githubSession = await session(req);
 if (githubSession?.user?.id) return 'github:' + String(githubSession.user.id);
 return null;
}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function github(path,options={},token=env.GITHUB_DATA_TOKEN){const res=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'portfoilo-builder',...options.headers},signal:AbortSignal.timeout(15000)});const body=await res.json();if(!res.ok){const err=Error('ارتباط با مخزن انجام نشد. تنظیمات سرور یا دسترسی را بررسی کنید.');err.status=res.status;throw err;}return body;}
async function ensurePrivateRepo(){if(!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_DATA_REPO||''))throw Error('مخزن داده تنظیم نشده است');const repo=await github(`/repos/${env.GITHUB_DATA_REPO}`);if(!repo.private)throw Error('ذخیره اطلاعات فقط در مخزن خصوصی مجاز است.');}
async function readBody(req, limit) {
 const chunks = [];
 let size = 0;
 for await (const chunk of req) {
  size += chunk.length;
  if (size > limit) throw Object.assign(Error('حجم درخواست بیش از حد مجاز است'), { status: 413 });
  chunks.push(chunk);
 }
 return Buffer.concat(chunks).toString();
}
async function body(req, limit = 5_100_000) {
 const input = await readBody(req, limit);
 try { return JSON.parse(input); }
 catch { throw Object.assign(Error('اطلاعات درخواست معتبر نیست'), { status: 400 }); }
}
const publicationPath = id => `/p/${id}`;
const publicationFile = id => `/repos/${env.GITHUB_DATA_REPO}/contents/published/${id}.json`;

const adminHTML = "<!doctype html>\n<html lang=\"fa\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><title>مدیریت پورتفولیو بیلدر</title>\n<link rel=\"stylesheet\" href=\"/font.css\">\n<style>\n:root{color-scheme:dark;--bg:#0b0d18;--panel:#121626;--panel2:#171d30;--line:#252d43;--muted:#929bb4;--text:#f4f5fb;--purple:#9874ff;--cyan:#58d6e8;--green:#4ed5a0;--orange:#f3b86a;--red:#ff7d91}\n*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(ellipse at 85% -10%,#39256c55,transparent 36%),var(--bg);color:var(--text);font:14px/1.8 Vazirmatn,Tahoma,Arial,sans-serif}button,input{font:inherit}button{cursor:pointer}.shell{min-height:100vh;display:grid;grid-template-columns:250px minmax(0,1fr)}.sidebar{background:#101424d9;border-left:1px solid var(--line);padding:26px 17px;display:flex;flex-direction:column;gap:28px;position:sticky;top:0;height:100vh}.brand{display:flex;align-items:center;gap:12px;padding:0 9px}.brand-mark{width:43px;height:43px;border-radius:15px;background:linear-gradient(140deg,#4ed9e9,#7958f2 70%);display:grid;place-items:center;font:bold 27px Arial;color:white;box-shadow:0 8px 24px #7858f255}.brand strong{display:block;font-size:15px}.brand small{color:var(--muted);font-size:10px}.nav{display:grid;gap:7px}.nav button{border:1px solid transparent;background:transparent;color:#aab2c8;text-align:right;padding:11px 13px;border-radius:12px;display:flex;align-items:center;gap:12px;transition:.2s}.nav button:hover{background:#ffffff08;color:white}.nav button.active{background:linear-gradient(100deg,#7957ef2d,#50cce414);border-color:#8467ef44;color:#fff}.nav .ico{width:23px;text-align:center;font-size:17px}.side-bottom{margin-top:auto;border:1px solid var(--line);background:#ffffff05;border-radius:15px;padding:14px;color:var(--muted);font-size:11px}.side-bottom b{color:#e9e8ff;display:block;font-size:12px}.main{padding:30px clamp(18px,3vw,44px) 50px;min-width:0;max-width:1700px;width:100%;margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:26px}.eyebrow{font-size:11px;color:var(--cyan);font-weight:700}.topbar h1{font-size:25px;margin:2px 0 0;line-height:1.5}.top-actions{display:flex;align-items:center;gap:10px}.live{color:#9aa6bd;font-size:11px;display:flex;align-items:center;gap:7px}.live i{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 12px var(--green)}.refresh{border:1px solid var(--line);background:#ffffff08;color:#e8e9f3;border-radius:11px;padding:9px 14px}.refresh:hover{border-color:#8061ef}.page{display:none;animation:rise .28s ease}.page.active{display:block}@keyframes rise{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}.welcome{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:23px 27px;border:1px solid #7154d64a;border-radius:19px;background:linear-gradient(105deg,#6d4bd22b,#202744a8 65%,#1c52604a);margin-bottom:20px;overflow:hidden;position:relative}.welcome:after{content:\"✦\";position:absolute;left:25px;top:-32px;font-size:130px;color:#a58cff12}.welcome h2{font-size:19px;margin:0 0 4px}.welcome p{color:#aeb7cd;margin:0;font-size:12px}.welcome-tag{font-size:11px;color:#d9d0ff;background:#8868ef24;border:1px solid #997dff4a;padding:7px 12px;border-radius:30px;white-space:nowrap}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:19px}.stat{background:linear-gradient(145deg,#171d30,#111626);border:1px solid var(--line);border-radius:17px;padding:17px 18px;min-width:0;position:relative;overflow:hidden}.stat:after{content:\"\";position:absolute;width:100px;height:100px;border-radius:50%;left:-45px;bottom:-55px;background:var(--glow,#9874ff);filter:blur(42px);opacity:.16}.stat-top{display:flex;justify-content:space-between;align-items:center;color:#aab3ca;font-size:11px}.stat-icon{width:34px;height:34px;border-radius:11px;background:var(--iconbg,#8c6bff20);display:grid;place-items:center;font-size:17px}.stat strong{display:block;font-size:27px;line-height:1.5;margin-top:8px;letter-spacing:.2px}.stat small{color:#8994ad;font-size:10px}.grid-two{display:grid;grid-template-columns:1.35fr 1fr;gap:16px;margin-bottom:17px}.panel{background:linear-gradient(145deg,#151b2d,#111626);border:1px solid var(--line);border-radius:17px;padding:18px;min-width:0}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}.panel h3{font-size:13px;margin:0}.panel-sub{color:var(--muted);font-size:10px}.chart{height:170px;display:flex;align-items:end;gap:9px;padding:14px 2px 0;border-bottom:1px solid var(--line)}.bar-col{height:100%;flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:7px;min-width:0}.bar{width:min(24px,75%);min-height:3px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,#67d9e9,#7958f2);box-shadow:0 0 18px #8568f033;transition:height .35s}.bar-col small{font-size:9px;color:#8792aa;white-space:nowrap}.template-list{display:grid;gap:12px}.template-row{display:grid;grid-template-columns:88px minmax(0,1fr) 30px;gap:9px;align-items:center;font-size:10px;color:#b7bfd2}.track{height:7px;border-radius:20px;background:#252c40;overflow:hidden}.fill{height:100%;border-radius:20px;background:linear-gradient(90deg,#5ed5e6,#8d6bff)}.activity-list{display:grid;gap:0}.activity-item{display:flex;gap:11px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #252c3d}.activity-item:last-child{border:0}.activity-dot{width:8px;height:8px;border-radius:50%;background:var(--cyan);margin-top:8px;flex:none;box-shadow:0 0 10px #58d6e877}.activity-item b{font-size:11px;display:block}.activity-item small{color:var(--muted);font-size:10px}.table-panel{padding:0;overflow:hidden}.table-head{padding:17px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line)}.table-head h3{margin:0;font-size:13px}.search{background:#0c1120;border:1px solid #2b344c;color:white;border-radius:10px;padding:8px 12px;outline:none;min-width:190px;font-size:11px}.search:focus{border-color:var(--purple)}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:11px}th{color:#909bb3;font-weight:500;background:#ffffff04;text-align:right;padding:12px 16px}td{padding:13px 16px;border-top:1px solid #222a3d;color:#dce0ec}tbody tr:hover{background:#ffffff05}.muted{color:#8792aa}.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:30px;font-size:9px;background:#ffffff0c;color:#bfc7d8}.pill.ok{background:#2bbf8b1b;color:#70dfb4}.pill.draft{background:#e6a64c1b;color:#f3c17d}.pill.purple{background:#8d6bff22;color:#c1b0ff}.link{color:#9b83ff}.empty{padding:30px;text-align:center;color:var(--muted);font-size:12px}.usage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-bottom:16px}.usage-card{background:#151b2d;border:1px solid var(--line);border-radius:16px;padding:20px}.usage-card strong{font-size:27px;display:block}.usage-card p{margin:3px 0;color:var(--muted);font-size:11px}.warning{border:1px solid #e4a34d44;background:#d99b2510;color:#d9c49f;padding:12px 15px;border-radius:12px;font-size:11px;margin-top:15px}.notice{display:none;padding:17px;border:1px solid #a36cfc55;background:#8c6bff12;border-radius:14px;margin:0 0 18px;color:#d6caff}.notice.show{display:block}.notice a{color:#9d88ff;text-decoration:underline}.footer-note{font-size:10px;color:#77839d;margin-top:18px}\n@media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-two{grid-template-columns:1fr}}@media(max-width:760px){.shell{display:block}.sidebar{position:relative;height:auto;padding:14px 14px 10px;border-left:0;border-bottom:1px solid var(--line);gap:12px}.brand{padding:0 5px}.brand-mark{width:36px;height:36px;border-radius:12px;font-size:23px}.nav{display:flex;overflow:auto;gap:5px;padding-bottom:2px}.nav button{white-space:nowrap;padding:8px 10px;font-size:11px}.nav .ico{width:auto}.side-bottom{display:none}.main{padding:20px 14px 35px}.topbar h1{font-size:21px}.welcome{padding:18px;align-items:flex-start;flex-direction:column}.welcome-tag{font-size:10px}.stats{gap:9px}.stat{padding:13px}.stat strong{font-size:23px}.stat-top{font-size:10px}.stat-icon{width:30px;height:30px}.usage-grid{grid-template-columns:1fr}.table-head{align-items:flex-start;flex-direction:column}.search{width:100%;min-width:0}}@media(max-width:390px){.stats{grid-template-columns:1fr 1fr}.stat strong{font-size:21px}.live{display:none}}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<aside class=\"sidebar\">\n <div class=\"brand\"><div class=\"brand-mark\">P</div><div><strong>Portfolio Builder</strong><small>مرکز مدیریت سامانه</small></div></div>\n <nav class=\"nav\" id=\"nav\">\n  <button class=\"active\" data-page=\"overview\"><span class=\"ico\">◫</span>داشبورد</button>\n  <button data-page=\"users\"><span class=\"ico\">♙</span>کاربران</button>\n  <button data-page=\"sites\"><span class=\"ico\">▣</span>وب‌سایت‌ها</button>\n  <button data-page=\"templates\"><span class=\"ico\">▦</span>قالب‌ها</button>\n  <button data-page=\"usage\"><span class=\"ico\">◈</span>توکن و اعتبار</button>\n  <button data-page=\"activity\"><span class=\"ico\">◷</span>فعالیت‌ها</button>\n </nav>\n <div class=\"side-bottom\"><b>پنل امن مدیریت</b>اطلاعات این بخش فقط برای مدیران مجاز نمایش داده می‌شود.</div>\n</aside>\n<main class=\"main\">\n <header class=\"topbar\"><div><div class=\"eyebrow\">CONTROL CENTER / ADMIN</div><h1 id=\"page-title\">نمای کلی سامانه</h1></div><div class=\"top-actions\"><span class=\"live\"><i></i>اتصال زنده به داده‌ها</span><button class=\"refresh\" id=\"refresh\">↻ بروزرسانی</button></div><form method=\"post\" action=\"/admin/logout\"><button class=\"btn\" type=\"submit\">خروج از پنل</button></form></header>\n <div class=\"notice\" id=\"notice\"></div>\n <section class=\"page active\" data-view=\"overview\">\n  <div class=\"welcome\"><div><h2>خوش آمدی، مدیر 👋</h2><p>وضعیت کاربران، وب‌سایت‌ها و عملکرد پورتفولیو بیلدر را یکجا مدیریت کن.</p></div><span class=\"welcome-tag\">گزارش زنده سامانه</span></div>\n  <div class=\"stats\" id=\"stats\"></div>\n  <div class=\"grid-two\">\n   <div class=\"panel\"><div class=\"panel-head\"><h3>روند بازدید وب‌سایت‌ها</h3><span class=\"panel-sub\">۱۴ روز اخیر · بازدید ثبت‌شده</span></div><div class=\"chart\" id=\"views-chart\"></div></div>\n   <div class=\"panel\"><div class=\"panel-head\"><h3>عملکرد قالب‌ها</h3><span class=\"panel-sub\">تعداد سایت ساخته‌شده</span></div><div class=\"template-list\" id=\"template-preview\"></div></div>\n  </div>\n  <div class=\"panel\"><div class=\"panel-head\"><h3>آخرین فعالیت‌ها</h3><span class=\"panel-sub\">رویدادهای اخیر سامانه</span></div><div class=\"activity-list\" id=\"recent-activity\"></div></div>\n  <div class=\"footer-note\">آمار بازدید از زمان فعال‌شدن ثبت آمار محاسبه می‌شود؛ بازدیدهای گذشته قابل بازیابی نیستند.</div>\n </section>\n <section class=\"page\" data-view=\"users\">\n  <div class=\"panel table-panel\"><div class=\"table-head\"><h3>فهرست کاربران ثبت‌شده</h3><input class=\"search\" id=\"user-search\" placeholder=\"جستجو نام کاربری...\"></div><div class=\"table-wrap\"><table><thead><tr><th>کاربر</th><th>نوع حساب</th><th>تعداد سایت</th><th>سهمیه حذف پس‌زمینه</th><th>آخرین فعالیت</th><th>شناسه</th></tr></thead><tbody id=\"users-table\"></tbody></table></div></div>\n </section>\n <section class=\"page\" data-view=\"sites\">\n  <div class=\"panel table-panel\"><div class=\"table-head\"><h3>تمام وب‌سایت‌های ساخته‌شده</h3><input class=\"search\" id=\"site-search\" placeholder=\"جستجو نام سایت یا صاحب آن...\"></div><div class=\"table-wrap\"><table><thead><tr><th>وب‌سایت</th><th>صاحب سایت</th><th>قالب</th><th>وضعیت</th><th>بازدید</th><th>آخرین بروزرسانی</th><th>لینک</th></tr></thead><tbody id=\"sites-table\"></tbody></table></div></div>\n </section>\n <section class=\"page\" data-view=\"templates\">\n  <div class=\"panel\"><div class=\"panel-head\"><h3>آمار استفاده از قالب‌ها</h3><span class=\"panel-sub\">مقایسه تعداد سایت‌ها</span></div><div class=\"template-list\" id=\"template-full\"></div></div>\n </section>\n <section class=\"page\" data-view=\"usage\">\n  <div class=\"usage-grid\" id=\"usage-stats\"></div>\n  <div class=\"panel table-panel\"><div class=\"table-head\"><h3>مصرف سهمیه کاربران</h3><span class=\"panel-sub\">سهمیه فعلی: ۲ حذف موفق برای هر حساب</span></div><div class=\"table-wrap\"><table><thead><tr><th>کاربر</th><th>مصرف‌شده</th><th>باقی‌مانده</th><th>وضعیت</th></tr></thead><tbody id=\"usage-table\"></tbody></table></div></div>\n  <div class=\"warning\">در نسخه فعلی سامانه، شمارنده مصرف توکن مدل‌های هوش مصنوعی پیاده‌سازی نشده است. این بخش سهمیه واقعی حذف پس‌زمینه هر حساب را نمایش می‌دهد و آن را با اعتبار حساب remove.bg اشتباه نمی‌گیرد.</div>\n </section>\n <section class=\"page\" data-view=\"activity\">\n  <div class=\"panel\"><div class=\"panel-head\"><h3>گزارش رویدادهای سامانه</h3><span class=\"panel-sub\">ثبت‌نام، ذخیره و انتشار سایت</span></div><div class=\"activity-list\" id=\"all-activity\"></div></div>\n </section>\n</main>\n</div>\n<script src=\"/admin.js\" defer></script>\n</body></html>";
const adminJS = "(() => {\n'use strict';\nconst $ = (s) => document.querySelector(s);\nconst fa = new Intl.NumberFormat('fa-IR');\nconst labels = {overview:'نمای کلی سامانه',users:'مدیریت کاربران',sites:'مدیریت وب‌سایت‌ها',templates:'آمار قالب‌ها',usage:'توکن و اعتبار',activity:'گزارش فعالیت‌ها'};\nconst eventLabels = {register:'ثبت‌نام کاربر جدید',save:'ذخیره وب‌سایت',publish:'انتشار وب‌سایت',unpublish:'لغو انتشار وب‌سایت'};\nconst templateColors = ['#8d6bff','#56cbdc','#65d6a8','#f1b46a','#e987b9','#8da5ff'];\nlet data = null;\nfunction esc(v){return String(v == null ? '' : v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));}\nfunction num(v){return fa.format(Number(v || 0));}\nfunction date(v){if(!v)return 'اطلاعات ثبت اولیه موجود نیست';try{return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(v));}catch{return '—';}}\nfunction ago(v){if(!v)return '—';const d=Math.max(0,Date.now()-Number(v));if(d<60000)return 'همین حالا';if(d<3600000)return num(Math.floor(d/60000))+' دقیقه پیش';if(d<86400000)return num(Math.floor(d/3600000))+' ساعت پیش';return date(v);}\nfunction templateName(id){const x=(data?.templateStats||[]).find(t=>t.id===id);return x?.name || (id==='unknown'?'نامشخص':id);}\nfunction eventText(e){const t=eventLabels[e.type]||'فعالیت کاربر';const who=e.login?' @'+e.login:'';const site=e.siteName?' · '+e.siteName:'';return t+who+site;}\nfunction renderActivity(target,items){const el=$(target);if(!items?.length){el.innerHTML='<div class=\"empty\">هنوز فعالیتی ثبت نشده است.</div>';return;}el.innerHTML=items.map(e=>'<div class=\"activity-item\"><span class=\"activity-dot\"></span><div><b>'+esc(eventText(e))+'</b><small>'+esc(date(e.createdAt))+' · '+esc(ago(e.createdAt))+'</small></div></div>').join('');}\nfunction renderStats(){const s=data.summary;const cards=[\n ['کاربران ثبت‌شده',s.totalUsers,'حساب‌های شناسایی‌شده','♙','#8d6bff'],\n ['وب‌سایت‌های ساخته‌شده',s.totalSites,'پیش‌نویس و منتشرشده','▣','#56cbdc'],\n ['بازدید کل سایت‌ها',s.totalViews,'از زمان فعال‌سازی آمار','◉','#65d6a8'],\n ['سهمیه حذف پس‌زمینه باقی‌مانده',s.backgroundRemaining,'از مجموع سهمیه کاربران','◈','#f1b46a']\n];$('#stats').innerHTML=cards.map((x,i)=>'<article class=\"stat\" style=\"--glow:'+x[4]+';--iconbg:'+x[4]+'22\"><div class=\"stat-top\"><span>'+esc(x[0])+'</span><span class=\"stat-icon\">'+x[3]+'</span></div><strong>'+num(x[1])+'</strong><small>'+esc(x[2])+'</small></article>').join('');}\nfunction renderViews(){const el=$('#views-chart'),items=data.dailyViews||[],max=Math.max(1,...items.map(x=>Number(x.views||0)));el.innerHTML=items.map(x=>'<div class=\"bar-col\" title=\"'+esc(date(x.day))+' · '+num(x.views)+' بازدید\"><div class=\"bar\" style=\"height:'+Math.max(2,Number(x.views||0)/max*100)+'%\"></div><small>'+esc(String(x.day||'').slice(8))+'</small></div>').join('');}\nfunction templateRows(target){const list=data.templateStats||[],max=Math.max(1,...list.map(x=>x.count));$(target).innerHTML=list.map((x,i)=>'<div class=\"template-row\"><span>'+esc(x.name)+'</span><div class=\"track\"><div class=\"fill\" style=\"width:'+Math.round(x.count/max*100)+'%;background:'+templateColors[i%templateColors.length]+'\"></div></div><b>'+num(x.count)+'</b></div>').join('');}\nfunction renderUsers(){const rows=data.users||[];const q=($('#user-search')?.value||'').trim().toLowerCase();const filtered=rows.filter(u=>(u.login+' '+u.id).toLowerCase().includes(q));$('#users-table').innerHTML=filtered.length?filtered.map(u=>'<tr><td><b>'+esc(u.login||'کاربر')+'</b></td><td><span class=\"pill purple\">'+(u.type==='github'?'GitHub':'حساب کاربری')+'</span></td><td>'+num(u.siteCount)+'</td><td>'+num(u.backgroundRemaining)+' از ۲</td><td>'+esc(ago(u.lastSeenAt))+'</td><td class=\"muted\">'+esc(String(u.id).slice(0,12))+'…</td></tr>').join(''):'<tr><td colspan=\"6\" class=\"empty\">کاربری با این مشخصات پیدا نشد.</td></tr>';}\nfunction renderSites(){const rows=data.sites||[];const q=($('#site-search')?.value||'').trim().toLowerCase();const filtered=rows.filter(s=>(s.name+' '+s.title+' '+s.ownerLogin).toLowerCase().includes(q));$('#sites-table').innerHTML=filtered.length?filtered.map(s=>'<tr><td><b>'+esc(s.name||s.title||'بدون نام')+'</b><br><small class=\"muted\">'+esc(s.title||'')+'</small></td><td>'+esc(s.ownerLogin||'—')+'</td><td><span class=\"pill purple\">'+esc(templateName(s.template))+'</span></td><td><span class=\"pill '+(s.url?'ok':'draft')+'\">'+(s.url?'منتشرشده':'پیش‌نویس')+'</span></td><td>'+num(s.views)+'</td><td>'+esc(date(s.updated))+'</td><td>'+(s.url?'<a class=\"link\" href=\"'+esc(s.url)+'\" target=\"_blank\" rel=\"noopener\">مشاهده ↗</a>':'<span class=\"muted\">—</span>')+'</td></tr>').join(''):'<tr><td colspan=\"7\" class=\"empty\">هنوز وب‌سایتی ثبت نشده است.</td></tr>';}\nfunction renderUsage(){const s=data.summary;$('#usage-stats').innerHTML='<div class=\"usage-card\"><span class=\"panel-sub\">سهمیه باقی‌مانده حذف پس‌زمینه</span><strong>'+num(s.backgroundRemaining)+'</strong><p>از '+num(s.backgroundLimit)+' نوبت مجاز بین کاربران</p></div><div class=\"usage-card\"><span class=\"panel-sub\">حذف پس‌زمینه موفق</span><strong>'+num(s.backgroundUsed)+'</strong><p>مصرف ثبت‌شده در حساب‌های کاربران</p></div><div class=\"usage-card\"><span class=\"panel-sub\">توکن‌های هوش مصنوعی</span><strong>—</strong><p>ردیابی مصرف هنوز در سیستم فعال نشده است</p></div><div class=\"usage-card\"><span class=\"panel-sub\">بازدید امروز</span><strong>'+num(s.todayViews)+'</strong><p>بازدید صفحات سایت‌های منتشرشده</p></div>';$('#usage-table').innerHTML=(data.users||[]).length?data.users.map(u=>'<tr><td>'+esc(u.login)+'</td><td>'+num(u.backgroundUsed)+'</td><td>'+num(u.backgroundRemaining)+'</td><td><span class=\"pill '+(u.backgroundRemaining?'ok':'draft')+'\">'+(u.backgroundRemaining?'دارای سهمیه':'سهمیه تمام شده')+'</span></td></tr>').join(''):'<tr><td colspan=\"4\" class=\"empty\">اطلاعات مصرفی وجود ندارد.</td></tr>';}\nfunction render(){renderStats();renderViews();templateRows('#template-preview');templateRows('#template-full');renderActivity('#recent-activity',(data.events||[]).slice(0,5));renderActivity('#all-activity',data.events||[]);renderUsers();renderSites();renderUsage();}\nfunction showNotice(html){const n=$('#notice');n.innerHTML=html;n.classList.add('show');}\nasync function load(){const b=$('#refresh');b.disabled=true;b.textContent='در حال دریافت…';try{const res=await fetch('/api/admin/overview',{credentials:'same-origin',cache:'no-store'});const payload=await res.json();if(!res.ok){if(res.status===401||res.status===503){location.replace('/admin');return;}showNotice(esc(payload.error||'دریافت اطلاعات ناموفق بود.'));return;}data=payload;$('#notice').classList.remove('show');render();}catch(e){showNotice('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کن.');}finally{b.disabled=false;b.textContent='↻ بروزرسانی';}}\n$('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(!b)return;document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.dataset.view===b.dataset.page));$('#page-title').textContent=labels[b.dataset.page]||labels.overview;});\n$('#refresh').addEventListener('click',load);\n$('#user-search').addEventListener('input',renderUsers);\n$('#site-search').addEventListener('input',renderSites);\nload();\n})();";
const adminTemplateNames = {
 codecraft: 'کدکرفت', evergreen: 'اورگرین', coral: 'کورال',
 amethyst: 'آمتیست', learnhouse: 'لرن‌هاوس', eduviolet: 'ادوویولت'
};

async function logAdminEvent(event) {
 const createdAt = Date.now();
 const value = { ...event, createdAt };
 const key = 'admin:analytics:event:' + createdAt + ':' + randomBytes(8).toString('hex');
 await records.write(key, value, null, value);
}

async function indexAdminUser(user, type, isNew = false) {
 const key = 'admin:user:' + String(user.id);
 for (let attempt = 0; attempt < 4; attempt++) {
  const old = await records.read(key);
  const now = Date.now();
  const value = {
   user: { id: String(user.id), login: String(user.login || '') }, type,
   createdAt: old?.value?.createdAt ?? (isNew ? now : null),
   firstSeenAt: old?.value?.firstSeenAt || now, lastSeenAt: now
  };
  const summary = { id: value.user.id, login: value.user.login, type, createdAt: value.createdAt, firstSeenAt: value.firstSeenAt, lastSeenAt: now };
  const revision = await records.write(key, value, old?.revision ?? null, summary);
  if (revision) {
   if (!old && isNew) await logAdminEvent({ type: 'github_first_seen', userId: value.user.id, login: value.user.login });
   return;
  }
 }
}

async function indexGitHubPortfolio(user, portfolio, published) {
 if (!user || !portfolio) return;
 await indexAdminUser(user, 'github', false);
 const key = 'site:' + String(user.id) + ':github';
 const old = await records.read(key);
 const updated = Date.now();
 const value = { draft: portfolio, published: published ? portfolio : null, updated };
 const summary = { id: 'github', name: portfolio.name || '', title: portfolio.title || '', template: portfolio.template || 'unknown', updated, url: published ? origin + '/p/' + user.id : null };
 await records.write(key, value, old?.revision ?? null, summary);
}

async function recordAdminPageView(siteKey, req) {
 if (req.method !== 'GET' || /bot|crawler|spider|preview|headless/i.test(String(req.headers['user-agent'] || ''))) return;
 const day = new Date().toISOString().slice(0, 10);
 const key = 'admin:analytics:view:' + siteKey + ':' + day;
 for (let attempt = 0; attempt < 4; attempt++) {
  const old = await records.read(key);
  const value = { siteKey, day, count: Number(old?.value?.count || 0) + 1 };
  const revision = await records.write(key, value, old?.revision ?? null, value);
  if (revision) return;
 }
}

const adminUsername = env.ADMIN_USERNAME || 'admin';
const adminPassword = env.ADMIN_PASSWORD;
const adminSessionAge = 8 * 60 * 60;
const credentialTag = adminPassword?.length >= 24
 ? createHmac('sha256', adminPassword).update(adminUsername).digest('hex')
 : null;
const digest = value => createHash('sha256').update(value).digest();

async function hasAdminSession(req) {
 const token = cookies(req).pb_admin || '';
 if (!credentialTag || !/^[a-f0-9]{64}$/.test(token)) return false;
 const admin = await store.get('admin-session:' + token);
 return admin?.expires > Date.now() && admin.credentialTag === credentialTag;
}

function adminLoginPage(req, res, status = 200, message = '') {
 res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
 return res.end(req.method === 'HEAD' ? undefined : `<!doctype html>
<html lang="fa" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ورود مدیر پورتفولیو بیلدر</title>
<link rel="stylesheet" href="/font.css">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d18;color:#f4f5fb;font-family:Vazirmatn,sans-serif}
main{box-sizing:border-box;width:min(92vw,420px);padding:28px;background:#121626;border:1px solid #252d43;border-radius:18px}
label,input,button{display:block;box-sizing:border-box;width:100%;font:inherit}
input,button{padding:10px 12px;border-radius:8px;margin:6px 0 16px}
input{background:#0b0d18;color:inherit;border:1px solid #69738d}
button{background:#a48cff;color:#0b0d18;border:0;cursor:pointer}
[role=alert]{color:#ffb9b9}
</style>
<main>
<h1>ورود مدیر</h1>
<p>پورتفولیو بیلدر</p>
${message ? `<p role="alert">${message}</p>` : ''}
${credentialTag ? `<form method="post" action="/admin/login">
<label for="username">نام کاربری</label>
<input id="username" name="username" dir="ltr" autocomplete="username" required>
<label for="password">رمز عبور</label>
<input id="password" type="password" name="password" dir="ltr" autocomplete="current-password" required>
<button type="submit">ورود به پنل</button>
</form>` : ''}
</main>
</html>`);
}
async function readPublication(id) {
 try {
  const file = await github(publicationFile(id));
  const blob = file.content ? file : await github(`/repos/${env.GITHUB_DATA_REPO}/git/blobs/${file.sha}`);
  return {sha: file.sha, portfolio: JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8')).portfolio};
 } catch (error) {
  if (error.status === 404) return {sha: null, portfolio: null};
  throw error;
 }
}

function publicationStatus(id, record) {
 return {sha: record.sha, url: record.portfolio ? origin + publicationPath(id) : null};
}

async function managePublication(req, res) {
 if (!configured) return json(res,503,{error:'انتشار آنلاین هنوز روی سرور تنظیم نشده است.'});
 const account = (await session(req))?.user;
 if (!account) return json(res,401,{error:'برای انتشار ابتدا با گیت‌هاب وارد شو.'});
 if (!['GET','PUT','DELETE'].includes(req.method)) return json(res,405,{error:'روش درخواست مجاز نیست'});
 await ensurePrivateRepo();
 if (req.method === 'GET') return json(res,200,publicationStatus(account.id,await readPublication(account.id)));

 const input = await body(req);
 if (!input || !Object.hasOwn(input,'sha') || (input.sha !== null && !/^[a-f0-9]{40}$/.test(input.sha))) {
  return json(res,400,{error:'نسخه انتشار معتبر نیست.'});
 }
 let portfolio = null;
 if (req.method === 'PUT') {
  try {
   portfolio = normalize(input.portfolio);
   if (!portfolio.name || !portfolio.title || !portfolio.field || portfolio.projects.some(project => !project.title)) {
    throw Error('نام، تخصص و عنوان همه پروژه‌ها را تکمیل کن.');
   }
  } catch (error) {
   return json(res,400,{error:error.message});
  }
 }
 const current = await readPublication(account.id);
 const conflict = () => json(res,409,{error:'نسخه منتشرشده تغییر کرده است. وضعیت را تازه کن و دوباره بررسی کن.'});
 if (current.sha !== input.sha) return conflict();
 if (!portfolio && !current.portfolio) return json(res,200,publicationStatus(account.id,current));

 try {
  const saved = await github(publicationFile(account.id),{
   method:'PUT',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    message: portfolio ? 'Publish portfolio' : 'Unpublish portfolio',
    content: Buffer.from(JSON.stringify({portfolio})).toString('base64'),
    ...(current.sha ? {sha:current.sha} : {})
   })
  });
  await indexGitHubPortfolio(account, portfolio || current.portfolio, Boolean(portfolio));
  await logAdminEvent({type:portfolio?'publish':'unpublish',userId:account.id,login:account.login,siteName:(portfolio||current.portfolio)?.name||'',template:(portfolio||current.portfolio)?.template||'unknown'});
  return json(res,200,publicationStatus(account.id,{sha:saved.content.sha,portfolio}));
 } catch (error) {
  if ([409,422].includes(error.status)) return conflict();
  throw error;
 }
}

function redirect(res,url,headers={}){res.writeHead(302,{Location:url,...headers});res.end();}
const accounts = accountRoutes({ records, store, origin, cookies, cookie, json, body });
return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://esm.sh https://cdn.esm.sh 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' about:; worker-src 'self' blob:; connect-src 'self' https://esm.sh https://cdn.esm.sh https://staticimgly.com https://cdn.jsdelivr.net; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'");
 try{
 const url=new URL(req.url,origin),path=url.pathname;
 const now = Date.now();
 if (now >= nextCleanup) {
  nextCleanup = now + 60000;
  for (const [key,value] of memory) if (value.expires <= now) memory.delete(key);
  for (const [key,value] of rates) if (value.until <= now) rates.delete(key);
  for (const [key,value] of backgroundRates) if (value.until <= now) backgroundRates.delete(key);
 }
 if (['GET','HEAD'].includes(req.method) && ['/robots.txt','/sitemap.xml'].includes(path)) {
  const sitemap = path === '/sitemap.xml';
  const canonical = new URL('/',origin).href.replace(/&/g,'&amp;');
  const content = sitemap
   ? '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+canonical+'</loc></url></urlset>'
   : 'User-agent: *\nAllow: /\nSitemap: '+new URL('/sitemap.xml',origin).href+'\n';
  res.writeHead(200,{'Content-Type':sitemap?'application/xml; charset=utf-8':'text/plain; charset=utf-8'});
  return res.end(req.method==='HEAD'?undefined:content);
 }
 if(['POST','PUT','DELETE'].includes(req.method)&&req.headers.origin!==origin)return json(res,403,{error:'مبدأ درخواست معتبر نیست'});
 const adminRoute = path === '/admin' || path === '/admin.js' || path.startsWith('/admin/') || path.startsWith('/api/admin/');
 if (adminRoute) {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'no-store');
  const configuredError = 'ورود مدیر هنوز روی سرور تنظیم نشده است.';
  if (path === '/admin/login' && req.method === 'POST') {
   if (!credentialTag) return adminLoginPage(req, res, 503, configuredError);
   const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'unknown';
   if (!await store.allowAttempt('admin-attempt:' + digest(ip).toString('hex'))) {
    res.setHeader('Retry-After', '300');
    return adminLoginPage(req, res, 429, 'تعداد تلاش‌ها زیاد است. پنج دقیقه دیگر دوباره امتحان کن.');
   }
   const input = new URLSearchParams(await readBody(req, 4096));
   const usernameOk = timingSafeEqual(digest(input.get('username') || ''), digest(adminUsername));
   const passwordOk = timingSafeEqual(digest(input.get('password') || ''), digest(adminPassword));
   if (!usernameOk || !passwordOk) return adminLoginPage(req, res, 401, 'نام کاربری یا رمز عبور اشتباه است.');
   const token = randomBytes(32).toString('hex');
   const previous = cookies(req).pb_admin || '';
   if (/^[a-f0-9]{64}$/.test(previous)) await store.remove('admin-session:' + previous);
   await store.put('admin-session:' + token, { credentialTag, expires: Date.now() + adminSessionAge * 1000 });
   res.writeHead(303, { Location: '/admin', 'Set-Cookie': cookie('pb_admin', token, adminSessionAge) });
   return res.end();
  }
  const authorized = await hasAdminSession(req);
  if (path === '/admin/logout' && req.method === 'POST') {
   if (authorized) await store.remove('admin-session:' + cookies(req).pb_admin);
   res.writeHead(303, { Location: '/admin', 'Set-Cookie': cookie('pb_admin', '', 0) });
   return res.end();
  }
  if (path === '/admin' && ['GET','HEAD'].includes(req.method)) {
   if (!credentialTag) return adminLoginPage(req, res, 503, configuredError);
   if (!authorized) return adminLoginPage(req, res);
   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
   return res.end(req.method === 'HEAD' ? undefined : adminHTML);
  }
  if (!credentialTag) return json(res, 503, { error: configuredError });
  if (!authorized) return json(res, 401, { error: 'ابتدا وارد حساب مدیر شو.' });
  if (path === '/admin.js' && ['GET','HEAD'].includes(req.method)) {
   res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
   return res.end(req.method === 'HEAD' ? undefined : adminJS);
  }
 }
 if (['/builder','/preview-frame','/account'].includes(path)) res.setHeader('X-Robots-Tag','noindex');
 if (await accounts(req, res, path) || res.writableEnded) return;
 if (path === '/api/admin/overview' && req.method === 'GET') {
  const userRows = await records.list('admin:user:');
  const users = userRows.map(row => ({
   id: String(row.id), login: row.login || '', type: row.type || 'account',
   createdAt: row.createdAt || null, firstSeenAt: row.firstSeenAt || null, lastSeenAt: row.lastSeenAt || null
  }));
  const views = await records.list('admin:analytics:view:');
  const viewBySite = new Map();
  const dailyMap = new Map();
  let totalViews = 0;
  const today = new Date().toISOString().slice(0, 10);
  let todayViews = 0;
  for (const item of views) {
   const count = Number(item.count || 0);
   totalViews += count;
   viewBySite.set(item.siteKey, (viewBySite.get(item.siteKey) || 0) + count);
   dailyMap.set(item.day, (dailyMap.get(item.day) || 0) + count);
   if (item.day === today) todayViews += count;
  }
  const sites = [];
  let backgroundUsed = 0, backgroundRemaining = 0, backgroundLimit = 0;
  for (const user of users) {
   const quotaId = (user.type === 'github' ? 'github:' : 'account:') + user.id;
   const quota = await records.getBackgroundQuota(quotaId, 2);
   user.backgroundUsed = quota.used;
   user.backgroundRemaining = quota.remaining;
   user.siteCount = 0;
   user.views = 0;
   backgroundUsed += quota.used;
   backgroundRemaining += quota.remaining;
   backgroundLimit += 2;
   const savedSites = await records.list('site:' + user.id + ':');
   for (const site of savedSites) {
    const siteKey = 'site:' + user.id + ':' + site.id;
    const siteViews = viewBySite.get(siteKey) || 0;
    sites.push({
     ...site, ownerId: user.id, ownerLogin: user.login, ownerType: user.type,
     views: siteViews, template: site.template || 'unknown'
    });
    user.siteCount++;
    user.views += siteViews;
   }
  }
  const templateStats = Object.entries(adminTemplateNames).map(([id, name]) => ({
   id, name, count: sites.filter(site => site.template === id).length
  }));
  const dailyViews = [];
  for (let i = 13; i >= 0; i--) {
   const d = new Date();
   d.setUTCHours(0, 0, 0, 0);
   d.setUTCDate(d.getUTCDate() - i);
   const day = d.toISOString().slice(0, 10);
   dailyViews.push({ day, views: dailyMap.get(day) || 0 });
  }
  const events = (await records.list('admin:analytics:event:')).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 40);
  users.sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
  sites.sort((a, b) => Number(b.updated || 0) - Number(a.updated || 0));
  return json(res, 200, {
   admin: { login: adminUsername, id: adminUsername },
   summary: {
    totalUsers: users.length, totalSites: sites.length,
    publishedSites: sites.filter(site => Boolean(site.url)).length,
    totalViews, todayViews, backgroundUsed, backgroundRemaining, backgroundLimit,
    aiTokenTracking: false
   },
   users, sites, templateStats, dailyViews, events
  });
 }
 if(path==='/api/background-quota'&&req.method==='GET'){
   const userId=await backgroundUserId(req);
   if(!userId)return json(res,401,{error:'برای دیدن سهمیه و استفاده از حذف پس‌زمینه ابتدا وارد حساب کاربری شو.'});
   const quota=await records.getBackgroundQuota(userId,2);
   return json(res,200,{limit:2,used:quota.used,remaining:quota.remaining});
  }
  if(path==='/api/remove-background'&&req.method==='POST'){
   const userId=await backgroundUserId(req);
   if(!userId)return json(res,401,{error:'برای استفاده از دو نوبت حذف پس‌زمینه ابتدا وارد حساب کاربری شو.'});
   if(!env.REMOVE_BG_API_KEY)return json(res,503,{error:'سرویس حذف پس‌زمینه هنوز روی سرور تنظیم نشده است.'});
   const ip=String(req.headers['cf-connecting-ip']||req.socket.remoteAddress||'unknown');
   const now=Date.now(),rate=backgroundRates.get(ip)||{count:0,until:now+600000};
   if(now>=rate.until){rate.count=0;rate.until=now+600000;}
   rate.count++;backgroundRates.set(ip,rate);
   if(rate.count>5)return json(res,429,{error:'تعداد درخواست‌ها از این اتصال زیاد است؛ ۱۰ دقیقه دیگر دوباره تلاش کن.'});
   const input=await body(req,5_100_000);
   const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input?.image||'');
   if(!match)return json(res,400,{error:'تصویر ارسالی معتبر نیست؛ دوباره تصویر را انتخاب کن.'});
   const mime=match[1],bytes=Buffer.from(match[2],'base64');
   if(!bytes.length||bytes.length>4_000_000)return json(res,413,{error:'حجم تصویر برای پردازش بیش از حد مجاز است.'});
   const reservation=await records.reserveBackgroundRemoval(userId,2);
   if(!reservation.allowed)return json(res,429,{error:'سهمیه شما تمام شده است؛ هر حساب کاربری فقط ۲ بار می‌تواند پس‌زمینه تصویر را حذف کند.',limit:2,used:reservation.used,remaining:0});
   let committed=false;
   try {
    const extension=mime==='image/jpeg'?'jpg':mime.split('/')[1];
    const form=new FormData();
    form.append('image_file',new Blob([bytes],{type:mime}),'portrait.'+extension);
    form.append('size','auto');
    const upstream=await fetchImpl('https://api.remove.bg/v1.0/removebg',{
     method:'POST',headers:{'X-Api-Key':env.REMOVE_BG_API_KEY},body:form,signal:AbortSignal.timeout(60000)
    });
    if(!upstream.ok){
     let detail='';
     try{const payload=await upstream.json();detail=payload.errors?.[0]?.title||payload.errors?.[0]?.detail||payload.errors?.[0]?.message||'';}catch{}
     if(upstream.status===402)return json(res,402,{error:'اعتبار یا سهمیه API سرویس remove.bg تمام شده است.'});
     if(upstream.status===429)return json(res,429,{error:'سرویس remove.bg موقتاً محدودیت درخواست اعمال کرده؛ کمی بعد دوباره تلاش کن.'});
     return json(res,502,{error:'سرویس remove.bg تصویر را پردازش نکرد.'+(detail?' '+String(detail).slice(0,140):'')});
    }
    const output=Buffer.from(await upstream.arrayBuffer());
    if(!output.length||output.length>15_000_000)return json(res,502,{error:'فایل خروجی سرویس معتبر یا در اندازه مجاز نیست.'});
    const quota=await records.commitBackgroundRemoval(userId,reservation.id,2);
    if(!quota)return json(res,503,{error:'ثبت سهمیه کامل نشد؛ لطفاً دوباره تلاش کن.'});
    committed=true;
    res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','Content-Length':output.length,'X-Background-Quota-Limit':'2','X-Background-Quota-Remaining':String(quota.remaining)});
    return res.end(output);
   } finally {
    if(!committed)await records.releaseBackgroundRemoval(userId,reservation.id);
   }
  }
  if(path==='/api/session')return json(res,200,{configured,user:(await session(req))?.user||null});
 if(path==='/auth/login'&&req.method==='GET'){
  if(!configured)return json(res,503,{error:'ورود آنلاین هنوز روی سرور تنظیم نشده است.'});
  const state=randomBytes(24).toString('hex');await store.put("oauth:"+state,{expires:Date.now()+600000});
  return redirect(res,`https://github.com/login/oauth/authorize?${new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:origin+'/auth/callback',state,scope:'read:user'})}`,{'Set-Cookie':cookie('pb_state',state,600)});
 }
 if(path==='/auth/callback'&&req.method==='GET'){
  const state=url.searchParams.get('state');
  if(!configured||!state||cookies(req).pb_state!==state||!url.searchParams.get('code'))return json(res,400,{error:'ورود منقضی شده؛ دوباره تلاش کنید.'});
  const pending=await store.take("oauth:"+state);
  if(!pending||pending.expires<=Date.now())return json(res,400,{error:'ورود منقضی شده؛ دوباره تلاش کنید.'});
  const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:origin+'/auth/callback'}),signal:AbortSignal.timeout(15000)});
  const token=await response.json();if(!token.access_token)throw Error('ورود با گیت‌هاب انجام نشد');
  const profile=await github('/user',{},token.access_token);const id=randomBytes(32).toString('hex');const user={id:String(profile.id),login:profile.login};await indexAdminUser(user,'github',false);await store.put("session:"+id,{user,expires:Date.now()+86400000});
  return redirect(res,'/builder',{'Set-Cookie':[cookie('pb_session',`${id}.${signature(id)}`,86400),cookie('pb_state','',0)]});
 }
 if(path==='/auth/logout'&&req.method==='POST'){const s=cookies(req).pb_session||'';if(await session(req))await store.remove('session:'+s.slice(0,s.lastIndexOf('.')));res.setHeader('Set-Cookie',cookie('pb_session','',0));return json(res,200,{ok:true});}
 if(path==='/api/publication') return await managePublication(req,res);
 const publicPortfolio = /^\/p\/([1-9][0-9]{0,19})(?:\/(plans|projects)(?:\/([a-z0-9-]{1,48}))?)?$/.exec(path);
 if(publicPortfolio && ['GET','HEAD'].includes(req.method)){
  if(!configured) return json(res,404,{error:'پورتفولیو در دسترس نیست.'});
  const record = await readPublication(publicPortfolio[1]);
  if(!record.portfolio) return json(res,404,{error:'این پورتفولیو منتشر نشده است.'});
  const [,id,section,project]=publicPortfolio;
  const p=normalize(record.portfolio);
  if ((section==='plans' && (!p.plans.enabled || project)) || (project && !p.projects.some(item=>item.id===project))) return json(res,404,{error:'صفحه پیدا نشد.'});
  const page=section==='plans'?'plans':project||(section==='projects'?'works':'home');
  await recordAdminPageView('site:' + id + ':github', req);
  const html = portfolioHTML(p,{page,links:siteLinks('/p/'+id)});
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  return res.end(req.method==='HEAD'?undefined:html);
 }
 if(path==='/api/portfolio'){
  if(!configured)return json(res,503,{error:'ذخیره آنلاین هنوز تنظیم نشده است. فعلاً پشتیبان یا خروجی سایت را دریافت کنید.'});
  const s=await session(req);if(!s)return json(res,401,{error:'ابتدا وارد حساب گیت‌هاب شوید.'});
  const rate=rates.get(s.user.id)||{count:0,until:Date.now()+60000};if(Date.now()>rate.until){rate.count=0;rate.until=Date.now()+60000;}rate.count++;rates.set(s.user.id,rate);if(rate.count>20)return json(res,429,{error:'کمی صبر کنید و دوباره تلاش کنید.'});
  await ensurePrivateRepo();const file=`/repos/${env.GITHUB_DATA_REPO}/contents/portfolios/${s.user.id}/profile.json`;
  if(req.method==='GET'){try{const r=await github(file);let text;if(r.content){text=Buffer.from(r.content,'base64').toString('utf8');}else{const blob=await github(`/repos/${env.GITHUB_DATA_REPO}/git/blobs/${r.sha}`);text=Buffer.from(blob.content,'base64').toString('utf8');}const portfolio=JSON.parse(text);const published=Boolean((await readPublication(s.user.id)).portfolio);await indexGitHubPortfolio(s.user,portfolio,published);return json(res,200,{portfolio,sha:r.sha});}catch(err){if(err.status===404)return json(res,404,{error:'هنوز اطلاعاتی در حساب ذخیره نشده است.'});throw err;}}
  if(req.method==='PUT'){
   const input=await body(req);let p;try{p=normalize(input.portfolio);if(!p.name||!p.title||!p.field)throw Error('نام و تخصص را تکمیل کنید');if(p.projects.some(x=>!x.title))throw Error('عنوان پروژه الزامی است');}catch(err){return json(res,400,{error:err.message});}
   let current=null;try{current=await github(file);}catch(err){if(err.status!==404)throw err;}
   if((current?.sha||null)!==(input.sha||null))return json(res,409,{error:'نسخه آنلاین تغییر کرده است. ابتدا پشتیبان بگیرید و سپس اطلاعات حساب را بازیابی کنید.'});
   try{const r=await github(file,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Update portfolio ${s.user.id}`,content:Buffer.from(JSON.stringify(p,null,2)).toString('base64'),...(current?{sha:current.sha}:{})})});const published=Boolean((await readPublication(s.user.id)).portfolio);await indexGitHubPortfolio(s.user,p,published);await logAdminEvent({type:'save',userId:s.user.id,login:s.user.login,siteName:p.name||'',template:p.template||'unknown'});return json(res,200,{sha:r.content.sha});}catch(err){if([409,422].includes(err.status))return json(res,409,{error:'تداخل ذخیره؛ نسخه حساب را دوباره بازیابی کنید.'});throw err;}
  }
  return json(res,405,{error:'روش درخواست مجاز نیست'});
 }
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'روش درخواست مجاز نیست'});
 if(path==='/preview-frame'){
  const bridge=(await loadAsset('preview-bridge.js')).toString('utf8');
  const scriptHash=createHash('sha256').update(bridge).digest('base64');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; sandbox allow-scripts`);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
  return res.end(req.method==='HEAD'?undefined:`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>پیش‌نمایش پورتفولیو</title><style id="portfolio-style"></style><style>html{scrollbar-width:none;scroll-behavior:auto;overflow-anchor:none}::-webkit-scrollbar{display:none}</style></head><body><script>${bridge}</script></body></html>`);
 }
 const files={'/site-pages.js':['site-pages.js','text/javascript'],'/site-editor.js':['site-editor.js','text/javascript'],'/account':['account.html','text/html'],'/account.js':['account.js','text/javascript'],'/assets/hero/builder-reference.png':['assets/hero/builder-reference.png','image/png'],'/customize.js':['customize.js','text/javascript'],'/customize-ui.js':['customize-ui.js','text/javascript'],'/elementor.js':['elementor.js','text/javascript'],'/elementor-runtime.js':['elementor-runtime.js','text/javascript'],'/wordpress.js':['wordpress.js','text/javascript'],'/wordpress-runtime.js':['wordpress-runtime.js','text/javascript'],'/zip.js':['zip.js','text/javascript'],'/icons.js':['icons.js','text/javascript'],'/motion.js':['motion.js','text/javascript'],'/builder-scroll.js':['builder-scroll.js','text/javascript'],'/preview-bridge.js':['preview-bridge.js','text/javascript'],'/preview.js':['preview.js','text/javascript'],'/demo.js':['demo.js','text/javascript'],'/assets/demo/man.png':['assets/demo/man.png','image/png'],'/assets/demo/woman.png':['assets/demo/woman.png','image/png'],'/assets/demo/architecture.webp':['assets/demo/architecture.webp','image/webp'],'/assets/demo/dashboard.webp':['assets/demo/dashboard.webp','image/webp'],'/assets/demo/branding.webp':['assets/demo/branding.webp','image/webp'],'/builder':['builder.html','text/html'],'/theme.js':['theme.js','text/javascript'],'/landing.js':['landing.js','text/javascript'],'/font.css':['font.css','text/css'],'/font.js':['font.js','text/javascript'],'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/avatar-upload.js':['avatar-upload.js','text/javascript'],'/shared.js':['shared.js','text/javascript'],'/style.css':['style.css','text/css']};
 if(!files[path])return json(res,404,{error:'صفحه پیدا نشد'});
 const [file,type]=files[path];
 let content=await loadAsset(file);
 const verification=env.GOOGLE_SITE_VERIFICATION;
 if (path==='/' && /^[a-zA-Z0-9_-]{1,200}$/.test(verification||'')) {
  content=content.toString('utf8').replace('</head>','<meta name="google-site-verification" content="'+verification+'"></head>');
 }
 res.writeHead(200,{'Content-Type':type+(type.startsWith('image/')?'':'; charset=utf-8'),'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
 }catch(err){json(res,[400,413].includes(err.status)?err.status:502,{error:err.message||'خطای سرور؛ دوباره تلاش کنید.'});}
});
}
