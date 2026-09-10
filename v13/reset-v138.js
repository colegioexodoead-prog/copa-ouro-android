(function(){
  const CURRENT_COPA_KEYS=[
    'copaOuroV3',
    'copaOuroTeamDraft',
    'copaOuroGameRouletteV135'
  ];

  function active(){return !!(window.CopaProfiles&&CopaProfiles.active&&CopaProfiles.active())}

  function addStyle(){
    if(document.getElementById('copaResetV138Style'))return;
    const s=document.createElement('style');
    s.id='copaResetV138Style';
    s.textContent=`
      .copa-reset-v138{border:1px solid #b99631!important;background:linear-gradient(160deg,#3a1710,#1d0d09)!important;color:#ffe9a5!important;box-shadow:0 8px 18px #0005!important}
      .copa-reset-v138 .ico{color:#f0c95a!important}
      #v138ResetCopaTop{border:1px solid #c09d37;background:#35150f;color:#ffe49a;border-radius:11px;padding:8px 10px;font-size:10px;font-weight:900;white-space:nowrap}
      #copaResetToast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:11px 14px;border-radius:12px;background:#07170f;color:#f5d56a;border:1px solid #9b7f2d;box-shadow:0 10px 28px #0009;font:800 12px Arial,sans-serif;text-align:center}
      @media(max-width:520px){#v138ResetCopaTop{font-size:0;padding:7px 9px}#v138ResetCopaTop:after{content:'ZERAR';font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function toast(msg){
    let t=document.getElementById('copaResetToast');
    if(!t){t=document.createElement('div');t.id='copaResetToast';document.body.appendChild(t)}
    t.textContent=msg;t.style.display='block';
    clearTimeout(window.__copaResetToastTimer);
    window.__copaResetToastTimer=setTimeout(()=>{t.style.display='none'},2600);
  }

  function resetCurrentCopa(){
    if(!active())return;
    const profile=(CopaProfiles.pname&&CopaProfiles.pname())||'perfil atual';
    const first=confirm(
      'ZERAR DADOS DA COPA?\n\n'+
      'Perfil: '+profile+'\n\n'+
      'Será apagada somente a Copa atual e a Roleta 1–18.\n'+
      'Serão MANTIDOS: Eliminatórias, classificados, Mercado, Galeria, campeões, usuários e senhas.\n\n'+
      'Antes de apagar, o aplicativo vai gerar um backup de segurança.\n\n'+
      'Deseja continuar?'
    );
    if(!first)return;

    try{CopaProfiles.backup()}catch(e){}

    const second=confirm(
      'ÚLTIMA CONFIRMAÇÃO\n\n'+
      'A Copa atual será zerada agora.\n'+
      'Use esta função depois de testes ou demonstrações.\n\n'+
      'Confirmar limpeza?'
    );
    if(!second){toast('Limpeza cancelada. Seus dados continuam intactos.');return}

    for(const key of CURRENT_COPA_KEYS){
      try{localStorage.removeItem(key)}catch(e){}
    }

    try{sessionStorage.removeItem('copaOuroGameRouletteV135')}catch(e){}
    toast('Copa atual zerada. Eliminatórias, Mercado e histórico foram mantidos.');
    setTimeout(()=>{location.href='/copa/'},650);
  }

  function addHomeButton(){
    const actions=document.querySelector('.v138-actions');
    if(!actions||document.getElementById('v138ResetCopa'))return;
    const b=document.createElement('button');
    b.id='v138ResetCopa';b.type='button';b.className='v138-action copa-reset-v138';
    b.innerHTML='<span class="ico">↺</span><b>Zerar Copa</b><small>Limpar dados de teste</small>';
    b.onclick=resetCurrentCopa;
    actions.appendChild(b);
  }

  function addCopaTopButton(){
    if(!location.pathname.startsWith('/copa'))return;
    const inner=document.querySelector('#v138ModuleBar .inner');
    if(!inner||document.getElementById('v138ResetCopaTop'))return;
    const b=document.createElement('button');
    b.id='v138ResetCopaTop';b.type='button';b.textContent='↺ ZERAR COPA';
    b.title='Zerar somente a Copa atual';b.onclick=resetCurrentCopa;
    const home=inner.querySelector('.home');
    if(home)inner.insertBefore(b,home);else inner.appendChild(b);
  }

  function addMenuButton(){
    const panel=document.getElementById('copaMenuPanel');
    if(!panel||document.getElementById('copaResetMenu'))return;
    const b=document.createElement('button');b.id='copaResetMenu';b.type='button';
    b.textContent='↺ Zerar dados da Copa';
    b.style.background='#3a1710';b.style.color='#ffe49a';b.style.border='1px solid #9b7f2d';
    b.onclick=resetCurrentCopa;
    const out=document.getElementById('copaOut');
    if(out)panel.insertBefore(b,out);else panel.appendChild(b);
  }

  function init(){
    if(!active())return;
    addStyle();addHomeButton();addCopaTopButton();addMenuButton();
    setTimeout(()=>{addHomeButton();addCopaTopButton();addMenuButton()},350);
  }

  window.CopaResetCurrentV138=resetCurrentCopa;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
