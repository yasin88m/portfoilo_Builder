import { randomBytes, timingSafeEqual, webcrypto } from 'node:crypto';
import { normalize, portfolioHTML } from './public/shared.js';

const id = () => randomBytes(16).toString('hex');
const siteId = /^[a-f0-9]{32}$/;
const sessionTTL = 7 * 86400;
const encoder = new TextEncoder();
const rounds = 600000;

export async function passwordHash(password, salt) {
 const key = await webcrypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
 return Buffer.from(await webcrypto.subtle.deriveBits({
  name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(salt, 'hex'), iterations: rounds
 }, key, 256));
}

export function memoryRecords() {
 const rows = new Map();
 return {
  read: key => rows.get(key) || null,
  write(key, value, expected, summary = null) {
   if ((rows.get(key)?.revision ?? null) !== expected) return null;
   const revision = id();
   rows.set(key, { value, revision, summary });
   return revision;
  },
  list: prefix => [...rows].filter(([key, row]) => key.startsWith(prefix) && row.summary).map(([, row]) => row.summary)
 };
}

export function accountRoutes({ records, store, origin, cookies, cookie, json, body }) {
 const responseError = (res, status, error) => json(res, status, { error });
 const siteURL = (owner, site) => `${origin}/sites/${owner}/${site}`;
 async function currentUser(req) {
  const token = cookies(req).pb_account || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await store.get('account-session:' + token);
  return row?.expires > Date.now() ? row.user : null;
 }
 async function authenticate(req, res, register) {
  const input = await body(req, 4096);
  const login = typeof input?.login === 'string' ? input.login.trim().toLowerCase() : '';
  const password = input?.password;
  if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(login) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
   return responseError(res, 400, 'نام کاربری باید ۳ تا ۳۲ نویسه انگلیسی و رمز حداقل ۱۲ نویسه باشد.');
  }
  const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'local';
  const key = 'limit:' + ip + ':' + Math.floor(Date.now() / 300000);
  if (!(await store.allowAttempt(key))) return responseError(res, 429, 'تعداد تلاش‌ها زیاد است. چند دقیقه دیگر دوباره امتحان کن.');
  const accountKey = 'user:' + login;
  const account = (await records.read(accountKey))?.value;
  const salt = register || !account ? id() : account.salt;
  const hash = Buffer.from(await (records.hashPassword || passwordHash)(password, salt));
  let user;
  if (register) {
   user = { id: id(), login };
   if (!(await records.write(accountKey, { user, salt, hash: hash.toString('hex') }, null))) {
    return responseError(res, 409, 'این نام کاربری در دسترس نیست.');
   }
  } else {
   const matches = timingSafeEqual(hash, Buffer.from(account?.hash || '0'.repeat(64), 'hex'));
   if (!account || !matches) return responseError(res, 401, 'نام کاربری یا رمز عبور نادرست است.');
   user = account.user;
  }
  const oldToken = cookies(req).pb_account || '';
  if (/^[a-f0-9]{64}$/.test(oldToken)) await store.remove('account-session:' + oldToken);
  const token = randomBytes(32).toString('hex');
  await store.put('account-session:' + token, { user, expires: Date.now() + sessionTTL * 1000 });
  res.setHeader('Set-Cookie', cookie('pb_account', token, sessionTTL));
  return json(res, 200, { user });
 }

 function summary(owner, site, value) {
  return { id: site, name: value.draft.name, title: value.draft.title, updated: value.updated, url: value.published ? siteURL(owner, site) : null };
 }

 async function sites(req, res, path) {
  const user = await currentUser(req);
  if (!user) return responseError(res, 401, 'برای ذخیره یا انتشار وارد حساب شو.');
  const prefix = 'site:' + user.id + ':';
  const site = path.split('/')[3];
  if (!site && req.method === 'GET') {
   const list = await records.list(prefix);
   return json(res, 200, { sites: list.sort((a, b) => b.updated - a.updated) });
  }
  if (site && !siteId.test(site)) return responseError(res, 404, 'سایت پیدا نشد.');
  if (site && req.method === 'GET') {
   const saved = await records.read(prefix + site);
   if (!saved) return responseError(res, 404, 'سایت پیدا نشد.');
   return json(res, 200, { ...saved.summary, revision: saved.revision, portfolio: saved.value.draft });
  }
  if ((!site && req.method !== 'POST') || (site && req.method !== 'PUT')) return responseError(res, 405, 'روش درخواست مجاز نیست.');
  const input = await body(req);
  const action = input?.action;
  if (!['save', 'publish', 'unpublish'].includes(action) || (!site && action === 'unpublish')) return responseError(res, 400, 'عملیات معتبر نیست.');
  const current = site ? await records.read(prefix + site) : null;
  if (site && !current) return responseError(res, 404, 'سایت پیدا نشد.');
  const conflict = () => responseError(res, 409, 'این سایت در جای دیگری تغییر کرده. پیش از بارگذاری دوباره، از تغییراتت پشتیبان بگیر.');
  if (site && input.revision !== current.revision) return conflict();
  let draft = current?.value.draft;
  if (action !== 'unpublish') {
   try {
    draft = normalize(input.portfolio);
    if (!draft.name || !draft.title || !draft.field || draft.projects.some(project => !project.title)) throw Error('نام، تخصص و عنوان پروژه‌ها را تکمیل کن.');
   } catch (error) {
    return responseError(res, 400, error.message);
   }
  }
  const target = site || id();
  const value = { draft, updated: Date.now(), published: action === 'publish' ? draft : action === 'unpublish' ? null : current?.value.published || null };
  const meta = summary(user.id, target, value);
  const revision = await records.write(prefix + target, value, current?.revision ?? null, meta);
  return revision ? json(res, 200, { ...meta, revision }) : conflict();
 }

 return async (req, res, path) => {
  if (path === '/api/account' && req.method === 'GET') return json(res, 200, { user: await currentUser(req) });
  if (path === '/api/account/login' || path === '/api/account/register') {
   if (req.method !== 'POST') return responseError(res, 405, 'روش درخواست مجاز نیست.');
   return authenticate(req, res, path.endsWith('/register'));
  }
  if (path === '/api/account/logout' && req.method === 'POST') {
   const token = cookies(req).pb_account || '';
   if (/^[a-f0-9]{64}$/.test(token)) await store.remove('account-session:' + token);
   res.setHeader('Set-Cookie', cookie('pb_account', '', 0));
   return json(res, 200, { ok: true });
  }
  if (/^\/api\/sites(?:\/[^/]+)?$/.test(path)) return sites(req, res, path);
  const match = /^\/sites\/([a-f0-9]{32})\/([a-f0-9]{32})$/.exec(path);
  if (match && ['GET','HEAD'].includes(req.method)) {
   const row = await records.read('site:' + match[1] + ':' + match[2]);
   if (!row?.value.published) return responseError(res, 404, 'این سایت در دسترس نیست.');
   const html = portfolioHTML(row.value.published).replace('</body>', '<aside style="text-align:center;background:#17152a;color:#fff;padding:14px;font:inherit"><a href="/" style="color:#fff">✦ ساخته‌شده با پورتفولیو بیلدر</a></aside></body>');
   res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
   return res.end(req.method === 'HEAD' ? undefined : html);
  }
 };
}
