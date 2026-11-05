import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarUploadMarkup} from '../public/avatar-upload.js';

const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const icon=name=>'<svg data-icon="'+name+'"></svg>';

test('empty avatar state has a clear upload action without native no-file text',()=>{
 const html=avatarUploadMarkup({avatar:'',avatarOriginal:''},escape,icon);
 assert.match(html,/id="avatarFile"/);
 assert.match(html,/هنوز تصویری انتخاب نشده/);
 assert.match(html,/انتخاب تصویر/);
 assert.doesNotMatch(html,/Choose File|No file chosen|فایلی انتخاب نشده/);
 assert.doesNotMatch(html,/id="removeAvatarBackground"/);
});

test('uploaded avatar always shows mobile-friendly background removal action',()=>{
 const html=avatarUploadMarkup({avatar:'data:image/webp;base64,AAAA',avatarOriginal:'data:image/webp;base64,AAAA'},escape,icon);
 assert.match(html,/تصویر با موفقیت بارگذاری شد/);
 assert.match(html,/تعویض تصویر/);
 assert.match(html,/id="removeAvatarBackground"/);
 assert.match(html,/حذف پس‌زمینه و خروجی PNG/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/avatar-bg-button/);
 assert.doesNotMatch(html,/Choose File|No file chosen|فایلی انتخاب نشده/);
});

test('transparent PNG keeps original-image restore action',()=>{
 const html=avatarUploadMarkup({avatar:'data:image/png;base64,AAAA',avatarOriginal:'data:image/webp;base64,BBBB'},escape,icon);
 assert.match(html,/بازگردانی تصویر اصلی/);
 assert.match(html,/data:image\/png/);
});
