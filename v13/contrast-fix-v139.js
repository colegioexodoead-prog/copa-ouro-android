(function(){
'use strict';
const VERSION='1.3.9';
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
function route(){const p=location.pathname.replace(/\/+$/,'')||'/';if(p.startsWith('/mercado'))return'mercado';if(p.startsWith('/galeria'))return'galeria';if(p.startsWith('/copa'))return'copa';if(p.startsWith('/eliminatorias'))return'eliminatorias';return'home'}
function installCss(){
  if(document.getElementById('copaContrastV139'))return;
  const s=document.createElement('style');s.id='copaContrastV139';s.textContent=`
    /* v1.3.9: preserva o acabamento premium apenas na navegação e respeita o contraste nativo de cada módulo. */
    body.copa-v138.co-v139-mercado{background:var(--paper,#f4f1e9)!important;color:var(--ink,#10251c)!important}
    body.copa-v138.co-v139-mercado input,
    body.copa-v138.co-v139-mercado select,
    body.copa-v138.co-v139-mercado textarea{background:#fbfaf7!important;color:var(--ink,#10251c)!important;border-color:#d8d5cc!important}
    body.copa-v138.co-v139-mercado .panel,
    body.copa-v138.co-v139-mercado .stats article,
    body.copa-v138.co-v139-mercado .teams article,
    body.copa-v138.co-v139-mercado .rules-page,
    body.copa-v138.co-v139-mercado .search-results article,
    body.copa-v138.co-v139-mercado .transfer-player-list article,
    body.copa-v138.co-v139-mercado .quick-player-grid>button{color:var(--ink,#10251c)!important}
    body.copa-v138.co-v139-mercado .club h3,
    body.copa-v138.co-v139-mercado .teams h3,
    body.copa-v138.co-v139-mercado .player div>b,
    body.copa-v138.co-v139-mercado .move b,
    body.copa-v138.co-v139-mercado .transfer-team-title h3,
    body.copa-v138.co-v139-mercado .search-results h3,
    body.copa-v138.co-v139-mercado .quick-player-grid b{color:var(--ink,#10251c)!important}
    body.copa-v138.co-v139-mercado .shell>aside,
    body.copa-v138.co-v139-mercado .shell>aside h1,
    body.copa-v138.co-v139-mercado .shell>aside h2,
    body.copa-v138.co-v139-mercado .shell>aside h3{color:#fff!important}

    body.copa-v138.co-v139-galeria{background:var(--cream,#f4f0e4)!important;color:var(--ink,#142018)!important}
    body.copa-v138.co-v139-galeria input,
    body.copa-v138.co-v139-galeria select,
    body.copa-v138.co-v139-galeria textarea{background:#fff!important;color:var(--ink,#142018)!important;border-color:#d7dad3!important}
    body.copa-v138.co-v139-galeria .gallery,
    body.copa-v138.co-v139-galeria .cards article,
    body.copa-v138.co-v139-galeria .winner,
    body.copa-v138.co-v139-galeria .runner,
    body.copa-v138.co-v139-galeria .analytics,
    body.copa-v138.co-v139-galeria .chartPanel,
    body.copa-v138.co-v139-galeria .drought,
    body.copa-v138.co-v139-galeria .droughtList article,
    body.copa-v138.co-v139-galeria .modal{color:var(--ink,#142018)!important}
    body.copa-v138.co-v139-galeria .winner h3,
    body.copa-v138.co-v139-galeria .barRow>strong,
    body.copa-v138.co-v139-galeria .droughtList article>div strong{color:var(--ink,#142018)!important}
    body.copa-v138.co-v139-galeria .hero,
    body.copa-v138.co-v139-galeria .topbar,
    body.copa-v138.co-v139-galeria .ranking,
    body.copa-v138.co-v139-galeria .rankPanel,
    body.copa-v138.co-v139-galeria .rankPanel h3,
    body.copa-v138.co-v139-galeria #fed-champions-extra .fed-team,
    body.copa-v138.co-v139-galeria #fed-champions-extra .fed-team h3,
    body.copa-v138.co-v139-galeria #fed-champions-extra .fed-badge{color:#fff!important}
    body.copa-v138.co-v139-galeria .rankPanel .rankList>div>span>strong{color:#fff!important}
    body.copa-v138.co-v139-galeria .cards article>header{color:#fff!important}

    body.copa-v138.co-v139-copa{color:var(--text,#f4f7f4)!important}
    body.copa-v138.co-v139-eliminatorias{color:#f1f6f2!important}

    /* Barra premium sempre legível, independentemente das cores internas dos módulos. */
    body.copa-v138 #v138ModuleBar,
    body.copa-v138 #copaMainNav{color:#f7f5ea!important}
  `;document.head.appendChild(s)
}
function mark(){
  const r=route();document.body.classList.add('co-v139-'+r);
  const sub=document.querySelector('#v138ModuleBar .titles small');if(sub)sub.textContent=sub.textContent.replace(/v1\.3\.8\b/g,'v'+VERSION);
  document.querySelectorAll('.v138-foot').forEach(e=>e.textContent=e.textContent.replace(/1\.3\.8/g,VERSION));
}
ready(()=>{installCss();mark()});
})();
