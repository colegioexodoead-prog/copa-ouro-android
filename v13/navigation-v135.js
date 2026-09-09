(function(){
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  function path(){return location.pathname.replace(/\/+$/,'')||'/'}
  const ITEMS=[
    {key:'copa',icon:'🏆',label:'Copa',href:'/copa/'},
    {key:'eliminatorias',icon:'⚽',label:'Eliminatórias',href:'/eliminatorias/'},
    {key:'mercado',icon:'🔄',label:'Mercado',href:'/mercado/'},
    {key:'galeria',icon:'👑',label:'Galeria',href:'/galeria/'}
  ];
  function currentKey(){const p=path();if(p.startsWith('/copa'))return'copa';if(p.startsWith('/eliminatorias'))return'eliminatorias';if(p.startsWith('/mercado'))return'mercado';if(p.startsWith('/galeria'))return'galeria';return''}
  function highlight(key){document.querySelectorAll('#copaMainNav [data-key]').forEach(a=>a.classList.toggle('active',a.dataset.key===key))}
  function fixHomeDashboard(){
    if(path()!=='/'||!window.CopaProfiles||!CopaProfiles.active())return;
    const grid=document.querySelector('#dash .grid');if(!grid)return;
    [...grid.querySelectorAll('a')].forEach(a=>{if(/Roleta\s*\/\s*Jogos/i.test(a.textContent||''))a.remove()});
    const style=document.createElement('style');style.id='copaHomeNav135';style.textContent=`
      #dash .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      #dash .grid .card{min-height:100px!important;padding:14px 10px!important;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;border-width:1px;box-shadow:0 8px 18px #0004}
      #dash .grid .card b{font-size:30px!important;margin-bottom:6px!important}
      @media(max-width:520px){#dash .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}#dash .grid .card{font-size:14px!important;min-height:92px!important}}
    `;document.head.appendChild(style);
  }
  function injectMainNav(){
    if(!window.CopaProfiles||!CopaProfiles.active()||path()==='/'||document.getElementById('copaMainNav'))return;
    const style=document.createElement('style');style.id='copaMainNavStyle';style.textContent=`
      body{padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))!important}
      #copaMainNav{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(4,21,11,.98);border-top:1px solid #8f7830;box-shadow:0 -6px 22px #0008;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px));font-family:Arial,sans-serif}
      #copaMainNav .inner{max-width:720px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
      #copaMainNav a{min-width:0;min-height:55px;padding:6px 3px;border-radius:11px;color:#c8d5cb;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:800;line-height:1.05;border:1px solid transparent}
      #copaMainNav a .ico{font-size:21px;line-height:1}
      #copaMainNav a.active{background:#d4af37;color:#07150d;border-color:#f1d16b;box-shadow:0 0 0 1px #f1d16b inset}
      #copaMainNav a:active{transform:scale(.97)}
      #copaUserMenu{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}
      @media(min-width:900px){#copaMainNav{left:50%;right:auto;transform:translateX(-50%);width:680px;border:1px solid #8f7830;border-bottom:0;border-radius:16px 16px 0 0}#copaMainNav a{font-size:11px}}
    `;document.head.appendChild(style);
    const nav=document.createElement('nav');nav.id='copaMainNav';nav.setAttribute('aria-label','Navegação principal da Copa Ouro');
    nav.innerHTML='<div class="inner">'+ITEMS.map(i=>`<a href="${i.href}" data-key="${i.key}"><span class="ico">${i.icon}</span><span>${i.label}</span></a>`).join('')+'</div>';
    document.body.appendChild(nav);highlight(currentKey());
  }
  function rouletteState(){
    const key='copaOuroGameRouletteV135';let s=null;try{s=JSON.parse(localStorage.getItem(key)||'null')}catch(e){}
    if(!s||!Array.isArray(s.remaining)||!Array.isArray(s.drawn))s={remaining:Array.from({length:18},(_,i)=>i+1),drawn:[]};
    return {key,s};
  }
  function secureIndex(max){if(max<=1)return 0;try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max}catch(e){return Math.floor(Math.random()*max)}}
  function injectCopaRoulette(){
    if(!path().startsWith('/copa')||document.getElementById('copaGameRoulette'))return;
    const section=document.getElementById('rodadas');if(!section)return;
    const banner=section.querySelector('.stage-banner');if(!banner)return;
    const style=document.createElement('style');style.id='copaGameRouletteStyle';style.textContent=`
      #copaRoundsTop{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,.9fr);gap:14px;align-items:stretch;margin-bottom:14px}
      #copaRoundsTop>.stage-banner{margin:0!important;height:100%}
      #copaGameRoulette{background:linear-gradient(145deg,#07150d,#0d3020);border:1px solid #a8892d;border-radius:18px;padding:14px;box-shadow:0 9px 26px #0005;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:100%}
      #copaGameRoulette h3{margin:0 0 3px;color:#f1d16b;text-align:center;font-size:18px}#copaGameRoulette .sub{font-size:11px;color:#b8cabb;text-align:center;margin-bottom:10px}
      #copaWheelWrap{position:relative;width:226px;height:226px;margin:3px auto 10px;display:grid;place-items:center}
      #copaWheel{position:absolute;inset:0;border-radius:50%;border:7px solid #d4af37;background:radial-gradient(circle at center,#0a2b1b 0 31%,#174329 32% 63%,#092116 64%);box-shadow:inset 0 0 0 3px #725b17,0 6px 20px #0008;transition:transform 1.15s cubic-bezier(.12,.75,.12,1)}
      #copaWheel:before{content:'';position:absolute;left:50%;top:-13px;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:21px solid #f1d16b;z-index:4;filter:drop-shadow(0 2px 2px #0008)}
      #copaWheel .n{position:absolute;left:50%;top:50%;width:27px;height:27px;margin:-13.5px;border-radius:50%;display:grid;place-items:center;background:#e0b838;color:#07150d;font-size:10px;font-weight:900;border:1px solid #fff5;transform:rotate(var(--a)) translateY(-91px) rotate(calc(var(--a)*-1))}
      #copaWheelCenter{position:relative;z-index:3;width:82px;height:82px;border-radius:50%;background:#06140d;border:3px solid #d4af37;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 0 4px #0d3020;color:#fff;text-align:center}
      #copaWheelCenter small{font-size:9px;color:#b8cabb;text-transform:uppercase;font-weight:800}#copaWheelResult{font-size:34px;line-height:1;color:#f1d16b;font-weight:900;margin-top:3px}
      #copaGameRoulette .spin{width:100%;border:0;border-radius:11px;background:#d4af37;color:#07150d;padding:11px 12px;font-weight:900;font-size:14px;box-shadow:0 4px 12px #0005}
      #copaGameRoulette .spin:disabled{opacity:.6}#copaGameRoulette .reset{margin-top:7px;border:1px solid #5b765f;border-radius:9px;background:#153d28;color:#fff;padding:8px 10px;font-weight:800;font-size:11px;width:100%}
      #copaGameRoulette .drawn{margin-top:9px;width:100%;font-size:10px;color:#a9b9ad;line-height:1.35;text-align:center;min-height:27px}
      @media(max-width:820px){#copaRoundsTop{grid-template-columns:1fr}#copaGameRoulette{max-width:420px;width:100%;margin:0 auto}#copaWheelWrap{width:218px;height:218px}#copaWheel .n{transform:rotate(var(--a)) translateY(-87px) rotate(calc(var(--a)*-1))}}
    `;document.head.appendChild(style);
    const wrap=document.createElement('div');wrap.id='copaRoundsTop';banner.parentNode.insertBefore(wrap,banner);wrap.appendChild(banner);
    const box=document.createElement('aside');box.id='copaGameRoulette';
    box.innerHTML='<h3>🎯 Roleta dos Jogos</h3><div class="sub">Sorteie de 1 a 18 qual jogo será realizado</div><div id="copaWheelWrap"><div id="copaWheel"></div><div id="copaWheelCenter"><small>JOGO</small><div id="copaWheelResult">—</div></div></div><button class="spin" id="copaSpinGame">GIRAR ROLETA</button><button class="reset" id="copaResetGames">↻ REINICIAR 1–18</button><div class="drawn" id="copaDrawnGames"></div>';
    wrap.appendChild(box);
    const wheel=box.querySelector('#copaWheel');
    for(let i=1;i<=18;i++){const n=document.createElement('span');n.className='n';n.textContent=i;n.style.setProperty('--a',((i-1)*20)+'deg');wheel.appendChild(n)}
    let rotation=0;
    function render(){const {s}=rouletteState();box.querySelector('#copaDrawnGames').textContent=s.drawn.length?'Já sorteados: '+s.drawn.join(', '):'Nenhum jogo sorteado ainda.'}
    function reset(){const {key}=rouletteState();localStorage.setItem(key,JSON.stringify({remaining:Array.from({length:18},(_,i)=>i+1),drawn:[]}));box.querySelector('#copaWheelResult').textContent='—';render()}
    box.querySelector('#copaSpinGame').onclick=()=>{
      const {key,s}=rouletteState();if(!s.remaining.length){alert('Os 18 jogos já foram sorteados. Toque em REINICIAR 1–18 para começar outra sequência.');return}
      const btn=box.querySelector('#copaSpinGame');btn.disabled=true;
      const idx=secureIndex(s.remaining.length),num=s.remaining.splice(idx,1)[0];s.drawn.push(num);localStorage.setItem(key,JSON.stringify(s));
      rotation+=1080+((18-num)*20)+secureIndex(18)*360;wheel.style.transform='rotate('+rotation+'deg)';
      setTimeout(()=>{box.querySelector('#copaWheelResult').textContent=num;render();btn.disabled=false},1150)
    };
    box.querySelector('#copaResetGames').onclick=()=>{if(confirm('Reiniciar a roleta e liberar novamente os números de 1 a 18?'))reset()};
    render();
  }
  function injectGalleryQuick(){
    if(!path().startsWith('/galeria')||document.getElementById('copaGalleryQuick'))return;
    const style=document.createElement('style');style.id='copaGalleryQuickStyle';style.textContent=`
      #copaGalleryQuick{position:sticky;top:0;z-index:2147482000;background:rgba(5,29,18,.97);border-bottom:1px solid #8f7830;box-shadow:0 5px 18px #0006;padding:9px 10px;font-family:Arial,sans-serif}
      #copaGalleryQuick .title{max-width:1180px;margin:0 auto 7px;color:#f1d16b;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      #copaGalleryQuick .links{max-width:1180px;margin:auto;display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
      #copaGalleryQuick button{flex:0 0 auto;border:1px solid #597360;border-radius:999px;background:#0d3020;color:#fff;padding:9px 12px;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer}
      #copaGalleryQuick button:active{transform:scale(.97)}#copaGalleryQuick button.active{background:#d4af37;color:#07150d;border-color:#d4af37}
      #galeria,#ranking,#estatisticas,#jejum,#fed-champions-extra{scroll-margin-top:92px}
    `;document.head.appendChild(style);
    const bar=document.createElement('div');bar.id='copaGalleryQuick';const links=[['galeria','👑 Campeões'],['ranking','🥇 Ranking'],['estatisticas','📊 Gráficos'],['jejum','⏳ Jejum'],['fed-champions-extra','🌐 Federações']];
    bar.innerHTML='<div class="title">Acesso rápido à Galeria</div><div class="links">'+links.map(([id,l])=>`<button type="button" data-target="${id}">${l}</button>`).join('')+'</div>';document.body.insertBefore(bar,document.body.firstChild);
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const target=document.getElementById(b.dataset.target);if(!target)return;bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));target.scrollIntoView({behavior:'smooth',block:'start'})}));
  }
  ready(()=>{fixHomeDashboard();injectMainNav();injectCopaRoulette();injectGalleryQuick()});
})();
