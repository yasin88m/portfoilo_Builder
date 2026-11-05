export const functionsPHP=String.raw`<?php
if (!defined('ABSPATH')) { exit; }
function pfb_seed() {
 static $data;
 if ($data === null) { $data = json_decode(file_get_contents(get_template_directory() . '/portfolio-data.json'), true); }
 return is_array($data) ? $data : array();
}
function pfb_value($key) { $seed = pfb_seed(); return get_theme_mod('pfb_' . $key, isset($seed[$key]) ? $seed[$key] : ''); }
function pfb_image($key) {
 $value = pfb_value($key);
 if (!$value) { return ''; }
 return strpos($value, 'assets/') === 0 ? get_theme_file_uri('/' . $value) : esc_url_raw($value);
}
function pfb_label($key) { $seed=pfb_seed(); if ($key === 'heroTitle' && !isset($seed['design']['text']['heroTitle']) && get_theme_mod('pfb_label_heroTitle',null) === null) { return 'سلام، من'."\n".pfb_value('name').' هستم.'; } return get_theme_mod('pfb_label_'.$key, $seed['labels'][$key] ?? ''); }
function pfb_color($key) { $seed=pfb_seed(); return sanitize_hex_color(get_theme_mod('pfb_color_'.$key, $seed['colors'][$key] ?? '#7552ed')) ?: '#7552ed'; }
function pfb_target($key) { $seed=pfb_seed(); $hidden=$seed['design']['sections'] ?? array(); if (($hidden[$key] ?? true) !== false) { return '#'.$key; } foreach (array_merge($seed['design']['order'] ?? array(),array('about','skills','projects','services','contact')) as $section) { if (($hidden[$section] ?? true) !== false) { return '#'.$section; } } return '#top'; }
function pfb_skill_entries() {
 $seed=pfb_seed(); $map=array(); foreach (($seed['skillLevels'] ?? array()) as $skill) { $map[$skill['name']]=$skill['percent']; }
 $entries=array(); foreach (array_filter(array_map('trim',preg_split('/[,،\r\n]+/u',pfb_value('skills')))) as $raw) {
  $name=$raw; $percent=$map[$name] ?? 0;
  if (preg_match('/^(.*?)(?:\s*[:：|]\s*([0-9۰-۹٠-٩]{1,3})\s*[%٪]?|\s+([0-9۰-۹٠-٩]{1,3})\s*[%٪])$/u',$raw,$match)) {
   $name=trim($match[1]); $number=$match[2] ?: ($match[3] ?? '0');
   $percent=(int)strtr($number,array('۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'));
  }
  if (pfb_value('skills') === ($seed['skills'] ?? '') && isset($map[$name])) { $percent=$map[$name]; }
  if ($name !== '') { $entries[]=array('name'=>$name,'percent'=>max(0,min(100,(int)$percent))); }
 } return array_slice($entries,0,40);
}
function pfb_lines($key) { if ($key === 'skills') { return array_column(pfb_skill_entries(),'name'); } return array_values(array_filter(array_map('trim', preg_split('/[,،\r\n]+/u', pfb_value($key))))); }
function pfb_projects() {
 $category = absint(get_theme_mod('pfb_project_category', 0));
 if ($category) {
  $posts = get_posts(array('post_type'=>'post', 'post_status'=>'publish', 'numberposts'=>12, 'category'=>$category, 'orderby'=>'date', 'order'=>'DESC'));
  return array_map(function($post) {
   return array('title'=>get_the_title($post), 'description'=>$post->post_excerpt ? $post->post_excerpt : wp_trim_words(wp_strip_all_tags($post->post_content), 45), 'category'=>get_theme_mod('pfb_project_label', 'نمونه‌کار'), 'url'=>get_permalink($post), 'image'=>get_the_post_thumbnail_url($post, 'large') ?: '');
  }, $posts);
 }
 $seed = pfb_seed(); $projects = isset($seed['projects']) ? $seed['projects'] : array();
 foreach ($projects as &$project) { if (!empty($project['image'])) { $project['image'] = get_theme_file_uri('/' . $project['image']); } }
 return $projects;
}
function pfb_site_url($role) { return add_query_arg('pfb_page',$role,home_url('/')); }
function pfb_site_reviews() { echo file_get_contents(get_template_directory().'/site-pages/reviews.html'); }
add_action('template_redirect',function(){
 if (!isset($_GET['pfb_page']) || !is_string($_GET['pfb_page'])) { return; }
 $role=wp_unslash($_GET['pfb_page']);
 if (!preg_match('/^(works|plans|project-[a-z0-9-]{1,48})$/D',$role)) { return; }
 $file=get_template_directory().'/site-pages/'.$role.'.html';
 if (!is_readable($file)) { global $wp_query; $wp_query->set_404(); status_header(404); return; }
 $state=pfb_e_state(); $page=absint($state[$role]??0);
 if (pfb_e_available() && $page && get_post_status($page)==='publish') { wp_safe_redirect(get_permalink($page)); exit; }
 $markup=file_get_contents($file);
 $markup=preg_replace_callback('~src="(assets/images/[a-z0-9.-]+)"~',function($m){return 'src="'.esc_url(get_theme_file_uri('/'.$m[1])).'"';},$markup);
 $markup=str_replace('href="/#','href="'.esc_url(home_url('/')).'#',$markup);
 status_header(200); get_header(); echo '<main id="content">'.$markup.'</main>'; get_footer(); exit;
});
function pfb_project_cards() {
 $projects = pfb_projects();
 if (!$projects) { echo '<p class="empty">هنوز نمونه‌کاری اضافه نشده است.</p>'; return; }
 foreach ($projects as $i => $project) { ?>
 <article class="project"><div class="project-visual">
 <?php if (!empty($project['image'])) : ?><img src="<?php echo esc_url($project['image']); ?>" alt="<?php echo esc_attr($project['title']); ?>" loading="lazy"><?php else : ?>
 <div class="project-art art-<?php echo absint($i % 3); ?>"><span><?php echo esc_html($i + 1); ?></span><b><?php echo esc_html($project['title']); ?></b><i>✧</i></div><?php endif; ?>
 <span class="category"><?php echo esc_html($project['category']); ?></span></div>
 <div class="project-info"><h3><?php echo esc_html($project['title']); ?></h3><p><?php echo esc_html($project['description']); ?></p>
 <?php if (!empty($project['id'])) : ?><a href="<?php echo esc_url(pfb_site_url('project-'.$project['id'])); ?>">جزئیات پروژه ↗</a><?php elseif (!empty($project['url'])) : ?><a href="<?php echo esc_url($project['url']); ?>">مشاهده پروژه ↗</a><?php endif; ?></div></article>
 <?php }
}
function pfb_skill_strip() { foreach (pfb_lines('skills') as $skill) { echo '<span><i aria-hidden="true">✧</i>' . esc_html($skill) . '</span>'; } }
function pfb_skill_cards() {
 foreach (pfb_skill_entries() as $skill) {
  echo '<div class="skill-item"><span class="skill-symbol" aria-hidden="true">✧</span><div><div class="skill-label"><b>'.esc_html($skill['name']).'</b>';
  if (pfb_value('skillsMode') === 'percent') { echo '<span>'.esc_html(number_format_i18n($skill['percent'])).'٪</span>'; }
  echo '</div>';
  if (pfb_value('skillsMode') === 'percent') { echo '<div class="skill-track" role="progressbar" aria-label="'.esc_attr($skill['name']).'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'.(int)$skill['percent'].'"><span style="width:'.(int)$skill['percent'].'%"></span></div>'; }
  echo '</div></div>';
 }
}
function pfb_service_cards() {
 $items = array_values(array_filter(array_map('trim', preg_split('/[\r\n]+/u', pfb_value('services')))));
 if (!$items) { $items = pfb_lines('skills'); }
 foreach ($items as $service) { echo '<article><span class="service-icon" aria-hidden="true">✦</span><h3>' . esc_html($service) . '</h3><a href="' . esc_attr(pfb_target('contact')) . '">' . esc_html(pfb_label('serviceButton')) . ' ↗</a></article>'; }
}
function pfb_setup() {
 load_theme_textdomain('portfolio-builder', get_template_directory() . '/languages');
 add_theme_support('title-tag'); add_theme_support('post-thumbnails'); add_theme_support('custom-logo');
 add_theme_support('html5', array('search-form','comment-form','comment-list','gallery','caption','style','script'));
 add_theme_support('responsive-embeds'); add_theme_support('align-wide'); add_theme_support('wp-block-styles');
 add_theme_support('editor-styles'); add_editor_style('editor-style.css');
 register_nav_menus(array('primary'=>'فهرست اصلی پورتفولیو'));
}
add_action('after_setup_theme', 'pfb_setup');
function pfb_document_title($parts) { if (is_front_page()) { $parts['title']=pfb_value('name'); $parts['tagline']=pfb_value('title'); } return $parts; }
add_filter('document_title_parts','pfb_document_title');
function pfb_body_design($classes) { $seed=pfb_seed(); foreach (array_keys($seed['colors'] ?? array()) as $key) { if (get_theme_mod('pfb_color_'.$key,null) !== null) { $classes[]='custom-'.$key; } } return $classes; }
add_filter('body_class','pfb_body_design');
function pfb_assets() { wp_enqueue_style('portfolio-builder', get_stylesheet_uri(), array(), wp_get_theme()->get('Version')); if (is_singular() && comments_open() && get_option('thread_comments')) { wp_enqueue_script('comment-reply'); } }
add_action('wp_enqueue_scripts', 'pfb_assets');
function pfb_nav_fallback() {
 echo '<ul>'; $seed=pfb_seed(); foreach (array('about'=>'navAbout','projects'=>'navProjects','contact'=>'navContact') as $section=>$label) { if (($seed['design']['sections'][$section] ?? true) !== false) { echo '<li><a href="'.esc_url($section==='projects'?pfb_site_url('works'):home_url('/#'.$section)).'">'.esc_html(pfb_label($label)).'</a></li>'; } } if (!empty($seed['plans']['enabled'])) { echo '<li><a href="'.esc_url(pfb_site_url('plans')).'">پلن‌ها</a></li>'; } echo '</ul>';
}
function pfb_customize($wp_customize) {
 $wp_customize->add_section('pfb_profile', array('title'=>'اطلاعات پورتفولیو', 'priority'=>30));
 $labels = array('name'=>'نام و نام خانوادگی','title'=>'عنوان حرفه‌ای','field'=>'حیطه کاری','headline'=>'تیتر اصلی','bio'=>'معرفی','skills'=>'مهارت‌ها، با ویرگول','services'=>'خدمات، هر خدمت در یک خط','experience'=>'سوابق کاری','education'=>'تحصیلات','location'=>'محل فعالیت','email'=>'ایمیل عمومی','phone'=>'تلفن','social'=>'لینک شبکه اجتماعی');
 foreach ($labels as $key => $label) {
  $multiline = in_array($key, array('bio','services','experience','education'), true);
  $sanitize = $key === 'email' ? 'sanitize_email' : ($key === 'social' ? 'esc_url_raw' : ($multiline ? 'sanitize_textarea_field' : 'sanitize_text_field'));
  $wp_customize->add_setting('pfb_' . $key, array('default'=>pfb_value($key), 'sanitize_callback'=>$sanitize));
  $wp_customize->add_control('pfb_' . $key, array('label'=>$label,'section'=>'pfb_profile','type'=>$multiline ? 'textarea' : ($key === 'email' ? 'email' : ($key === 'social' ? 'url' : 'text'))));
 }
 $wp_customize->add_section('pfb_social',array('title'=>'شبکه‌های اجتماعی فوتر','priority'=>32));
 foreach (pfb_social_networks() as $key=>$network) {
  $wp_customize->add_setting('pfb_'.$key,array('default'=>pfb_value($key),'sanitize_callback'=>'esc_url_raw'));
  $wp_customize->add_control('pfb_'.$key,array('label'=>$network[0],'section'=>'pfb_social','type'=>'url'));
 }
 foreach (array('avatar'=>'عکس نیم‌تنه','cover'=>'کاور') as $key=>$label) {
  $wp_customize->add_setting('pfb_' . $key, array('default'=>pfb_image($key),'sanitize_callback'=>'esc_url_raw'));
  $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'pfb_' . $key, array('label'=>$label,'section'=>'pfb_profile')));
 }
 $wp_customize->add_section('pfb_design',array('title'=>'رنگ‌ها و متن‌های قالب','priority'=>31));
 $seed=pfb_seed(); foreach (($seed['colors'] ?? array()) as $key=>$value) {
  $wp_customize->add_setting('pfb_color_'.$key,array('default'=>$value,'sanitize_callback'=>'sanitize_hex_color'));
  $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize,'pfb_color_'.$key,array('label'=>$seed['colorLabels'][$key] ?? $key,'section'=>'pfb_design')));
 }
 foreach (($seed['labels'] ?? array()) as $key=>$value) {
  $wp_customize->add_setting('pfb_label_'.$key,array('default'=>$value,'sanitize_callback'=>'sanitize_textarea_field'));
  $wp_customize->add_control('pfb_label_'.$key,array('label'=>$seed['textLabels'][$key] ?? $key,'type'=>'textarea','section'=>'pfb_design'));
 }
 $wp_customize->add_setting('pfb_skillsMode',array('default'=>pfb_value('skillsMode'),'sanitize_callback'=>function($value){return $value==='percent'?'percent':'list';}));
 $wp_customize->add_control('pfb_skillsMode',array('label'=>'نمایش مهارت‌ها؛ درصد را مثل طراحی:50 در مهارت‌ها بنویسید','section'=>'pfb_profile','type'=>'select','choices'=>array('list'=>'فهرست عادی','percent'=>'نوار درصدی')));
 $wp_customize->add_setting('pfb_project_category', array('default'=>0,'sanitize_callback'=>'absint'));
 $choices = array(0=>'نمونه‌کارهای واردشده از ویزارد'); foreach (get_categories(array('hide_empty'=>false)) as $category) { $choices[$category->term_id]=$category->name; }
 $wp_customize->add_control('pfb_project_category', array('label'=>'دسته نوشته‌های نمونه‌کار','description'=>'برای مدیریت پویا، یک دسته انتخاب کنید؛ نوشته‌های منتشرشده آن همراه تصویر شاخص و چکیده نمایش داده می‌شوند.','section'=>'pfb_profile','type'=>'select','choices'=>$choices));
 $wp_customize->add_setting('pfb_project_label', array('default'=>'نمونه‌کار','sanitize_callback'=>'sanitize_text_field'));
 $wp_customize->add_control('pfb_project_label', array('label'=>'عنوان دسته کارت‌ها','section'=>'pfb_profile'));
}
add_action('customize_register', 'pfb_customize');
function pfb_admin_menu() { add_theme_page('راهنمای پورتفولیو','راه‌اندازی پورتفولیو','edit_theme_options','pfb-help','pfb_help'); }
add_action('admin_menu','pfb_admin_menu');
function pfb_help() {
 if (function_exists('pfb_e_dashboard')) { pfb_e_dashboard(); return; }
 if (!current_user_can('edit_theme_options')) { return; } ?>
 <div class="wrap" dir="rtl"><h1>پورتفولیوی شما آماده است</h1>
 <p>مشخصات، عکس‌ها و رنگ را از «نمایش ← سفارشی‌سازی ← اطلاعات پورتفولیو» تغییر دهید. فهرست اصلی نیز از بخش «فهرست‌ها» قابل ویرایش است.</p>
 <p>برای ویرایش پروژه‌ها با ویرایشگر وردپرس، نوشته بسازید و عنوان، متن یا چکیده و تصویر شاخص را وارد کنید. یک دسته مخصوص پروژه‌ها انتخاب کنید و همان دسته را در سفارشی‌سازی تعیین کنید. تا آن زمان، پروژه‌های ویزارد نمایش داده می‌شوند.</p>
 <p>می‌توانید پروژه‌های ویزارد را با دکمه زیر به‌صورت <strong>پیش‌نویس</strong> به نوشته‌ها و تصاویرشان را به رسانه‌ها منتقل کنید. پس از بازبینی، آن‌ها را منتشر و دسته ساخته‌شده را در سفارشی‌سازی انتخاب کنید. فعال‌کردن قالب هیچ نوشته‌ای را تغییر نمی‌دهد.</p>
 <?php if (current_user_can('manage_options') && current_user_can('edit_posts') && current_user_can('upload_files')) : ?>
 <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><input type="hidden" name="action" value="pfb_import"><?php wp_nonce_field('pfb_import'); submit_button('واردکردن پروژه‌های ویزارد به پیش‌نویس‌ها'); ?></form>
 <?php endif; ?><p>این قالب کلاسیک وردپرس است؛ محتوای برگه‌ها و نوشته‌ها با ویرایشگر بلوکی مدیریت می‌شود. ویرایش کامل چیدمان در Site Editor یا Elementor برای این خروجی تعریف نشده است.</p></div>
 <?php
}
function pfb_import() {
 if (!current_user_can('manage_options') || !current_user_can('edit_posts') || !current_user_can('upload_files')) { wp_die('دسترسی کافی نیست'); }
 check_admin_referer('pfb_import');
 $marker = 'pfb_imported_' . get_stylesheet();
 if (get_option($marker)) { wp_safe_redirect(admin_url('edit.php')); exit; }
 require_once ABSPATH . 'wp-admin/includes/image.php'; require_once ABSPATH . 'wp-admin/includes/file.php'; require_once ABSPATH . 'wp-admin/includes/media.php';
 $term = wp_insert_term('پروژه‌های پورتفولیو', 'category', array('slug'=>'portfolio-projects'));
 if (is_wp_error($term)) { $existing=get_term_by('slug','portfolio-projects','category'); if (!$existing) { wp_die('ساخت دسته انجام نشد'); } $category=$existing->term_id; } else { $category=$term['term_id']; }
 $seed=pfb_seed(); $complete=true;
 foreach ($seed['projects'] as $i=>$project) {
  $key=$marker . '_' . $i; $id=absint(get_option($key));
  if (!$id || !get_post($id)) {
   $id=wp_insert_post(wp_slash(array('post_title'=>sanitize_text_field($project['title']),'post_excerpt'=>sanitize_textarea_field($project['description']),'post_content'=>sanitize_textarea_field($project['description']),'post_status'=>'draft','post_type'=>'post','post_category'=>array($category))), true);
   if (is_wp_error($id) || !$id) { $complete=false; continue; } update_option($key,$id,false);
  }
  if (!empty($project['url'])) { update_post_meta($id,'portfolio_original_url',esc_url_raw($project['url'])); }
  if (!empty($project['image']) && !has_post_thumbnail($id)) {
   $relative=$project['image'];
   if (!preg_match('~^assets/images/[a-z0-9-]+\.(png|jpg|webp)$~', $relative)) { $complete=false; continue; }
   $source=get_template_directory() . '/' . $relative;
   $tmp=wp_tempnam(basename($source));
   if (!$tmp || !copy($source,$tmp)) { $complete=false; if ($tmp) { @unlink($tmp); } continue; }
   $attachment=media_handle_sideload(array('name'=>basename($source),'tmp_name'=>$tmp),$id);
   if (is_wp_error($attachment)) { $complete=false; @unlink($tmp); } else { set_post_thumbnail($id,$attachment); }
  }
 }
 if ($complete) { update_option($marker,true,false); }
 wp_safe_redirect(admin_url('edit.php?category_name=portfolio-projects')); exit;
}
add_action('admin_post_pfb_import','pfb_import');
`;
