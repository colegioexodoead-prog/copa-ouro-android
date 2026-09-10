(function(){
  const VERSION='1.3.8';
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  function path(){return location.pathname.replace(/\/+$/,'')||'/'}
  function active(){return !!(window.CopaProfiles&&CopaProfiles.active&&CopaProfiles.active())}
  function moduleName(){const p=path();if(p.startsWith('/copa'))return['🏆','Copa Ouro','Rodadas, classificação e fases'];if(p.startsWith('/eliminatorias'))return['🛡️','Eliminatórias','Vagas, confrontos e Chance de Ouro'];if(p.startsWith('/mercado'))return['⇄','Mercado','Gestão das equipes'];if(p.startsWith('/galeria'))return['👑','Galeria dos Campeões','História, ranking e estatísticas'];return['🏆','Copa Ouro','Mais que um jogo, uma história']}
  function css(){
    if(document.getElementById('copaThemeV138'))return;
    const s=document.createElement('style');s.id='copaThemeV138';s.textContent=`
      :root{--co-bg:#03130b;--co-bg2:#08291a;--co-card:#092719e8;--co-card2:#0d3522e8;--co-gold:#d9b541;--co-gold2:#f5d66a;--co-line:#806c2c;--co-text:#f7f5ea;--co-muted:#b8c8bd;--co-green:#177044;--co-shadow:0 14px 34px #0007}
      html{background:#03130b!important;scroll-behavior:smooth}
      body.copa-v138{background:radial-gradient(circle at 50% -10%,#174b31 0,#082518 24%,#03130b 68%) fixed!important;color:var(--co-text)!important;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif!important;min-height:100vh}
      body.copa-v138:before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;background:linear-gradient(115deg,transparent 0 48%,#d9b5410a 49% 50%,transparent 51%),radial-gradient(circle at 85% 7%,#d9b54117,transparent 23%)}
      body.copa-v138 h1,body.copa-v138 h2,body.copa-v138 h3{letter-spacing:-.02em}
      body.copa-v138 button,body.copa-v138 .btn,body.copa-v138 input,body.copa-v138 select,body.copa-v138 textarea{font:inherit}
      body.copa-v138 button,body.copa-v138 .btn{min-height:42px;border-radius:12px!important;transition:transform .12s ease,filter .12s ease,box-shadow .12s ease}
      body.copa-v138 button:active,body.copa-v138 .btn:active{transform:scale(.975)}
      body.copa-v138 input,body.copa-v138 select,body.copa-v138 textarea{border-radius:11px!important;border-color:#496754!important;background:#051b11!important;color:#fff!important}
      body.copa-v138 .box,body.copa-v138 .card,body.copa-v138 .panel,body.copa-v138 .stage-banner,body.copa-v138 [class*='card'],body.copa-v138 [class*='panel']{border-color:#735f27!important;box-shadow:0 10px 25px #0004}
      body.copa-v138 table{border-collapse:separate;border-spacing:0;width:100%}
      body.copa-v138 th{color:#f4d56a!important;font-weight:900}
      body.copa-v138 tr{border-color:#ffffff12!important}
      body.copa-v138 a{transition:filter .12s ease,transform .12s ease}
      body.copa-v138 a:active{filter:brightness(1.12)}
      #v138ModuleBar{position:sticky;top:0;z-index:2147481500;background:linear-gradient(180deg,#04170ff5,#082519ef);backdrop-filter:blur(14px);border-bottom:1px solid #6f5c26;padding:9px 12px 8px;box-shadow:0 5px 18px #0005}
      #v138ModuleBar .inner{max-width:1180px;margin:auto;display:flex;align-items:center;gap:10px}
      #v138ModuleBar .badge{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#f0cf60,#a98118);color:#092116;font-size:20px;box-shadow:0 5px 16px #0006}
      #v138ModuleBar .titles{min-width:0;flex:1}#v138ModuleBar strong{display:block;color:#f7e29a;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#v138ModuleBar small{display:block;color:#aebdb2;font-size:10px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #v138ModuleBar .home{border:1px solid #806c2c;background:#0a2b1b;color:#f2d269;text-decoration:none;border-radius:11px;padding:8px 10px;font-size:11px;font-weight:900}
      #copaMainNav{background:linear-gradient(180deg,#051b12f8,#03110bf8)!important;border-top:1px solid #947b30!important;box-shadow:0 -10px 28px #0009!important;padding:7px 7px calc(7px + env(safe-area-inset-bottom,0px))!important}
      #copaMainNav .inner{grid-template-columns:repeat(5,1fr)!important;gap:4px!important;max-width:760px!important}
      #copaMainNav a{min-height:56px!important;padding:5px 2px!important;border-radius:13px!important;color:#b9c6bc!important;font-size:9px!important;font-weight:800!important}
      #copaMainNav a .ico{font-size:20px!important}
      #copaMainNav a.active{background:linear-gradient(145deg,#f2d46d,#b78c1f)!important;color:#07150d!important;border-color:#ffe58a!important;box-shadow:0 7px 18px #0006!important}
      #copaUserMenu{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}
      #copaGalleryQuick{top:56px!important;background:#061b12f4!important;border-color:#806c2c!important}
      #copaGalleryQuick button{background:#0a2b1b!important;border-color:#5a704f!important}.copa-v138 #copaGalleryQuick button.active{background:#d4af37!important;color:#07150d!important}
      #copaGameRoulette{background:linear-gradient(155deg,#0c3923,#061c12)!important;border-color:#c39f35!important;box-shadow:var(--co-shadow)!important}
      #copaWheel{border-color:#f0cc55!important;box-shadow:inset 0 0 0 3px #80671e,0 10px 25px #0009!important}
      #copaGameRoulette .spin{background:linear-gradient(145deg,#f1d36a,#b98b1d)!important;box-shadow:0 8px 20px #0006!important}
      .v138-home-wrap{max-width:760px;margin:auto;padding:16px 14px 98px}
      .v138-brand{text-align:center;padding:6px 8px 15px}.v138-brand .cup{font-size:46px;filter:drop-shadow(0 7px 10px #0008)}.v138-brand h1{margin:0;color:#f3d66d;font-family:Georgia,serif;font-size:34px;letter-spacing:.03em}.v138-brand p{margin:5px 0 0;color:#b9c9bd;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
      .v138-hero{position:relative;overflow:hidden;border:1px solid #9f8330;border-radius:24px;padding:21px;background:radial-gradient(circle at 85% 15%,#d8b33935,transparent 26%),linear-gradient(135deg,#0d3b25,#071b12 64%);box-shadow:0 18px 38px #0008;margin-bottom:13px}
      .v138-hero:after{content:'🏆';position:absolute;right:14px;top:6px;font-size:98px;opacity:.18;filter:drop-shadow(0 8px 16px #000)}
      .v138-eyebrow{color:#e4c458;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.v138-hero h2{margin:7px 0 4px;font-size:28px;color:#fff}.v138-hero p{margin:0 0 15px;color:#bdccc1;font-size:13px;max-width:390px}.v138-hero-actions{display:flex;gap:8px;flex-wrap:wrap}.v138-primary,.v138-secondary{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 15px;border-radius:12px;font-weight:900;text-decoration:none;font-size:12px}.v138-primary{background:linear-gradient(145deg,#f3d66c,#b68a1c);color:#07150d}.v138-secondary{border:1px solid #687c6d;background:#0b2b1c;color:#fff}
      .v138-status{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#092619dd;border:1px solid #536e5b;border-radius:16px;padding:11px 12px;margin-bottom:13px}.v138-status .cloudbtn{background:#d4af37!important;color:#07150d!important;border:0!important}.v138-status #who{color:#f1d16b}.v138-status #cloudStatus{margin-top:3px}
      .v138-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:13px}.v138-action{border:1px solid #516b58;background:linear-gradient(160deg,#0b3020,#071b12);border-radius:15px;padding:12px 7px;text-align:center;color:#fff;text-decoration:none;min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 18px #0004}.v138-action .ico{font-size:24px;color:#e5c24e}.v138-action b{font-size:12px;margin-top:5px}.v138-action small{font-size:9px;color:#9fb0a4;margin-top:2px}
      .v138-section{border:1px solid #6f5b25;background:linear-gradient(160deg,#0a2d1d,#061910);border-radius:20px;padding:14px;margin:12px 0;box-shadow:0 10px 24px #0005}.v138-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.v138-section-head h3{margin:0;color:#f4d56a;font-size:16px}.v138-section-head span{color:#99aa9e;font-size:10px}
      .v138-modules{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.v138-module{display:flex;align-items:center;gap:11px;min-height:94px;padding:13px;border-radius:16px;border:1px solid #4e6956;background:linear-gradient(145deg,#0e3a25,#082116);color:#fff;text-decoration:none;box-shadow:0 8px 18px #0004}.v138-module .mi{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#efd166,#aa8119);color:#07150d;font-size:21px}.v138-module b{display:block;font-size:14px}.v138-module small{display:block;color:#a8b9ad;font-size:10px;margin-top:3px;line-height:1.25}
      .v138-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.v138-gallery a{border:1px solid #506856;background:#0b2d1d;color:#fff;text-decoration:none;border-radius:13px;padding:11px 5px;text-align:center;font-size:10px;font-weight:900}.v138-gallery a span{display:block;font-size:20px;margin-bottom:4px;color:#e2c04b}
      .v138-foot{color:#72877a;text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:7px 0 0}
      @media(max-width:520px){.v138-home-wrap{padding:12px 10px 96px}.v138-brand h1{font-size:30px}.v138-hero{padding:17px}.v138-hero h2{font-size:24px}.v138-actions{grid-template-columns:repeat(2,1fr)}.v138-action{min-height:78px}.v138-modules{grid-template-columns:1fr 1fr}.v138-module{padding:10px;min-height:86px}.v138-module .mi{width:36px;height:36px;flex-basis:36px;font-size:18px}.v138-gallery{grid-template-columns:repeat(2,1fr)}#copaMainNav a{font-size:8px!important}#v138ModuleBar{padding-top:7px}}
      @media(min-width:900px){#copaMainNav{width:760px!important}.v138-home-wrap{max-width:860px}}
    `;document.head.appendChild(s)
  }
  function bottomNav(){
    if(!active())return;
    let nav=document.getElementById('copaMainNav');
    if(!nav){nav=document.createElement('nav');nav.id='copaMainNav';nav.setAttribute('aria-label','Navegação principal da Copa Ouro');nav.innerHTML='<div class="inner"></div>';document.body.appendChild(nav)}
    let inner=nav.querySelector('.inner');if(!inner){inner=document.createElement('div');inner.className='inner';nav.appendChild(inner)}
    if(!inner.querySelector('[data-key="home"]')){const a=document.createElement('a');a.href='/';a.dataset.key='home';a.innerHTML='<span class="ico">⌂</span><span>Início</span>';inner.insertBefore(a,inner.firstChild)}
    const p=path();const key=p==='/'?'home':p.startsWith('/copa')?'copa':p.startsWith('/eliminatorias')?'eliminatorias':p.startsWith('/mercado')?'mercado':p.startsWith('/galeria')?'galeria':'';
    inner.querySelectorAll('[data-key]').forEach(a=>a.classList.toggle('active',a.dataset.key===key));
  }
  function moduleBar(){
    if(!active()||path()==='/'||document.getElementById('v138ModuleBar'))return;
    const [ico,title,sub]=moduleName();const bar=document.createElement('div');bar.id='v138ModuleBar';bar.innerHTML='<div class="inner"><div class="badge">'+ico+'</div><div class="titles"><strong>'+title+'</strong><small>'+sub+' • v'+VERSION+'</small></div><a class="home" href="/">INÍCIO</a></div>';document.body.insertBefore(bar,document.body.firstChild)
  }
  function home(){
    if(path()!=='/'||!active()||document.getElementById('v138Home'))return;
    const old=document.querySelector('.wrap');if(!old)return;
    const who=(window.CopaProfiles&&CopaProfiles.pname&&CopaProfiles.pname())||'Jogador';
    old.id='v138Home';old.className='v138-home-wrap';old.innerHTML=`
      <header class="v138-brand"><div class="cup">🏆</div><h1>COPA OURO</h1><p>Mais que um jogo, uma história</p></header>
      <section class="v138-hero"><div class="v138-eyebrow">Temporada atual • ${who}</div><h2>Rumo à Glória</h2><p>Controle sua competição com acesso rápido às rodadas, eliminatórias, mercado e história da Copa Ouro.</p><div class="v138-hero-actions"><a class="v138-primary" href="/copa/">▶ CONTINUAR COPA</a><a class="v138-secondary" href="/eliminatorias/">🛡️ ELIMINATÓRIAS</a></div></section>
      <div class="v138-status"><div><b id="who">👤 ${who}</b><div id="cloudStatus" class="small muted">☁️ Preparando salvamento online...</div></div><button onclick="CopaCloudManualConnect()" class="cloudbtn">☁️ NUVEM</button></div>
      <section class="v138-actions"><a class="v138-action" href="/copa/"><span class="ico">▶</span><b>Continuar</b><small>Abrir Copa</small></a><a class="v138-action" href="/copa/"><span class="ico">＋</span><b>Nova Copa</b><small>Dentro da Copa</small></a><button class="v138-action" id="v138Backup" type="button"><span class="ico">☁</span><b>Backup</b><small>Salvar progresso</small></button><button class="v138-action" id="v138Load" type="button"><span class="ico">⇩</span><b>Carregar</b><small>Restaurar jogo</small></button></section>
      <section class="v138-section"><div class="v138-section-head"><h3>⚽ Acesso rápido</h3><span>Toque para abrir</span></div><div class="v138-modules"><a class="v138-module" href="/copa/"><div class="mi">🏆</div><div><b>Copa Ouro</b><small>Rodadas, classificação, playoffs e Roleta 1–18</small></div></a><a class="v138-module" href="/eliminatorias/"><div class="mi">🛡</div><div><b>Eliminatórias</b><small>Vagas, confrontos e Chance de Ouro</small></div></a><a class="v138-module" href="/mercado/"><div class="mi">⇄</div><div><b>Mercado</b><small>Equipes cadastradas e negociações</small></div></a><a class="v138-module" href="/galeria/"><div class="mi">👑</div><div><b>Galeria</b><small>Campeões, rankings, gráficos e jejuns</small></div></a></div></section>
      <section class="v138-section"><div class="v138-section-head"><h3>👑 Galeria dos Campeões</h3><span>História em números</span></div><div class="v138-gallery"><a href="/galeria/#ranking"><span>🥇</span>Ranking</a><a href="/galeria/#estatisticas"><span>📊</span>Gráficos</a><a href="/galeria/#galeria"><span>🏆</span>Campeões</a><a href="/galeria/#jejum"><span>⏳</span>Jejum</a></div></section>
      <div class="v138-foot">Copa Ouro • competição • história • v${VERSION}</div>`;
    const bk=document.getElementById('v138Backup'),ld=document.getElementById('v138Load');if(bk)bk.onclick=()=>CopaProfiles.backup();if(ld)ld.onclick=()=>CopaProfiles.loadFile();
  }
  function polish(){
    document.body.classList.add('copa-v138');
    document.querySelectorAll('button').forEach(b=>{if(!b.getAttribute('aria-label')&&!b.textContent.trim())b.setAttribute('aria-label','Ação')});
  }
  ready(()=>{css();polish();home();moduleBar();bottomNav();setTimeout(()=>{bottomNav();polish()},250)})
})();
