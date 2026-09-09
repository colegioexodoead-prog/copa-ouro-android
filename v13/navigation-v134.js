(function(){
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  function path(){return location.pathname.replace(/\/+$/,'')||'/'}
  function currentKey(){
    const p=path();
    if(p.startsWith('/copa'))return 'copa';
    if(p.startsWith('/mercado'))return 'mercado';
    if(p.startsWith('/galeria'))return 'galeria';
    if(p.startsWith('/eliminatorias'))return location.hash==='#roletaVagas'?'roleta':'eliminatorias';
    return '';
  }
  function openElimTabFromHash(){
    if(!path().startsWith('/eliminatorias'))return;
    const id=(location.hash||'').replace('#','');
    if(!id)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const el=document.getElementById(id);
      if(el&&typeof window.showTab==='function'){
        clearInterval(timer);
        try{window.showTab(id)}catch(e){}
      }else if(tries>20)clearInterval(timer);
    },60);
  }
  function go(item,e){
    if(e)e.preventDefault();
    if(item.key==='roleta'&&path().startsWith('/eliminatorias')){
      if(location.hash!=='#roletaVagas')history.replaceState(null,'','#roletaVagas');
      if(typeof window.showTab==='function')window.showTab('roletaVagas');
      highlight('roleta');
      return;
    }
    location.href=item.href;
  }
  const ITEMS=[
    {key:'copa',icon:'🏆',label:'Copa',href:'/copa/'},
    {key:'eliminatorias',icon:'⚽',label:'Eliminatórias',href:'/eliminatorias/'},
    {key:'mercado',icon:'🔄',label:'Mercado',href:'/mercado/'},
    {key:'roleta',icon:'🎯',label:'Roleta',href:'/eliminatorias/#roletaVagas'},
    {key:'galeria',icon:'👑',label:'Galeria',href:'/galeria/'}
  ];
  function highlight(key){document.querySelectorAll('#copaMainNav [data-key]').forEach(a=>a.classList.toggle('active',a.dataset.key===key))}
  function injectMainNav(){
    if(!window.CopaProfiles||!CopaProfiles.active()||path()==='/'||document.getElementById('copaMainNav'))return;
    const style=document.createElement('style');
    style.id='copaMainNavStyle';
    style.textContent=`
      body{padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))!important}
      #copaMainNav{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(4,21,11,.98);border-top:1px solid #8f7830;box-shadow:0 -6px 22px #0008;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));font-family:Arial,sans-serif}
      #copaMainNav .inner{max-width:760px;margin:auto;display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
      #copaMainNav a{min-width:0;min-height:55px;padding:6px 2px;border-radius:11px;color:#c8d5cb;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:800;line-height:1.05;border:1px solid transparent}
      #copaMainNav a .ico{font-size:20px;line-height:1}
      #copaMainNav a.active{background:#d4af37;color:#07150d;border-color:#f1d16b;box-shadow:0 0 0 1px #f1d16b inset}
      #copaMainNav a:active{transform:scale(.97)}
      #copaUserMenu{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}
      @media(min-width:900px){#copaMainNav{left:50%;right:auto;transform:translateX(-50%);width:720px;border:1px solid #8f7830;border-bottom:0;border-radius:16px 16px 0 0}#copaMainNav a{font-size:11px}}
    `;
    document.head.appendChild(style);
    const nav=document.createElement('nav');nav.id='copaMainNav';nav.setAttribute('aria-label','Navegação principal da Copa Ouro');
    nav.innerHTML='<div class="inner">'+ITEMS.map(i=>`<a href="${i.href}" data-key="${i.key}"><span class="ico">${i.icon}</span><span>${i.label}</span></a>`).join('')+'</div>';
    document.body.appendChild(nav);
    ITEMS.forEach(i=>{const a=nav.querySelector(`[data-key="${i.key}"]`);if(a)a.addEventListener('click',e=>go(i,e))});
    highlight(currentKey());
  }
  function injectGalleryQuick(){
    if(!path().startsWith('/galeria')||document.getElementById('copaGalleryQuick'))return;
    const style=document.createElement('style');style.id='copaGalleryQuickStyle';style.textContent=`
      #copaGalleryQuick{position:sticky;top:0;z-index:2147482000;background:rgba(5,29,18,.97);border-bottom:1px solid #8f7830;box-shadow:0 5px 18px #0006;padding:9px 10px;font-family:Arial,sans-serif}
      #copaGalleryQuick .title{max-width:1180px;margin:0 auto 7px;color:#f1d16b;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      #copaGalleryQuick .links{max-width:1180px;margin:auto;display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
      #copaGalleryQuick button{flex:0 0 auto;border:1px solid #597360;border-radius:999px;background:#0d3020;color:#fff;padding:9px 12px;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer}
      #copaGalleryQuick button:active{transform:scale(.97)}
      #copaGalleryQuick button.active{background:#d4af37;color:#07150d;border-color:#d4af37}
      #galeria,#ranking,#estatisticas,#jejum,#fed-champions-extra{scroll-margin-top:92px}
    `;document.head.appendChild(style);
    const bar=document.createElement('div');bar.id='copaGalleryQuick';
    const links=[['galeria','👑 Campeões'],['ranking','🥇 Ranking'],['estatisticas','📊 Gráficos'],['jejum','⏳ Jejum'],['fed-champions-extra','🌐 Federações']];
    bar.innerHTML='<div class="title">Acesso rápido à Galeria</div><div class="links">'+links.map(([id,l])=>`<button type="button" data-target="${id}">${l}</button>`).join('')+'</div>';
    document.body.insertBefore(bar,document.body.firstChild);
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      const target=document.getElementById(b.dataset.target);
      if(!target)return;
      bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }
  ready(()=>{openElimTabFromHash();injectMainNav();injectGalleryQuick()});
  window.addEventListener('hashchange',()=>{openElimTabFromHash();highlight(currentKey())});
})();
