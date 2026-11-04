import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalize} from './public/shared.js';
const env=process.env,portArg=process.argv.indexOf('--port'),port=Number(env.PORT||(portArg>=0?process.argv[portArg+1]:3000)),origin=env.APP_ORIGIN||`http://localhost:${port}`;
const configured=Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_SECRET?.length>=32&&env.GITHUB_DATA_REPO&&env.GITHUB_DATA_TOKEN);
const sessions=new Map(),states=new Map(),rates=new Map();
function signature(s){return createHmac('sha256',env.SESSION_SECRET||'local-development-no-auth').update(s).digest('hex');}
function cookie(name,value,maxAge){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${origin.startsWith('https:')?'; Secure':''}`;}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1)];}));}
function session(req){const value=cookies(req).pb_session||'',i=value.lastIndexOf('.'),id=value.slice(0,i),sig=value.slice(i+1),expected=signature(id);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const s=sessions.get(id);return s&&s.expires>Date.now()?s:null;}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function github(path,options={},token=env.GITHUB_DATA_TOKEN){const res=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'portfoilo-builder',...options.headers},signal:AbortSignal.timeout(15000)});const body=await res.json();if(!res.ok){const err=Error('ارتباط با مخزن انجام نشد. تنظیمات سرور یا دسترسی را بررسی کنید.');err.status=res.status;throw err;}return body;}
async function ensurePrivateRepo(){if(!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_DATA_REPO||''))throw Error('مخزن داده تنظیم نشده است');const repo=await github(`/repos/${env.GITHUB_DATA_REPO}`);if(!repo.private)throw Error('ذخیره اطلاعات فقط در مخزن خصوصی مجاز است.');}
async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>5_100_000){const err=Error('حجم درخواست بیش از حد مجاز است');err.status=413;throw err;}chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{const err=Error('اطلاعات درخواست معتبر نیست');err.status=400;throw err;}}
function redirect(res,url,headers={}){res.writeHead(302,{Location:url,...headers});res.end();}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' about:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'");
 try{
 const url=new URL(req.url,origin),path=url.pathname;
 if(['POST','PUT','DELETE'].includes(req.method)&&req.headers.origin!==origin)return json(res,403,{error:'مبدأ درخواست معتبر نیست'});
 if(path==='/api/session')return json(res,200,{configured,user:session(req)?.user||null});
 if(path==='/auth/login'&&req.method==='GET'){
  if(!configured)return json(res,503,{error:'ورود آنلاین هنوز روی سرور تنظیم نشده است.'});
  const state=randomBytes(24).toString('hex');states.set(state,Date.now()+600000);
  return redirect(res,`https://github.com/login/oauth/authorize?${new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:origin+'/auth/callback',state,scope:'read:user'})}`,{'Set-Cookie':cookie('pb_state',state,600)});
 }
 if(path==='/auth/callback'&&req.method==='GET'){
  const state=url.searchParams.get('state'),expires=states.get(state);states.delete(state);
  if(!configured||!state||cookies(req).pb_state!==state||!expires||expires<Date.now()||!url.searchParams.get('code'))return json(res,400,{error:'ورود منقضی شده؛ دوباره تلاش کنید.'});
  const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:origin+'/auth/callback'}),signal:AbortSignal.timeout(15000)});
  const token=await response.json();if(!token.access_token)throw Error('ورود با گیت‌هاب انجام نشد');
  const profile=await github('/user',{},token.access_token);const id=randomBytes(32).toString('hex');sessions.set(id,{user:{id:String(profile.id),login:profile.login},expires:Date.now()+86400000});
  return redirect(res,'/',{'Set-Cookie':[cookie('pb_session',`${id}.${signature(id)}`,86400),cookie('pb_state','',0)]});
 }
 if(path==='/auth/logout'&&req.method==='POST'){const s=cookies(req).pb_session||'';sessions.delete(s.slice(0,s.lastIndexOf('.')));res.setHeader('Set-Cookie',cookie('pb_session','',0));return json(res,200,{ok:true});}
 if(path==='/api/portfolio'){
  if(!configured)return json(res,503,{error:'ذخیره آنلاین هنوز تنظیم نشده است. فعلاً پشتیبان یا خروجی سایت را دریافت کنید.'});
  const s=session(req);if(!s)return json(res,401,{error:'ابتدا وارد حساب گیت‌هاب شوید.'});
  const rate=rates.get(s.user.id)||{count:0,until:Date.now()+60000};if(Date.now()>rate.until){rate.count=0;rate.until=Date.now()+60000;}rate.count++;rates.set(s.user.id,rate);if(rate.count>20)return json(res,429,{error:'کمی صبر کنید و دوباره تلاش کنید.'});
  await ensurePrivateRepo();const file=`/repos/${env.GITHUB_DATA_REPO}/contents/portfolios/${s.user.id}/profile.json`;
  if(req.method==='GET'){try{const r=await github(file);let text;if(r.content){text=Buffer.from(r.content,'base64').toString('utf8');}else{const blob=await github(`/repos/${env.GITHUB_DATA_REPO}/git/blobs/${r.sha}`);text=Buffer.from(blob.content,'base64').toString('utf8');}return json(res,200,{portfolio:JSON.parse(text),sha:r.sha});}catch(err){if(err.status===404)return json(res,404,{error:'هنوز اطلاعاتی در حساب ذخیره نشده است.'});throw err;}}
  if(req.method==='PUT'){
   const input=await body(req);let p;try{p=normalize(input.portfolio);if(!p.name||!p.title||!p.field)throw Error('نام و تخصص را تکمیل کنید');if(p.projects.some(x=>!x.title))throw Error('عنوان پروژه الزامی است');}catch(err){return json(res,400,{error:err.message});}
   let current=null;try{current=await github(file);}catch(err){if(err.status!==404)throw err;}
   if((current?.sha||null)!==(input.sha||null))return json(res,409,{error:'نسخه آنلاین تغییر کرده است. ابتدا پشتیبان بگیرید و سپس اطلاعات حساب را بازیابی کنید.'});
   try{const r=await github(file,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Update portfolio ${s.user.id}`,content:Buffer.from(JSON.stringify(p,null,2)).toString('base64'),...(current?{sha:current.sha}:{})})});return json(res,200,{sha:r.content.sha});}catch(err){if([409,422].includes(err.status))return json(res,409,{error:'تداخل ذخیره؛ نسخه حساب را دوباره بازیابی کنید.'});throw err;}
  }
  return json(res,405,{error:'روش درخواست مجاز نیست'});
 }
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'روش درخواست مجاز نیست'});
 const files={'/wordpress.js':['wordpress.js','text/javascript'],'/wordpress-runtime.js':['wordpress-runtime.js','text/javascript'],'/zip.js':['zip.js','text/javascript'],'/icons.js':['icons.js','text/javascript'],'/motion.js':['motion.js','text/javascript'],'/builder-scroll.js':['builder-scroll.js','text/javascript'],'/preview-bridge.js':['preview-bridge.js','text/javascript'],'/preview.js':['preview.js','text/javascript'],'/demo.js':['demo.js','text/javascript'],'/assets/demo/man.png':['assets/demo/man.png','image/png'],'/assets/demo/woman.png':['assets/demo/woman.png','image/png'],'/assets/demo/architecture.webp':['assets/demo/architecture.webp','image/webp'],'/assets/demo/dashboard.webp':['assets/demo/dashboard.webp','image/webp'],'/assets/demo/branding.webp':['assets/demo/branding.webp','image/webp'],'/builder':['builder.html','text/html'],'/theme.js':['theme.js','text/javascript'],'/landing.js':['landing.js','text/javascript'],'/font.css':['font.css','text/css'],'/font.js':['font.js','text/javascript'],'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/shared.js':['shared.js','text/javascript'],'/style.css':['style.css','text/css']};
 if(!files[path])return json(res,404,{error:'صفحه پیدا نشد'});
 const [file,type]=files[path],content=await readFile(new URL(`./public/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':type+(type.startsWith('image/')?'':'; charset=utf-8'),'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
 }catch(err){json(res,err.status===413?413:502,{error:err.message||'خطای سرور؛ دوباره تلاش کنید.'});}
});
const cleanup=setInterval(()=>{const now=Date.now();for(const[k,v]of sessions)if(v.expires<now)sessions.delete(k);for(const[k,v]of states)if(v<now)states.delete(k);for(const[k,v]of rates)if(v.until<now)rates.delete(k);},60000);cleanup.unref();
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(port,()=>console.log(`Portfolio Builder listening on ${origin} (${configured?'online enabled':'local mode'})`));
