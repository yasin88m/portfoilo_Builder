export function siteLinks(base) {
 return {
  home: base ? base : './index.html',
  works: base ? base + '/projects' : './projects.html',
  plans: base ? base + '/plans' : './plans.html',
  project: id => base ? base + '/projects/' + id : './project-' + id + '.html'
 };
}

export function siteSections(p, links, e) {
 const contact = links.home + '#contact';
 const reviews = p.reviews.filter(review => review.name && review.quote);
 const plans = p.plans.items.filter(plan => plan.name);
 const reviewMarkup = reviews.length ? `<section class="section site-reviews" id="reviews"><div class="section-heading"><span class="eyebrow">تجربه همکاری</span><h2>نظرات مشتریان</h2></div><div class="review-grid">${reviews.map(review => `<figure class="site-card"><div class="review-rating" aria-label="${review.rating} از ۵">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div><blockquote>${e(review.quote)}</blockquote><figcaption><b>${e(review.name)}</b>${review.role ? `<small>${e(review.role)}</small>` : ''}</figcaption></figure>`).join('')}</div></section>` : '';
 const plansMarkup = `<section class="section site-plans"><header class="site-page-intro"><span class="eyebrow">تعرفه خدمات</span><h1>${e(p.plans.heading || 'پلن‌های همکاری')}</h1><p>${e(p.plans.description)}</p></header><div class="plan-grid">${plans.map(plan => `<article class="site-card plan-card${plan.featured ? ' featured' : ''}"><div class="plan-top"><h2>${e(plan.name)}</h2>${plan.featured ? '<span>پیشنهادی</span>' : ''}</div><div class="plan-price">${e(plan.price)} <small>${e(plan.period)}</small></div><p>${e(plan.description)}</p><ul>${plan.features.split('\n').filter(line => line.trim()).map(line => `<li>${e(line)}</li>`).join('')}</ul><a class="button" href="${e(plan.url || contact)}">${e(plan.button || 'درخواست همکاری')}</a></article>`).join('')}</div><div class="plan-callout"><strong>برای انتخاب پلن یا درخواست اختصاصی در تماس باش.</strong><a class="button" href="${e(contact)}">گفت‌وگو کنیم ↗</a></div></section>`;
 return { reviewMarkup, plansMarkup };
}

export function projectDetail(project, links, e) {
 return `<article class="section site-detail"><a href="${e(links.works)}">→ بازگشت به نمونه‌کارها</a><header class="site-page-intro"><span class="eyebrow">${e(project.category || 'نمونه‌کار')}</span><h1>${e(project.title)}</h1></header>${project.image ? `<img class="detail-image" src="${project.image}" alt="${e(project.title)}">` : ''}<div class="detail-grid"><section class="site-card"><h2>درباره پروژه</h2><p class="preline">${e(project.description)}</p>${project.activities ? `<h2>فعالیت‌های انجام‌شده</h2><ul>${project.activities.split('\n').filter(line => line.trim()).map(line => `<li>${e(line)}</li>`).join('')}</ul>` : ''}${project.gallery.length ? `<div class="detail-gallery">${project.gallery.map((image,i) => `<img src="${image}" alt="تصویر ${i+1} پروژه" loading="lazy">`).join('')}</div>` : ''}</section><aside class="site-card">${project.client ? `<h2>کارفرما</h2><p>${e(project.client)}</p>` : ''}${project.date ? `<h2>زمان اجرا</h2><p>${e(project.date)}</p>` : ''}${project.url ? `<a class="button" href="${e(project.url)}" target="_blank" rel="noopener noreferrer">بازدید از پروژه ↗</a>` : ''}</aside></div></article>`;
}

export const sitePageCSS = `
.site-page-intro{text-align:center;margin:0 auto 36px;max-width:740px}.site-page-intro h1{font-size:clamp(26px,5vw,52px);line-height:1.35;margin:12px 0;color:var(--heading)}.site-page-intro p{white-space:pre-line}
.works-heading,.plan-top,.plan-callout{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.plan-grid,.review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:20px}
.site-card{margin:0;padding:clamp(18px,3vw,32px);border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:calc(var(--radius,12px) + 10px);background:linear-gradient(155deg,color-mix(in srgb,var(--accent) 8%,var(--panel)),var(--panel));box-shadow:0 16px 45px #0002;overflow-wrap:anywhere}
.site-plans,.site-reviews{background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--accent) 15%,transparent),transparent 68%)}
.plan-card{display:flex;flex-direction:column}.plan-card h2{font-size:1.2rem;margin:0}.plan-card.featured{border-color:var(--accent);box-shadow:0 0 34px color-mix(in srgb,var(--accent) 26%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--accent) 24%,var(--panel)),var(--panel) 70%)}
.plan-top span,.review-rating{color:var(--accent)}.plan-top span{padding:4px 10px;border-radius:99px;background:color-mix(in srgb,var(--accent) 12%,transparent);font-size:.8rem}
.plan-price{font-size:clamp(22px,4vw,35px);font-weight:800;margin:14px 0}.plan-price small{font-size:.82rem;font-weight:400}
.plan-card ul{list-style:none;padding:12px 0;margin:0 0 16px;border-top:1px solid color-mix(in srgb,var(--ink) 15%,transparent)}.plan-card li:before{content:'✓';color:var(--accent);margin-inline-end:9px}.plan-card .button{margin-top:auto;justify-content:center}
.plan-callout{margin-top:32px;padding:22px;border-radius:20px;background:color-mix(in srgb,var(--accent) 15%,var(--panel))}
.site-reviews figure:nth-child(3n+2){border-color:color-mix(in srgb,var(--accent) 55%,transparent)}.review-rating{font-size:1.25rem;letter-spacing:.18em}.site-reviews blockquote{margin:14px 0 22px;white-space:pre-line;line-height:1.9}.site-reviews figcaption small{display:block;margin-top:5px}
.detail-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px}.detail-image,.detail-gallery img{width:100%;max-height:560px;object-fit:contain;border-radius:18px;background:var(--panel)}.detail-image{margin-bottom:24px}.detail-gallery{display:grid;gap:12px;margin-top:20px}.site-detail h2{font-size:1.25rem}.site-subpage .site-header nav{display:flex;flex-wrap:wrap}
@media(max-width:650px){.detail-grid{grid-template-columns:1fr}.site-subpage .site-header{flex-wrap:wrap}.site-subpage .site-header nav{gap:12px}}
`;
