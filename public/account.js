import './locale.js';
import { escapeHTML as escape } from './shared.js';

const $ = selector => document.querySelector(selector);
const form = $('#accountForm');
const status = $('#accountStatus');
const requested = new URL(location.href).searchParams.get('from');
const returnTo = requested === 'builder' ? '/builder' : null;

async function request(path, input) {
 const res = await fetch(path, input ? {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
 } : {});
 const result = await res.json();
 if (!res.ok) throw Error(result.error || 'ارتباط با سرور انجام نشد.');
 return result;
}

async function show(user) {
 form.hidden = Boolean(user);
 $('#accountSites').hidden = !user;
 $('#accountTitle').textContent = user ? 'سایت‌های من' : 'ورود به پورتفولیو ساز';
 status.textContent = user ? `حساب ${user.login}` : '';
 if (!user) return;
 const { sites } = await request('/api/sites');
 $('#siteList').innerHTML = sites.map(site => `<article class="project-editor">
  <h2 data-user-text>${escape(site.name)}</h2><p><span data-user-text>${escape(site.title)}</span> · ${site.url ? 'منتشرشده' : 'پیش‌نویس'}</p>
  <div class="actions"><a class="button secondary" href="/builder?site=${encodeURIComponent(site.id)}">ویرایش سایت</a>
  ${site.url ? `<a class="button secondary" href="${escape(site.url)}" target="_blank" rel="noopener">دیدن صفحه عمومی</a>` : ''}</div>
 </article>`).join('') || '<p>هنوز سایتی در حسابت ذخیره نشده.</p>';
}

form.onsubmit = async event => {
 event.preventDefault();
 const action = event.submitter?.value === 'register' ? 'register' : 'login';
 const inputs = Object.fromEntries(new FormData(form));
 const buttons = [...form.querySelectorAll('button')];
 buttons.forEach(button => { button.disabled = true; });
 status.textContent = 'در حال بررسی…';
 try {
  const { user, admin } = await request('/api/account/' + action, inputs);
  form.reset();
  if (returnTo) location.assign(returnTo);
  else if (admin) location.assign('/admin');
  else await show(user);
 } catch (error) {
  status.textContent = error.message;
 } finally {
  buttons.forEach(button => { button.disabled = false; });
 }
};

$('#logout').onclick = async () => {
 try {
  await request('/api/account/logout', {});
  $('#siteList').replaceChildren();
  await show(null);
 } catch (error) {
  status.textContent = error.message;
 }
};

request('/api/account').then(({ user }) => show(user)).catch(error => { status.textContent = error.message; });
