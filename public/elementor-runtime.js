export const elementorPHP=String.raw`<?php
if (!defined('ABSPATH')) { exit; }
function pfb_e_available() { return did_action('elementor/loaded') && class_exists('Elementor\\Plugin') && defined('ELEMENTOR_VERSION') && version_compare(ELEMENTOR_VERSION,'3.6','>='); }
function pfb_e_key() { return 'pfb_elementor_' . get_stylesheet(); }
function pfb_e_state() { $value=get_option(pfb_e_key(),array()); return is_array($value)?$value:array(); }
function pfb_e_media($path, $import=true) {
 if (!preg_match('~^assets/images/[a-z0-9-]+\.(png|jpg|webp)$~',$path)) { return array('id'=>0,'url'=>''); }
 $source=get_template_directory().'/'.$path;
 $state=pfb_e_state(); $id=isset($state['media'][$path])?absint($state['media'][$path]):0;
 if ($id && get_post_type($id)==='attachment' && get_attached_file($id) && file_exists(get_attached_file($id))) { return array('id'=>$id,'url'=>wp_get_attachment_url($id)); }
 if (!$import) { return array('id'=>0,'url'=>get_theme_file_uri('/'.$path)); }
 if (!is_readable($source)) { throw new RuntimeException('فایل تصویر در بسته پیدا نشد: '.$path); }
 require_once ABSPATH.'wp-admin/includes/image.php';require_once ABSPATH.'wp-admin/includes/file.php';require_once ABSPATH.'wp-admin/includes/media.php';
 $temp=wp_tempnam(basename($path));
 if (!$temp || !copy($source,$temp)) { if($temp){@unlink($temp);}throw new RuntimeException('آماده‌سازی تصویر انجام نشد'); }
 $id=media_handle_sideload(array('name'=>basename($path),'tmp_name'=>$temp),0);
 if (is_wp_error($id)) { @unlink($temp);throw new RuntimeException($id->get_error_message()); }
 $state=pfb_e_state();$state['media'][$path]=$id;update_option(pfb_e_key(),$state,false);
 return array('id'=>$id,'url'=>wp_get_attachment_url($id));
}
function pfb_e_resolve($data,$import=true) {
 if (!is_array($data)) { return $data; }
 if (isset($data['url']) && is_string($data['url'])) {
  if (strpos($data['url'],'assets/images/')===0) { $image=pfb_e_media($data['url'],$import);$data['url']=$image['url'];$data['id']=$image['id']; }
  elseif (strpos($data['url'],'#')===0) { $data['url']=home_url('/'.$data['url']); }
 }
 foreach ($data as $key=>$value) { if (is_array($value)) { $data[$key]=pfb_e_resolve($value,$import); } }
 return $data;
}
function pfb_e_blueprint($role,$import=true) {
 if (!in_array($role,array('page','header','footer'),true)) { throw new RuntimeException('نوع سند نامعتبر است'); }
 $path=get_template_directory().'/elementor/'.$role.'.json';
 $doc=json_decode(file_get_contents($path),true);
 if (!is_array($doc) || !isset($doc['content']) || !is_array($doc['content'])) { throw new RuntimeException('ساختار فایل المنتور معتبر نیست'); }
 return pfb_e_resolve($doc,$import);
}
function pfb_e_document($role) {
 $state=pfb_e_state();$id=isset($state[$role])?absint($state[$role]):0;
 if ($id && get_post($id) && get_post_status($id)!=='trash') {
  $existing=json_decode(get_post_meta($id,'_elementor_data',true),true);
  if (get_post_meta($id,'_pfb_initialized',true) || !empty($existing)) { return $id; }
 }
 $blueprint=pfb_e_blueprint($role,true);
 $manager=\Elementor\Plugin::$instance->documents;
 if (!$id || !get_post($id) || get_post_status($id)==='trash') {
  $document=$manager->create($role==='page'?'wp-page':'section',wp_slash(array('post_title'=>$blueprint['title'],'post_status'=>'draft','post_type'=>$role==='page'?'page':'elementor_library')));
  if (is_wp_error($document) || !$document) { throw new RuntimeException('ساخت سند المنتور انجام نشد'); }
  $id=$document->get_main_id();$state=pfb_e_state();$state[$role]=$id;update_option(pfb_e_key(),$state,false);
 } else { $document=$manager->get($id); }
 if (!$document || !$document->save(array('elements'=>$blueprint['content'],'settings'=>$blueprint['page_settings']))) { throw new RuntimeException('ذخیره سند المنتور انجام نشد'); }
 update_post_meta($id,'_pfb_initialized',1);
 if ($role==='page') {
  $fallback=file_get_contents(get_template_directory().'/elementor/fallback.html');
  $seed=pfb_seed();$paths=array($seed['avatar'],$seed['cover']);foreach($seed['projects'] as $project){$paths[]=$project['image'];}
  foreach(array_filter($paths) as $path){$asset=pfb_e_media($path,true);$fallback=str_replace('src="'.$path.'"','src="'.esc_url($asset['url']).'"',$fallback);}
  wp_update_post(wp_slash(array('ID'=>$id,'post_content'=>$fallback)));
 }
 return $id;
}
function pfb_e_render_location($role) {
 if (!pfb_e_available()) { return false; }
 $state=pfb_e_state();$id=isset($state[$role])?absint($state[$role]):0;
 if (!$id || !get_post($id) || get_post_status($id)!=='publish') { return false; }
 // Draft template documents are used only when this theme explicitly assigned them.
 $content=\Elementor\Plugin::$instance->frontend->get_builder_content_for_display($id,true);
 if (!$content) { return false; }
 echo $content;return true;
}
function pfb_e_setup_handler() {
 if (!current_user_can('manage_options') || !current_user_can('edit_pages') || !current_user_can('edit_posts') || !current_user_can('upload_files')) { wp_die('دسترسی کافی نیست'); }
 check_admin_referer('pfb_elementor_setup');
 if ((!empty($_POST['set_home']) && !current_user_can('publish_pages')) || (!empty($_POST['visual_chrome']) && !current_user_can('publish_posts'))) { wp_die('اجازه انتشار محتوا را ندارید'); }
 if (!pfb_e_available()) { wp_die('ابتدا المنتور رایگان را نصب و فعال کنید'); }
 try {
  $page=pfb_e_document('page');pfb_e_document('header');pfb_e_document('footer');
  if (!empty($_POST['visual_chrome'])) { foreach(array('header','footer') as $role){$st=pfb_e_state();wp_update_post(array('ID'=>absint($st[$role]),'post_status'=>'publish'));}set_theme_mod('pfb_visual_chrome',true); }
  if (!empty($_POST['set_home'])) { wp_update_post(array('ID'=>$page,'post_status'=>'publish'));update_option('show_on_front','page');update_option('page_on_front',$page); }
  $state=pfb_e_state();unset($state['error']);$state['ready']=true;update_option(pfb_e_key(),$state,false);
 } catch (Throwable $error) { $state=pfb_e_state();$state['error']=$error->getMessage();update_option(pfb_e_key(),$state,false); }
 wp_safe_redirect(admin_url('themes.php?page=pfb-help'));exit;
}
add_action('admin_post_pfb_elementor_setup','pfb_e_setup_handler');
function pfb_e_download() {
 if (!current_user_can('edit_theme_options')) { wp_die('دسترسی کافی نیست'); }
 check_admin_referer('pfb_elementor_download');$role=isset($_GET['role'])?sanitize_key($_GET['role']):'page';
 if (!in_array($role,array('page','header','footer'),true)) { wp_die('نوع فایل نامعتبر است'); }
 $doc=pfb_e_blueprint($role,false);$state=pfb_e_state();$id=isset($state[$role])?absint($state[$role]):0;
 if ($id && current_user_can('edit_post',$id)) { $content=json_decode(get_post_meta($id,'_elementor_data',true),true);if(is_array($content)&&$content){$doc['content']=$content;$doc['title']=get_the_title($id);$doc['page_settings']=get_post_meta($id,'_elementor_page_settings',true)?:array();} }
 nocache_headers();header('Content-Type: application/json; charset=utf-8');header('Content-Disposition: attachment; filename="portfolio-'.$role.'-elementor.json"');echo wp_json_encode($doc,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
}
add_action('admin_post_pfb_elementor_download','pfb_e_download');
function pfb_e_options() {
 if (!current_user_can('edit_theme_options')) { wp_die('دسترسی کافی نیست'); }check_admin_referer('pfb_e_options');
 if (!empty($_POST['visual_chrome']) && current_user_can('publish_posts')) { $st=pfb_e_state();foreach(array('header','footer') as $role){if(!empty($st[$role]) && current_user_can('edit_post',$st[$role])){wp_update_post(array('ID'=>absint($st[$role]),'post_status'=>'publish'));}}set_theme_mod('pfb_visual_chrome',true); } else {set_theme_mod('pfb_visual_chrome',false);}
 set_theme_mod('pfb_sticky_header',!empty($_POST['sticky_header']));set_theme_mod('pfb_back_top',!empty($_POST['back_top']));
 wp_safe_redirect(admin_url('themes.php?page=pfb-help'));exit;
}
add_action('admin_post_pfb_e_options','pfb_e_options');
function pfb_e_controls() {
 $css='.pfb-elementor-root{direction:rtl;text-align:right;font-family:Vazirmatn,sans-serif}.pfb-visual-header,.pfb-visual-footer{width:100%;max-width:none;margin:0;padding:0;border:0;display:block}.pfb-elementor-content{width:100%;margin:0;direction:rtl}.pfb-elementor-content .elementor-widget-text-editor p{margin-bottom:0}.pfb-skip{position:absolute;inset-inline-start:15px;top:-100px;z-index:999999;background:#fff;color:#222;padding:10px}.pfb-skip:focus{top:10px}.pfb-floating-top{position:fixed;bottom:22px;inset-inline-end:22px;z-index:90;padding:10px 16px;border-radius:14px;background:var(--accent);color:#fff;font-weight:bold;box-shadow:0 4px 18px #0003}';
 if(get_theme_mod('pfb_sticky_header',false)){$css.='.pfb-visual-header,.site-header{position:sticky;top:0;z-index:99}.admin-bar .pfb-visual-header,.admin-bar .site-header{top:32px}@media(max-width:782px){.admin-bar .pfb-visual-header,.admin-bar .site-header{top:46px}}';}
 wp_add_inline_style('portfolio-builder',$css);
}
add_action('wp_enqueue_scripts','pfb_e_controls',20);
add_action('wp_footer',function(){if(get_theme_mod('pfb_back_top',false)){echo '<a href="#top" class="pfb-floating-top" aria-label="بازگشت به بالا">↑</a>';}});
add_filter('elementor/fonts/additional_fonts',function($fonts){$fonts['Vazirmatn']='system';return $fonts;});
add_action('elementor/theme/register_locations',function($manager){$manager->register_all_core_location();});
function pfb_e_dashboard() {
 if (!current_user_can('edit_theme_options')) { return; }$state=pfb_e_state(); ?>
 <div class="wrap" dir="rtl"><h1>استودیوی پورتفولیو — راه‌اندازی و مدیریت قالب</h1>
 <p>صفحه اصلی، سربرگ، فوتر و کارت‌های نمونه‌کار با ویجت‌های مستقل المنتور آماده‌اند. تصاویر به رسانه وردپرس منتقل می‌شوند. رنگ، اندازه، ترتیب، فاصله و محتوای هر المان از ویرایشگر قابل تغییر است.</p>
 <style>.pfb-dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;max-width:1180px}.pfb-card{background:white;border:1px solid #dcdcde;border-radius:12px;padding:22px}.pfb-card p{line-height:1.9}.pfb-card .button{margin:4px}.pfb-status{padding:7px 12px;border-radius:6px;background:#f0edf9}.pfb-card label{display:block;margin:14px 0}</style>
 <?php if (!empty($state['error'])) : ?><div class="notice notice-error"><p><?php echo esc_html($state['error']); ?></p></div><?php endif; ?>
 <div class="pfb-dashboard"><section class="pfb-card"><h2>۱. آماده‌سازی المنتور</h2><p class="pfb-status"><?php echo pfb_e_available()?'المنتور فعال است — '.esc_html(ELEMENTOR_VERSION):'المنتور هنوز آماده نیست'; ?></p>
 <p>نسخه رایگان المنتور برای صفحه اصلی، سربرگ و فوتر این بسته کافی است. نصب و فعال‌سازی افزونه را از ابزار رسمی وردپرس انجام دهید.</p>
 <?php if (!pfb_e_available() && current_user_can('install_plugins')) : ?><a class="button" href="<?php echo esc_url(self_admin_url('plugin-install.php?s=elementor&tab=search&type=term')); ?>">نصب المنتور از مخزن وردپرس</a><a class="button" href="<?php echo esc_url(admin_url('plugins.php')); ?>">مدیریت و فعال‌سازی افزونه‌ها</a><?php endif; ?>
 </section><section class="pfb-card"><h2>۲. ساخت محتوای آماده</h2><p>صفحه اصلی، سربرگ و فوتر اولیه ساخته می‌شوند. بدون انتخاب گزینه زیر، صفحه اصلی فعلی شما عوض نمی‌شود و برگه جدید پیش‌نویس می‌ماند. اجرای دوباره، ویرایش‌های قبلی شما را بازنویسی نمی‌کند.</p>
 <?php if (current_user_can('manage_options') && current_user_can('edit_pages') && current_user_can('upload_files')) : ?><form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><?php wp_nonce_field('pfb_elementor_setup'); ?><input type="hidden" name="action" value="pfb_elementor_setup"><label><input type="checkbox" name="set_home" value="1"> برگه ساخته‌شده منتشر و به صفحه اصلی سایت تبدیل شود</label><label><input type="checkbox" name="visual_chrome" value="1"> سربرگ و فوتر المنتوری منتشر و در سایت فعال شوند</label><button class="button button-primary" <?php disabled(!pfb_e_available()); ?>><?php echo !empty($state['ready'])?'بررسی و تکمیل راه‌اندازی':'ساخت صفحات قابل ویرایش'; ?></button></form><?php endif; ?>
 </section><section class="pfb-card"><h2>۳. ویرایش و دریافت الگوها</h2>
 <?php foreach(array('page'=>'صفحه اصلی','header'=>'سربرگ','footer'=>'پاورقی') as $role=>$label) : $id=isset($state[$role])?absint($state[$role]):0; ?>
 <p><strong><?php echo esc_html($label); ?></strong><br>
 <?php if($id && get_post($id) && current_user_can('edit_post',$id)) : ?><a class="button button-primary" href="<?php echo esc_url(admin_url('post.php?post='.$id.'&action=elementor')); ?>">ویرایش با المنتور</a><a class="button" href="<?php echo esc_url(get_edit_post_link($id)); ?>">تنظیمات سند</a><?php endif; ?>
 <a class="button" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=pfb_elementor_download&role='.$role),'pfb_elementor_download')); ?>">دریافت JSON المنتور</a></p>
 <?php endforeach; ?>
 </section><section class="pfb-card"><h2>گزینه‌های نمایش</h2><form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><?php wp_nonce_field('pfb_e_options'); ?><input type="hidden" name="action" value="pfb_e_options"><label><input type="checkbox" name="visual_chrome" value="1" <?php checked(get_theme_mod('pfb_visual_chrome',false)); ?>> استفاده از سربرگ و فوتر المنتوری (انتشار این دو الگو)</label><label><input type="checkbox" name="sticky_header" value="1" <?php checked(get_theme_mod('pfb_sticky_header',false)); ?>> سربرگ هنگام اسکرول ثابت بماند</label><label><input type="checkbox" name="back_top" value="1" <?php checked(get_theme_mod('pfb_back_top',false)); ?>> نمایش دکمه شناور بازگشت به بالا</label><?php submit_button('ذخیره گزینه‌ها'); ?></form><p><a class="button" href="<?php echo esc_url(admin_url('customize.php')); ?>">لوگو، فهرست و تنظیمات حالت کلاسیک</a></p></section>
 <section class="pfb-card"><h2>نمونه‌کارها و نوشته‌های وردپرس</h2><p>کارت‌های صفحه المنتوری را مستقیماً در المنتور ویرایش، حذف یا تکثیر کنید. برای داشتن صفحه مستقل هر پروژه و آرشیو، پروژه‌های ویزارد را به پیش‌نویس نوشته‌ها منتقل کنید. کارت‌های المنتور و نوشته‌ها مستقل‌اند؛ پیوند کارت را می‌توانید به صفحه نوشته متصل کنید.</p>
 <?php if(current_user_can('manage_options') && current_user_can('edit_posts') && current_user_can('upload_files')) : ?><form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><?php wp_nonce_field('pfb_import'); ?><input type="hidden" name="action" value="pfb_import"><?php submit_button('ورود پروژه‌ها به پیش‌نویس نوشته‌ها','secondary'); ?></form><?php endif; ?>
 </section><section class="pfb-card"><h2>راهنمای ویرایش</h2><p>پس از راه‌اندازی، محتوای صفحه، سربرگ و فوتر را از المنتور تغییر دهید. تنظیمات مشخصات در سفارشی‌سازی، محتوای حالت کلاسیک را تغییر می‌دهند و صفحه المنتوری ویرایش‌شده را بازنویسی نمی‌کنند.</p><p>پشتیبانی از محل‌های Theme Builder المنتور پرو نیز در قالب وجود دارد؛ اگر برای سربرگ یا فوتر شرط نمایش پرو تعیین کنید، همان طرح پرو اولویت دارد. افزونه پرو همراه این بسته نیست.</p><p>خروجی وب‌سایت HTML مستقل نیز از ویزارد همچنان قابل دریافت است.</p></section></div></div>
 <?php
}
`;
