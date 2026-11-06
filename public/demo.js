// Fictional sample identities and AI-generated project artwork. No real client claims.
const cache=new Map();
const assets={tahira:['tahira.png','image/png'],tahiraAbout:['tahira-about.webp','image/webp'],man:['man.png','image/png'],woman:['woman.png','image/png'],architecture:['architecture.webp','image/webp'],dashboard:['dashboard.webp','image/webp'],branding:['branding.webp','image/webp']};
async function asset(name){
 if(!cache.has(name))cache.set(name,(async()=>{const[file,mime]=assets[name],r=await fetch('/assets/demo/'+file);if(!r.ok)throw Error('بارگذاری تصاویر دمو انجام نشد؛ دوباره تلاش کنید.');const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return `data:${mime};base64,${btoa(binary)}`;})().catch(err=>{cache.delete(name);throw err;}));
 return cache.get(name);
}
export async function getDemo({gender,template='codecraft',color='#7552ed',paletteOverride=false}={}){
 gender=gender||(['codecraft','evergreen','learnhouse'].includes(template)?'man':'woman');
 const[avatar,architecture,dashboard,branding]=await Promise.all([asset(gender==='man'?'man':'woman'),asset('architecture'),asset('dashboard'),asset('branding')]);
 const projects=[{title:'خانه سبز',category:'معماری و تصویرسازی',description:'پروژه نمایشی: یک خانه پایدار در دل طبیعت با تمرکز بر نور، متریال طبیعی و ارتباط با محیط.',image:architecture,url:''},{title:'داشبورد آبان',category:'طراحی محصول دیجیتال',description:'پروژه نمایشی: طراحی رابط تحلیلی برای خواندن ساده‌تر داده‌ها و تصمیم‌گیری سریع‌تر.',image:dashboard,url:''},{title:'هویت بصری رز',category:'برندینگ و بسته‌بندی',description:'پروژه نمایشی: ترکیب رنگ، فرم و بسته‌بندی برای ساخت یک هویت بصری یکپارچه.',image:branding,url:''}];
 if(template!=='evergreen')projects.push(projects.shift());
 if(template==='tahira'&&gender==='woman'){
  const [portrait,cover]=await Promise.all([asset('tahira'),asset('tahiraAbout')]);
  const skills='Figma، Webflow، Framer، Illustrator، Design Systems';
  return {name:'تاهیرا',title:'طراح دیجیتال',field:'TAHIRA',headline:'من یک طراح دیجیتال هستم',bio:'رابط‌ها و تجربه‌های دیجیتال ساده و خوش‌ساخت طراحی می‌کنم. تمرکزم روی طراحی محصول، وب‌سایت و سیستم‌های طراحی است.',experience:'از نخستین ایده تا ساخت نمونهٔ تعاملی، به تیم‌ها کمک می‌کنم تا محصولاتی خوانا و کاربردی بسازند.',location:'تهران',skills,services:'طراحی وب‌سایت\nطراحی رابط و تجربه کاربری\nطراحی سیستم بصری',email:'hello@example.com',avatar:portrait,cover,projects,template,color,paletteOverride,slug:'tahira-demo',design:{text:{heroTitle:'سلام، من تاهیرا هستم.'}},socialInstagram:'https://www.instagram.com/',socialLinkedIn:'https://www.linkedin.com/',socialX:'https://x.com/'};
 }
 const male=gender==='man',name=male?'آرمان رضایی':'سارا احمدی';
 return {skillLevels:(male?'JavaScript، React، طراحی رابط کاربری، توسعه وب، Git، تجربه کاربری':'Figma، طراحی رابط کاربری، هویت بصری، تصویرسازی، تجربه کاربری، طراحی سیستم').split('، ').map((name,i)=>({name,percent:[85,75,90,80,65,70][i]})),skillsMode:'list',name,title:male?'طراح و توسعه‌دهنده وب':'طراح محصول و هویت بصری',field:male?'توسعه وب و تجربه دیجیتال':'طراحی و ارتباطات بصری',headline:male?'ایده‌های شما را برای وب می‌سازم.':'طراحی‌هایی که دیده و به خاطر سپرده می‌شوند.',bio:`من ${name} هستم. به کمک طراحی و فناوری، ایده‌ها را به تجربه‌هایی ساده و کاربردی تبدیل می‌کنم. این پروفایل، شخصیت و پروژه‌ها صرفاً برای نمایش امکانات قالب ساخته شده‌اند.`,location:'تهران، ایران',skills:male?'JavaScript، React، طراحی رابط کاربری، توسعه وب، Git، تجربه کاربری':'Figma، طراحی رابط کاربری، هویت بصری، تصویرسازی، تجربه کاربری، طراحی سیستم',services:'طراحی وب‌سایت شخصی\nطراحی تجربه دیجیتال\nمشاوره و توسعه ایده',experience:'سوابق نمونه برای نمایش قالب:\nطراح مستقل در استودیو خلاق\nهمکاری در طراحی محصولات دیجیتال',education:'تحصیلات نمونه — طراحی و فناوری',email:'hello@example.com',phone:'',social:'',avatar,cover:architecture,projects,template,color,paletteOverride,slug:male?'arman-demo':'sara-demo',domain:''};
}

// Repair only the two exact truncated demo files shipped before 3.4.1.
// Other uploads and every text/project field remain untouched.
export async function repairDemoPortrait(avatar){
 if(!avatar?.startsWith('data:image/png;base64,')||!globalThis.crypto?.subtle)return avatar;
 const bytes=Uint8Array.from(atob(avatar.split(',')[1]),c=>c.charCodeAt(0));
 if(![47199,81638].includes(bytes.length))return avatar;
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const damaged={'e7b3f64e095bd0c1082227e7a23247627aa49dcadcf26bc7d8d6ca0f161dd040':'woman','77afd10e8807ed053bccb62d04a5841b19cd1be53c50471f9125dd5304f8e56f':'man'};
 return damaged[hash]?asset(damaged[hash]):avatar;
}
