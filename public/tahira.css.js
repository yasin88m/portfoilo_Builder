export const tahiraCSS = `
.tahira{background:linear-gradient(110deg,color-mix(in srgb,var(--accent) 21%,var(--bg)),var(--bg) 78%)}
.tahira .site-header,.tahira .hero,.tahira .section,.tahira footer{width:min(1120px,86%)}
.tahira .site-header{padding-block:15px}
.tahira .logo span{display:inline-grid;place-items:center;width:28px;height:28px;background:var(--button-bg);color:var(--button-text);border-radius:6px;font-size:16px}
.tahira .site-header nav{font-weight:750;text-transform:uppercase;gap:clamp(12px,2.4vw,32px)}
.tahira .site-header nav a:hover,.tahira .site-header nav a:focus-visible{color:var(--accent)}
.tahira .button{border-radius:50px;box-shadow:0 5px 20px color-mix(in srgb,var(--accent) 25%,transparent)}
.tahira .hero{min-height:0;padding-block:36px 0;gap:clamp(20px,4vw,65px)}
.tahira .intro-copy{padding-block:28px}
.tahira .hero h1,.tahira .headline,.tahira .section h2{text-transform:uppercase;font-weight:850;line-height:1.2}
.tahira .hero h1{font-size:clamp(33px,5vw,65px);margin-bottom:9px}
.tahira .hero .headline{color:var(--accent);font-size:clamp(23px,3.4vw,42px)}
.tahira .eyebrow{letter-spacing:.11em}
[dir=rtl] .tahira .eyebrow{letter-spacing:normal}
.tahira .portrait-stage{min-height:0;isolation:isolate}
.tahira .portrait{height:clamp(310px,47vw,565px);object-fit:contain;object-position:center bottom}
.tahira .portrait-empty{background:transparent}
.tahira-orbit{position:absolute;inset:5% 4% 8%;border-radius:50%;background:repeating-linear-gradient(to bottom,transparent 0 13px,color-mix(in srgb,var(--ink) 33%,transparent) 13px 15px);mask-image:radial-gradient(ellipse,#000 45%,transparent 74%)}
.tahira-orb{position:absolute;z-index:2;width:12%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 32% 24%,color-mix(in srgb,var(--accent) 65%,white),var(--bg) 67%);opacity:.85}
.tahira-orb.first{inset:18% auto auto 4%;z-index:0}.tahira-orb.last{inset:53% 2% auto auto}
.tahira .tahira-hero-social{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
.tahira-hero-social a{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:white;background:#1364b5;border:1px solid #ffffff66}
.tahira-hero-social a:nth-child(2){background:#a83671}.tahira-hero-social a:nth-child(3){background:#166a85}
.tahira-hero-social a:hover{filter:brightness(1.2)}
.tahira-strip{display:flex;justify-content:center;flex-wrap:wrap;gap:14px clamp(16px,5vw,68px);padding:20px 7%;background:color-mix(in srgb,var(--accent) 15%,var(--bg));font-weight:800}
.tahira-strip i{font-style:normal;color:var(--accent);padding-inline-end:7px}
.tahira .about{gap:clamp(24px,6vw,90px);padding-block:70px}
.tahira .about-visual{isolation:isolate}
.tahira .about-visual::before,.tahira .about-visual::after{content:'';position:absolute;z-index:-1;inset:auto auto -8% -8%;width:49%;aspect-ratio:1;border-radius:50%;background:repeating-conic-gradient(from 0deg,transparent 0 2deg,color-mix(in srgb,var(--accent) 40%,transparent) 2deg 4deg);mask-image:radial-gradient(transparent 49%,#000 51% 68%,transparent 70%)}
.tahira .about-visual::after{inset:3% -5% auto auto;width:27%}
.tahira .about-photo{height:clamp(260px,37vw,455px);object-fit:contain;object-position:center bottom;background:var(--panel);border:1px solid #ffffff2b;border-radius:20px}
.tahira .about-photo.has-cover{object-fit:cover;object-position:center}
.tahira .metrics{grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:8px;margin:18px 0 24px}
.tahira .metrics>div{padding:10px 12px;background:var(--panel);border-radius:8px}
.tahira .metrics b{font-size:22px}
.tahira .section-heading{text-align:start}
.tahira .works{position:relative;isolation:isolate}
.tahira .works::before{content:'';position:absolute;inset:0 calc((100% - 100vw)/2);z-index:-1;background:color-mix(in srgb,var(--accent) 10%,transparent)}
.tahira .project{padding:7px;border-radius:10px;background:#f8faff;color:#122039;box-shadow:0 10px 24px #0004}
.tahira .project-visual{border-radius:6px;overflow:hidden}
.tahira .project-info{position:relative;padding:12px}
.tahira .project-info h3{font-size:15px;margin-bottom:4px}
.tahira .project-info a{color:#105391}
.tahira .project-info{padding-inline-end:48px}
.tahira .project-info .tahira-project-link{position:absolute;inset-inline-end:9px;inset-block-start:12px;display:grid;place-items:center;width:33px;height:33px;border-radius:50%;background:#1364b5;color:white;font-size:16px}
.tahira .project-info .tahira-project-link:hover{background:#083e75}
.tahira .services-grid article{background:linear-gradient(155deg,var(--panel),var(--bg));border-radius:12px}
@media(max-width:620px){.tahira .site-header,.tahira .hero,.tahira .section,.tahira footer{width:90%}.tahira .hero{gap:0;padding-top:15px}.tahira .intro-copy{padding-block:16px}.tahira .portrait{height:320px}.tahira .about{padding-block:40px}.tahira .about-visual::before{left:-4%}.tahira .site-header nav{flex-wrap:wrap}}
`;
