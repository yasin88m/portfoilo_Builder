import {normalize,portfolioHTML} from './shared.js';
import {functionsPHP} from './wordpress-runtime.js';
import {zipFiles} from './zip.js';
const encode=new TextEncoder();
const decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const textKeys=['name','title','field','headline','bio','skills','services','experience','education','location','email','phone','social'];
const token=k=>'PFBTOKEN'+k.toUpperCase()+'END';
const phpText=k=>`<?php echo esc_html(pfb_value('${k}')); ?>`;
export function wordpressFiles(raw){
 const data=normalize(raw),slug='portfolio-'+(data.slug||'my-portfolio'),files=[];
 const add=(path,content)=>files.push({path:slug+'/'+path,content});
 const seed={...data,headline:data.headline||data.title};delete seed.domain;delete seed.slug;
 function asset(src,name){if(!src)return '';const match=src.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!match)throw Error('تصویر خروجی معتبر نیست');const path=`assets/images/${name}.${match[1]==='jpeg'?'jpg':match[1]}`;add(path,decode64(match[2]));return path;}
 seed.avatar=asset(data.avatar,'avatar');seed.cover=asset(data.cover,'cover');seed.projects=data.projects.map((p,i)=>({...p,image:asset(p.image,'project-'+(i+1))}));
 const marker={...data,...Object.fromEntries(textKeys.map(k=>[k,token(k)])),email:'pfbtokenemailend@example.com',social:'https://pfbtokensocialend.example.com/',slug:'pfb-template',domain:'',paletteOverride:data.paletteOverride,avatar:'data:image/png;base64,UEZCQVZBVEFS',cover:'data:image/png;base64,UEZCQ09WRVI=',projects:[{title:'PFBPROJECT',description:'PFBPROJECT',category:'PFBPROJECT',image:'',url:''}]};
 const html=portfolioHTML(marker);
 let css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 let fontIndex=0;css=css.replace(/url\(data:font\/(woff2?);base64,([A-Za-z0-9+/=]+)\)/g,(_,ext,b64)=>{const path=`assets/fonts/vazirmatn-${++fontIndex}.${ext}`;add(path,decode64(b64));return `url('${path}')`;});
 const inline=html.match(/<body[^>]*style="([^"]+)"/)[1];
 seed.accent=inline.match(/--accent:([^;]+)/)[1];
 const bodyStyle=inline.replace(/--accent:[^;]+/,"--accent:<?php echo esc_attr(pfb_value('accent')); ?>");
 css+='\n/* WordPress navigation, admin bar and block content. */\n.site-header nav ul{list-style:none;padding:0;margin:0;display:flex;gap:22px;flex-wrap:wrap}.site-header nav li{position:relative}.site-header nav .sub-menu{display:none;position:absolute;top:100%;right:0;min-width:160px;background:var(--bg);padding:12px;z-index:10;box-shadow:0 4px 20px #0002}.site-header nav li:hover>.sub-menu,.site-header nav li:focus-within>.sub-menu{display:block}.wp-content{width:min(1080px,90%);margin:35px auto;min-height:50vh}.wp-content img{max-width:100%;height:auto}.wp-content .alignwide{max-width:1200px}.wp-content .alignfull{max-width:100%}.wp-content .wp-block-cover img{height:100%}.wp-content .wp-block-button__link{background:var(--accent);color:white}.wp-content pre{overflow:auto}.wp-content table{max-width:100%;overflow:auto}.wp-content a{text-decoration:underline}.wp-content .post-card{border-bottom:1px solid #8883;padding:24px 0}.wp-content .wp-post-image{max-height:420px;object-fit:contain}.nature-hero{background:linear-gradient(120deg,#76905d,#294d35)}.learnhouse .site-header{max-width:none}.custom-logo-link img{max-height:60px;width:auto}.pfb-meta{font-size:13px;opacity:.7}\n';
 add('style.css',`/*\nTheme Name: Portfolio Builder - ${data.template}\nAuthor: Portfolio Builder\nDescription: Persian RTL portfolio with native WordPress content and Customizer.\nVersion: 1.0.0\nRequires at least: 6.0\nRequires PHP: 7.4\nLicense: GNU General Public License v2 or later\nLicense URI: https://www.gnu.org/licenses/gpl-2.0.html\nText Domain: portfolio-builder\nTags: portfolio, custom-logo, custom-menu, featured-images, rtl-language-support\n*/\n${css}`);
 add('rtl.css','/* The shared stylesheet supports both directions; Persian portfolio sections use RTL. */\n.pfb-portfolio{direction:rtl}\n');
 add('editor-style.css',"@import url('style.css');\n.editor-styles-wrapper{font-family:Vazirmatn,sans-serif;background:#fff;color:#222;line-height:1.9}.editor-styles-wrapper>*{max-width:1080px}\n");
 add('theme.json',JSON.stringify({version:2,settings:{layout:{contentSize:'1080px',wideSize:'1200px'},color:{palette:[{name:'رنگ اصلی',slug:'accent',color:seed.accent}]},typography:{fontFamilies:[{name:'وزیرمتن',slug:'vazirmatn',fontFamily:'Vazirmatn, sans-serif'}]}},styles:{typography:{fontFamily:'var(--wp--preset--font-family--vazirmatn)'}}},null,2));
 add('portfolio-data.json',JSON.stringify(seed,null,2));add('functions.php',functionsPHP);
 add('header.php',`<?php if (!defined('ABSPATH')) { exit; } ?><!doctype html>\n<html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="<?php echo esc_attr(wp_strip_all_tags(pfb_value('bio'))); ?>"><?php wp_head(); ?></head><body <?php body_class('${data.template}'); ?> style="${bodyStyle}"><?php wp_body_open(); ?><div id="top"></div><header class="site-header"><div class="logo"><?php if (has_custom_logo()) { the_custom_logo(); } else { ?><a href="<?php echo esc_url(home_url('/')); ?>">✦ <?php echo esc_html(pfb_value('name')); ?></a><?php } ?></div><nav aria-label="فهرست اصلی"><?php wp_nav_menu(array('theme_location'=>'primary','container'=>false,'fallback_cb'=>'pfb_nav_fallback','depth'=>2)); ?></nav><a class="button nav-cta" href="<?php echo esc_url(home_url('/#contact')); ?>">همکاری کنیم ↗</a></header>\n`);
 add('footer.php',`<?php if (!defined('ABSPATH')) { exit; } ?><footer><span><?php echo esc_html(pfb_value('name')); ?> · <?php echo esc_html(pfb_value('title')); ?></span><span>ساخته‌شده با پورتفولیو ساز ✦</span></footer><?php wp_footer(); ?></body></html>\n`);
 let main=html.match(/<main>([\s\S]*)<\/main>/)[1];
 // Structural lists are rendered from WordPress data, not an embedded HTML snapshot.
 main=main.replace(/(<div class="project-grid">)[\s\S]*?(<\/div><\/section>)/g,'$1<?php pfb_project_cards(); ?>$2');
 main=main.replace(/(<div class="services-grid">)[\s\S]*?(<\/div><\/section>)/g,'$1<?php pfb_service_cards(); ?>$2');
 main=main.replace(/(<div class="skill-grid">)[\s\S]*?(<\/div><\/section>)/g,'$1<?php pfb_skill_cards(); ?>$2');
 main=main.replace(/<div class="skill-strip">[\s\S]*?<\/div>/g,'<div class="skill-strip"><?php pfb_skill_strip(); ?></div>');
 main=main.replace(/<b>۱<\/b><span>پروژه در پورتفولیو<\/span>/g,"<b><?php echo esc_html(number_format_i18n(count(pfb_projects()))); ?></b><span>پروژه در پورتفولیو</span>");
 main=main.replace(/<b>۱<\/b><span>مهارت تخصصی<\/span>/g,"<b><?php echo esc_html(number_format_i18n(count(pfb_lines('skills')))); ?></b><span>مهارت تخصصی</span>");
 main=main.replace(/<b>۱<\/b> مهارت تخصصی/g,"<b><?php echo esc_html(number_format_i18n(count(pfb_lines('skills')))); ?></b> مهارت تخصصی").replace(/<b>۱<\/b> پروژه منتخب/g,"<b><?php echo esc_html(number_format_i18n(count(pfb_projects()))); ?></b> پروژه منتخب");
 main=main.replace(/<a href="https:\/\/pfbtokensocialend\.example\.com\/"[\s\S]*?<\/a>/g,tag=>`<?php if (pfb_value('social')) : ?>${tag}<?php endif; ?>`);
 // Image attributes are URL escaped; text markers are escaped for text or attributes.
 for(const [key,src] of [['avatar',marker.avatar],['cover',marker.cover]]){
  main=main.replace(new RegExp(`<img[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>`,'g'),tag=>`<?php if (pfb_image('${key}')) : ?>${tag.replace(src,`<?php echo esc_url(pfb_image('${key}')); ?>`)}<?php endif; ?>`);
 }
 main=main.replace(/<a href="mailto:pfbtokenemailend@example.com"[\s\S]*?<\/a>/g,tag=>`<?php if (pfb_value('email')) : ?>${tag}<?php endif; ?>`);
 main=main.replace(/href="mailto:pfbtokenemailend@example.com"/g,`href="<?php echo esc_url('mailto:' . sanitize_email(pfb_value('email'))); ?>"`).replaceAll('pfbtokenemailend@example.com',phpText('email'));
 main=main.replaceAll(marker.social,`<?php echo esc_url(pfb_value('social')); ?>`);
 if(['codecraft','learnhouse'].includes(data.template))main=main.replaceAll(token('experience'),"<?php echo esc_html(pfb_value('experience') ?: pfb_value('bio')); ?>");
 for(const key of textKeys.filter(k=>!['email','social'].includes(k)))main=main.replaceAll(token(key),phpText(key));
 add('front-page.php',`<?php if (!defined('ABSPATH')) { exit; } get_header(); ?><main class="pfb-portfolio" dir="rtl">${main}</main><?php get_footer(); ?>\n`);
 const entry=`<article <?php post_class('post-card'); ?>><h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><?php if (has_post_thumbnail()) { the_post_thumbnail('large'); } ?><div class="pfb-meta"><?php echo esc_html(get_the_date()); ?></div><?php the_excerpt(); ?></article>`;
 add('index.php',`<?php if (!defined('ABSPATH')) { exit; } get_header(); ?><main class="wp-content"><h1><?php if (is_search()) { printf(esc_html__('Search: %s','portfolio-builder'), esc_html(get_search_query())); } elseif (is_archive()) { the_archive_title(); } else { esc_html_e('نوشته‌ها','portfolio-builder'); } ?></h1><?php if (have_posts()) : while (have_posts()) : the_post(); ?>${entry}<?php endwhile; the_posts_pagination(); else : ?><p>موردی پیدا نشد.</p><?php get_search_form(); endif; ?></main><?php get_footer(); ?>\n`);
 add('singular.php',`<?php if (!defined('ABSPATH')) { exit; } get_header(); ?><main class="wp-content"><?php while (have_posts()) : the_post(); ?><article <?php post_class(); ?>><h1><?php the_title(); ?></h1><?php if (has_post_thumbnail()) { the_post_thumbnail('large'); } ?><div class="entry-content"><?php the_content(); wp_link_pages(); ?></div><?php $original=get_post_meta(get_the_ID(),'portfolio_original_url',true); if ($original) : ?><p><a class="button" href="<?php echo esc_url($original); ?>" rel="noopener noreferrer" target="_blank">مشاهده وب‌سایت پروژه</a></p><?php endif; ?></article><?php if (comments_open() || get_comments_number()) { comments_template(); } endwhile; ?></main><?php get_footer(); ?>\n`);
 add('comments.php',`<?php if (!defined('ABSPATH') || post_password_required()) { return; } ?><section id="comments"><?php if (have_comments()) : ?><h2>دیدگاه‌ها</h2><ol><?php wp_list_comments(array('style'=>'ol','short_ping'=>true)); ?></ol><?php the_comments_pagination(); endif; comment_form(); ?></section>\n`);
 add('404.php',`<?php if (!defined('ABSPATH')) { exit; } get_header(); ?><main class="wp-content"><h1>صفحه پیدا نشد</h1><p><a href="<?php echo esc_url(home_url('/')); ?>">بازگشت به صفحه اصلی</a></p><?php get_search_form(); ?></main><?php get_footer(); ?>\n`);
 add('readme.txt',`=== Portfolio Builder ===\nRequires at least: 6.0\nRequires PHP: 7.4\nLicense: GPLv2 or later\n\nنصب: نمایش ← پوسته‌ها ← افزودن ← بارگذاری پوسته؛ همین ZIP را انتخاب و فعال کنید.\nمشخصات و تصاویر: نمایش ← سفارشی‌سازی ← اطلاعات پورتفولیو.\nنمونه‌کارها: نمایش ← راهنمای پورتفولیو. پروژه‌های ویزارد بدون نیاز به ورود داده نمایش داده می‌شوند. برای ویرایش پویا می‌توانید آن‌ها را به نوشته‌های پیش‌نویس و رسانه‌ها وارد کنید؛ سپس دسته پروژه را در سفارشی‌سازی انتخاب کنید.\nاین قالب کلاسیک است. برگه‌ها و نوشته‌ها با ویرایشگر بلوکی وردپرس ویرایش می‌شوند؛ چیدمان هیرو در Site Editor یا Elementor قابل ویرایش بصری نیست.\nکد قالب GPLv2 or later. فونت وزیرمتن SIL OFL 1.1؛ مجوز در assets/fonts/LICENSE.txt. تصاویر و اطلاعات عمومی ویزارد داخل این فایل هستند؛ تنها محتوای مناسب انتشار را وارد کنید.\n`);
 add('assets/fonts/LICENSE.txt',css.match(/\/\* Copyright[\s\S]*?\*\//)?.[0]||'Vazirmatn — SIL Open Font License 1.1. https://openfontlicense.org/');
 return {slug,files};
}
export function wordpressZIP(data){return zipFiles(wordpressFiles(data).files);}
