import {resolveColors,paletteTone,copyFor,skillEntries,orderedSections,visibleSection,targetFor} from './customize.js';
import {escapeHTML as escape,socialNetworks} from './shared.js';
// Native Elementor containers and Free widgets. No HTML-widget snapshots or Pro dependency.
export function elementorTemplates(p){
 let sequence=0;const id=()=> (++sequence).toString(16).padStart(7,'0');
 const box=(n,unit='px')=>({unit,top:String(n),right:String(n),bottom:String(n),left:String(n),isLinked:true});
 const gap=n=>({unit:'px',size:n,column:String(n),row:String(n),isLinked:true});
 const slider=(size,unit='px')=>({unit,size,sizes:[]});
 const tone=color=>paletteTone(color,p.paletteOverride?p.color:'');
 const c=resolveColors(p),{background:bg,surface:panel,text:ink,accent}=c,teal=c.heroBackground;
 const copy=key=>copyFor(p,key),target=key=>targetFor(p,key);
 const font={typography_typography:'custom',typography_font_family:'Vazirmatn'};
 function widget(type,settings,label){return {id:id(),elType:'widget',widgetType:type,settings:{...settings,_title:label},elements:[]};}
 function container(elements,settings={},label='بخش'){return {id:id(),elType:'container',isInner:false,settings:{content_width:'full',flex_direction:'column',flex_gap:gap(18),padding:box(0),...settings,_title:label},elements:elements.filter(Boolean)};}
 const responsiveType=(size, minimum, ratio)=>({
  typography_font_size:slider(size),
  typography_font_size_tablet:slider(Math.max(minimum,Math.round(size*(1+ratio)/2))),
  typography_font_size_mobile:slider(Math.max(minimum,Math.round(size*ratio)))
 });
 const heading=(text,size=30,color=ink,tag='h2',extra={})=>widget('heading',{title:escape(text),header_size:tag,title_color:color===ink?c.heading:color,...font,...responsiveType(tag==='h1'?(p.design?.headingSize||size):size,Math.min(size,tag==='h1'?26:11),tag==='h1'?.62:.76),typography_line_height:slider(1.65,'em'),...extra},text.slice(0,35));
 const text=(value,color=ink,extra={})=>widget('text-editor',{editor:'<p>'+escape(value).replace(/\n/g,'<br>')+'</p>',text_color:color,...font,...responsiveType(p.design?.fontSize||14,12,.75),typography_line_height:slider(1.95,'em'),...extra},'متن قابل ویرایش');
 const button=(label,url=target('contact'),color=accent,extra={})=>widget('button',{text:escape(label),link:{url,is_external:false,nofollow:false},align:'right',button_text_color:c.buttonText,background_color:color===accent?c.buttonBg:color,...font,...responsiveType(13,11,.85),border_radius:box(p.design?.radius??(['coral','learnhouse','evergreen'].includes(p.template)?28:8)),text_padding:box(14),...extra},label);
 const image=(url,alt,height=400,extra={})=>url?widget('image',{image:{url,id:0,alt},image_size:'full',width:slider(100,'%'),height:slider(height),height_mobile:slider(Math.min(height,330)),'object-fit':'contain',...extra},alt):null;
 const row=(children,settings={},label='ردیف')=>container(children,{flex_direction:'row',flex_direction_mobile:'column',flex_align_items:'center',flex_gap:gap(30),...settings},label);
 const col=(children,width=50,settings={},label='ستون')=>container(children,{width:slider(width,'%'),width_mobile:slider(100,'%'),...settings},label);
 const section=(children,settings={},label='بخش')=>container(children,{content_width:'boxed',boxed_width:slider(1080),padding:{...box(p.design?.spacing||48),right:'24',left:'24'},padding_mobile:box(24),...settings,css_classes:'pfb-elementor-root '+(settings.css_classes||'')},label);
 const tag=(value,color=accent)=>heading(value,13,color,'p');
 const portrait=image(p.avatar,p.name,430,{image_border_radius:box(0)});
 const entries=skillEntries(p),skills=entries.map(x=>x.name);
 const services=(p.services?p.services.split(/\n/):skills).map(x=>x.trim()).filter(Boolean);
 const actions=row([button(copy('primaryButton'),target('projects')),button(copy('secondaryButton'),target('contact'),accent,{background_color:'transparent',button_text_color:ink,border_border:'solid',border_color:accent,border_width:box(1)})],{flex_gap:gap(12),flex_wrap:'wrap',flex_direction_mobile:'row'},'دکمه‌های اصلی');
 const metrics=(color=ink)=>row([col([heading(String(p.projects.length),30,color,'h3'),text(copy('projectMetric'),color)],33),col([heading(String(skills.length),30,color,'h3'),text(copy('skillMetric'),color)],33),p.location?col([heading(p.location,18,color,'h3'),text(copy('locationMetric'),color)],34):null],{flex_gap:gap(16),flex_direction_mobile:'row'},'آمار و محل فعالیت');
 const intro=[tag(p.field),heading(copy('heroTitle'),52,c.heroHeading,'h1'),heading(p.headline||p.title,24,accent,'h2'),text(p.bio,c.heroText),actions];
 let hero;
 if(p.template==='evergreen'){
  hero=section([col([tag(p.field,c.heroText),heading(copy('heroTitle'),48,c.heroHeading,'h1'),heading(p.headline||p.title,24,c.heroText),text(p.name+' | '+p.title,c.heroText),text(p.bio,c.heroText),button(copy('primaryButton'),target('projects'))],60)],{background_background:'classic',background_color:p.design?.colors?.heroBackground||tone('#294d35'),background_image:{url:p.cover,id:0},background_position:'center center',background_size:'cover',background_overlay_background:'classic',background_overlay_color:p.design?.colors?.heroBackground||tone('#142917'),background_overlay_opacity:{unit:'px',size:.58},min_height:slider(500),flex_justify_content:'center',css_classes:'pfb-e-hero'},'کاور معماری و طبیعت');
 }else if(p.template==='learnhouse'){
  hero=section([row([col([tag(p.field,accent),heading(copy('heroTitle'),50,c.heroHeading,'h1'),heading(p.headline||p.title,24,p.design?.colors?.accent||(p.paletteOverride?accent:tone('#f2cb67'))),text(p.bio,c.heroText),row([button(copy('primaryButton'),target('projects')),button(copy('secondaryButton'),target('contact'),accent,{background_color:'transparent',button_text_color:'#ffffff',border_border:'solid',border_color:'#ffffff'})],{flex_wrap:'wrap',flex_gap:gap(12)}),metrics('#ffffff')]),col([portrait],50,{flex_justify_content:'end'})])],{background_background:'classic',background_color:teal,border_radius:{...box(0),bottom:'48'},css_classes:'pfb-e-hero'},'معرفی مربی با تصویر نیم‌تنه');
 }else{
  let visual=[portrait];
  if(p.template==='codecraft')visual.push(text('const expert = { name: "'+p.name+'", role: "'+p.title+'" };',tone('#bda8ff'),{_css_classes:'pfb-e-code',typography_font_family:'monospace'}));
  if(p.template==='coral')visual.push(container([tag(copy('availabilityText')),text(p.title),button(copy('secondaryButton'),target('contact'))],{background_background:'classic',background_color:tone('#ffe7db'),padding:box(20),border_radius:box(22)},'کارت همکاری'));
  if(p.template==='amethyst')visual.push(metrics());
  if(p.template==='eduviolet')visual.push(row([button(skills.length+' '+copy('skillMetric'),target('skills')),button(p.projects.length+' '+copy('projectMetric'),target('projects'))],{flex_wrap:'wrap',flex_gap:gap(10)},'نشان‌های آموزشی'));
  hero=section([row([col(intro),col(visual,50,{background_background:'classic',background_color:panel,border_radius:box(p.template==='coral'?100:32),padding:box(24)})])],{background_background:'classic',background_color:c.heroBackground,css_classes:'pfb-e-hero'},'معرفی اصلی '+p.name);
 }
 const skillStrip=section([tag(copy('skillsEyebrow')),heading(copy('skillsHeading')),row(entries.map(s=>col([p.skillsMode==='percent'?widget('progress',{title:escape(s.name),percent:slider(s.percent,'%'),display_percentage:'show',bar_color:c.skill,bar_bgcolor:panel,title_color:c.heading,inner_text:'',...font},s.name+' '+s.percent+'٪'):heading(s.name,18)],p.skillsMode==='percent'?48:31)),{flex_wrap:'wrap',flex_align_items:'stretch'})],{_element_id:'skills',background_background:'classic',background_color:bg},'مهارت‌ها؛ '+(p.skillsMode==='percent'?'نوار درصدی':'فهرست عادی'));
 const about=section([row([col([image(p.cover||p.avatar,'تصویر معرفی',350,{'object-fit':p.cover?'cover':'contain',image_border_radius:box(22)})]),col([tag(copy('aboutEyebrow')),heading(copy('aboutHeading')),text(p.bio),p.experience?text(p.experience):null,p.education?heading(copy('educationHeading'),20):null,p.education?text(p.education):null,button(copy('aboutButton'),target('contact'))])])],{_element_id:'about',background_background:'classic',background_color:bg},'درباره من و سوابق');
 const projectCards=p.projects.map((project,i)=>col([image(project.image,project.title,230,{'object-fit':'cover',image_border_radius:box(14)}),tag(project.category||'نمونه‌کار'),heading(project.title,22),text(project.description),project.url?button(copy('projectButton'),project.url):null],p.design?.projectColumns===2?48:31,{background_background:'classic',background_color:panel,padding:box(20),border_radius:box(p.design?.radius??18),flex_align_self:'stretch'},'نمونه‌کار '+(i+1)+' — '+project.title));
 const projectSection=section([tag(copy('projectsEyebrow'),p.template==='learnhouse'?tone('#f2cb67'):accent),heading(copy('projectsHeading'),32,p.design?.colors?.heading||(p.template==='learnhouse'?'#ffffff':ink)),row(projectCards,{flex_wrap:'wrap',flex_align_items:'stretch',flex_gap:gap(22)},'کارت‌های پروژه؛ هر کارت مستقل')],{_element_id:'projects',background_background:p.template==='eduviolet'?'gradient':'classic',background_color:p.template==='learnhouse'?teal:p.template==='eduviolet'?tone('#b273f9'):bg,...(p.template==='eduviolet'?{background_color_b:tone('#ee9bca'),background_gradient_angle:slider(110,'deg')}: {})},'پروژه‌های منتخب');
 const serviceSection=section([tag(copy('servicesEyebrow')),heading(copy('servicesHeading')),row(services.map((s,i)=>col([heading('✦',30,accent,'p'),heading(s,21),button(copy('serviceButton'),target('contact'),accent,{background_color:'transparent',button_text_color:accent})],31,{background_background:'classic',background_color:panel,border_radius:box(p.design?.radius??18),padding:box(24),flex_align_self:'stretch'},'خدمت '+(i+1))),{flex_wrap:'wrap',flex_align_items:'stretch',flex_gap:gap(22)})],{_element_id:'services',background_background:'classic',background_color:bg},'خدمات قابل ویرایش');
 const phoneNumber=p.phone.replace(/[۰-۹٠-٩]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.includes(c)?'۰۱۲۳۴۵۶۷۸۹'.indexOf(c):'٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[^+0-9]/g,'');
 const contact=section([row([col([tag(copy('contactEyebrow')),heading(copy('contactHeading'),36),text(copy('contactText'))]),col([p.email?button(p.email,'mailto:'+p.email):null,p.phone?button(p.phone,'tel:'+phoneNumber):null,p.social?button(copy('socialButton'),p.social):null,button(copy('backTop'),'#top',accent,{background_color:'transparent',button_text_color:accent})])])],{_element_id:'contact',background_background:'classic',background_color:panel},'تماس و همکاری');
 const parts={about,skills:skillStrip,projects:projectSection,services:serviceSection,contact};
 const content=[hero,...orderedSections(p).filter(key=>visibleSection(p,key)).map(key=>parts[key])];
 const header=section([row([col([heading(p.name,21,accent,'p')],30),col([row([visibleSection(p,'about')&&button(copy('navAbout'),'#about',accent,{background_color:'transparent',button_text_color:ink}),visibleSection(p,'projects')&&button(copy('navProjects'),target('projects'),accent,{background_color:'transparent',button_text_color:ink}),visibleSection(p,'contact')&&button(copy('navContact'),target('contact'),accent,{background_color:'transparent',button_text_color:ink})],{flex_gap:gap(8),flex_wrap:'wrap',flex_direction_mobile:'row'})],45),col([button(copy('navButton'),target('contact'))],25)],{flex_gap:gap(12)})],{padding:box(18),background_background:'classic',background_color:bg,css_classes:'pfb-e-header'},'سربرگ قابل ویرایش');
 const socialItems=socialNetworks.filter(({key})=>p[key]).map(({key,brand})=>({
  _id:id(), social_icon:{value:'fab fa-'+brand,library:'fa-brands'}, link:{url:p[key],is_external:'on',nofollow:''}
 }));
 const socialWidget=socialItems.length ? widget('social-icons',{
  social_icon_list:socialItems, shape:'rounded', icon_color:'custom',
  icon_primary_color:panel, icon_secondary_color:accent, icon_size:slider(20)
 },'شبکه‌های اجتماعی') : null;
 const footer=section([row([col([heading(p.name,20),text(p.title),text(copy('footerText')),socialWidget],65),col([button(copy('backTop'),'#top')],35)])],{background_background:'classic',background_color:panel,padding:box(28),css_classes:'pfb-e-footer'},'پاورقی قابل ویرایش');
 function doc(title,type,content){return {title,type,version:'0.4',page_settings:{hide_title:'yes',template:'elementor_header_footer'},content};}
 return {page:doc('پورتفولیوی '+p.name,'page',content),header:doc('سربرگ '+p.name,'section',[header]),footer:doc('پاورقی '+p.name,'section',[footer])};
}
