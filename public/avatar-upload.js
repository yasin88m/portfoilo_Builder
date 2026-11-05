export function avatarUploadMarkup(data, escape, icon = () => '') {
 const hasAvatar = Boolean(data.avatar);
 const hasOriginal = Boolean(data.avatarOriginal && data.avatarOriginal !== data.avatar);
 return `
  <section class="upload avatar-upload" aria-label="تصویر پروفایل">
   <div class="avatar-preview-wrap">
    ${hasAvatar
      ? `<img class="avatar avatar-transparent" src="${escape(data.avatar)}" alt="پیش‌نمایش تصویر پروفایل">`
      : '<span class="avatar avatar-empty" aria-hidden="true">♙</span>'}
   </div>
   <div class="avatar-upload-content">
    <div class="avatar-upload-heading">
     <strong>تصویر پروفایل</strong>
     <span class="avatar-file-state" role="status">${hasAvatar ? 'تصویر با موفقیت بارگذاری شد' : 'هنوز تصویری انتخاب نشده'}</span>
    </div>
    <input class="avatar-file-input" id="avatarFile" type="file" data-image="avatar" accept="image/png,image/jpeg,image/webp">
    <label class="button secondary avatar-file-button" for="avatarFile">
     ${icon('upload')} ${hasAvatar ? 'تعویض تصویر' : 'انتخاب تصویر'}
    </label>
    <small class="avatar-help">عکس نیم‌تنه بارگذاری کن؛ تصویر کامل بدون برش نمایش داده می‌شود. JPG، PNG یا WebP · حداکثر ۸ مگابایت</small>
    ${hasAvatar ? `
     <div class="avatar-tools">
      <button type="button" id="removeAvatarBackground" class="button avatar-bg-button" aria-label="حذف پس‌زمینه تصویر و دریافت PNG">
       ${icon('sparkles')} حذف پس‌زمینه و خروجی PNG
      </button>
      ${hasOriginal ? '<button type="button" id="restoreAvatarOriginal" class="textbutton">بازگردانی تصویر اصلی</button>' : ''}
      <small id="avatarBgStatus" aria-live="polite">پردازش روی دستگاه خودت انجام می‌شود؛ بار اول مدل هوش مصنوعی دانلود و برای دفعات بعد ذخیره می‌شود.</small>
      <button type="button" id="removeAvatar" class="textbutton">حذف تصویر</button>
     </div>` : ''}
   </div>
  </section>`;
}
