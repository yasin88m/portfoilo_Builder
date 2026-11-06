export function avatarUploadMarkup(data, escape, icon = () => '', busy = false) {
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
     <div class="avatar-tools" data-background-busy="${busy}">
      <button type="button" id="removeAvatarBackground" class="button avatar-bg-button" ${busy ? 'disabled' : ''} aria-label="حذف پس‌زمینه تصویر و دریافت PNG">
       ${icon('sparkles')} حذف پس‌زمینه و خروجی PNG
      </button>
      ${hasOriginal ? '<button type="button" id="restoreAvatarOriginal" class="textbutton">بازگردانی تصویر اصلی</button>' : ''}
      <div class="background-progress" aria-hidden="true">
       <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
        <defs><pattern id="cutoutGrid" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#dde0f6"/><path d="M0 0h4v4H0zm4 4h4v4H4z" fill="#8b8fbc"/></pattern></defs>
        <rect x="4" y="4" width="40" height="40" rx="10" fill="#30275a" stroke="#8275d5"/>
        <rect class="cutout-grid" x="5" y="5" width="38" height="38" rx="9" fill="url(#cutoutGrid)"/>
        <circle cx="24" cy="18" r="6" fill="#7251e6"/><path d="M13 36a11 11 0 0 1 22 0z" fill="#7251e6"/>
        <path class="cutout-scan" d="M8 24h32" stroke="#a8ffe9" stroke-width="2" stroke-linecap="round"/>
       </svg>
      </div>
      <small id="avatarBgStatus" role="status" aria-live="polite">${busy ? 'در حال جدا کردن سوژه از پس‌زمینه…' : 'تصویر اصلی برای بازگردانی نگه داشته می‌شود.'}</small>
      <button type="button" id="removeAvatar" class="textbutton">حذف تصویر</button>
     </div>` : ''}
   </div>
  </section>`;
}
