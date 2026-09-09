(function(){
  const COMMON=['elimCopaOuro','copaOuroQualified','copaOuroV3','copaOuroTeamDraft','copaOuroHistory','copa-ouro-edicoes-v1','copaOuroMercadoV2','copaOuroTeamCountryMapV1'];
  const RESERVED=['copaProfile:','copaProfileUpdatedAt:','copaKnownDataKeysV13','copaOuroSeedPedroV13','copaOuroAppVersion','copaOuroOnlineSyncEnabled','copaLoginHashV131:','copaRememberV132:','copaSavedPasswordV132:'];
  const rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;
  function active(){return sessionStorage.getItem('copaActiveProfile')||''}
  function pname(){return sessionStorage.getItem('copaActiveProfileName')||''}
  function isData(k){return !!k&&!RESERVED.some(x=>k===x||k.startsWith(x))}
  function known(){let a=[];try{a=JSON.parse(localStorage.getItem('copaKnownDataKeysV13')||'[]')}catch(e){};for(const k of COMMON)if(!a.includes(k))a.push(k);return a}
  function saveKnown(a){rawSet.call(localStorage,'copaKnownDataKeysV13',JSON.stringify([...new Set(a)]))}
  function touch(id){rawSet.call(localStorage,'copaProfileUpdatedAt:'+id,String(Date.now()))}
  Storage.prototype.setItem=function(k,v){
    rawSet.call(this,k,v);
    if(this===localStorage&&active()&&isData(k)){
      const id=active();rawSet.call(localStorage,'copaProfile:'+id+':'+k,String(v));
      const a=known();if(!a.includes(k)){a.push(k);saveKnown(a)}touch(id);
    }
  };
  Storage.prototype.removeItem=function(k){
    rawRemove.call(this,k);
    if(this===localStorage&&active()&&isData(k)){const id=active();rawRemove.call(localStorage,'copaProfile:'+id+':'+k);touch(id)}
  };
  function clearLive(){for(const k of known())rawRemove.call(localStorage,k)}
  function restore(id){clearLive();for(const k of known()){const v=localStorage.getItem('copaProfile:'+id+':'+k);if(v!=null)rawSet.call(localStorage,k,v)}}
  function activate(id,name){sessionStorage.setItem('copaActiveProfile',id);sessionStorage.setItem('copaActiveProfileName',name);restore(id)}
  function logout(){clearLive();sessionStorage.removeItem('copaActiveProfile');sessionStorage.removeItem('copaActiveProfileName');location.href='/'}
  function collect(id){const data={};for(const k of known()){const v=localStorage.getItem('copaProfile:'+id+':'+k);if(v!=null)data[k]=v}return data}
  function apply(id,data,when){
    clearLive();for(const k of known())rawRemove.call(localStorage,'copaProfile:'+id+':'+k);
    let a=known();for(const [k,v] of Object.entries(data||{})){if(v!=null){rawSet.call(localStorage,'copaProfile:'+id+':'+k,String(v));if(!a.includes(k))a.push(k)}}
    saveKnown(a);rawSet.call(localStorage,'copaProfileUpdatedAt:'+id,String(when||Date.now()));restore(id)
  }
  function backup(){
    const id=active();if(!id)return;
    const payload={backupVersion:3,createdAt:new Date().toISOString(),profile:id,profileName:pname(),data:collect(id)};
    const fn='copa-ouro-backup-'+id+'-'+new Date().toISOString().slice(0,10)+'.json';
    if(window.AndroidBridge&&AndroidBridge.saveTextFile)AndroidBridge.saveTextFile(fn,JSON.stringify(payload,null,2));
  }
  function loadFile(){
    const id=active();if(!id)return;const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
    inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);const d=j.data||(j.local||j.remote);if(!d||typeof d!=='object')throw 0;apply(id,d,Date.now());alert('Backup carregado para '+pname()+'.');location.reload()}catch(e){alert('Arquivo de backup inválido.')}};r.readAsText(f)};inp.click()
  }
  function toolbar(){
    if(!active()||document.getElementById('copaUserMenu'))return;
    const root=document.createElement('div');root.id='copaUserMenu';
    root.innerHTML='<div id="copaMenuPanel"><div class="copaMenuWho">👤 '+pname()+'</div><button id="copaBk">💾 Salvar backup</button><button id="copaLd">📂 Carregar backup</button><button id="copaHome">🏠 Início</button><button id="copaOut">🚪 Sair</button></div><button id="copaMenuToggle" aria-label="Abrir menu">☰</button>';
    root.style.cssText='position:fixed;z-index:2147483647;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none';
    const panel=root.querySelector('#copaMenuPanel');
    panel.style.cssText='display:none;min-width:188px;background:#07150df5;border:1px solid #b7952f;border-radius:14px;padding:9px;box-shadow:0 5px 18px #0009;pointer-events:auto';
    const who=panel.querySelector('.copaMenuWho');who.style.cssText='padding:6px 8px 9px;color:#f1d16b;font-size:12px;font-weight:700;text-align:center;border-bottom:1px solid #385342;margin-bottom:5px';
    panel.querySelectorAll('button').forEach(x=>x.style.cssText='display:block;width:100%;border:0;border-radius:9px;padding:9px 10px;margin:5px 0;background:#d4af37;color:#07150d;font-weight:800;text-align:left;font-size:12px');
    const toggle=root.querySelector('#copaMenuToggle');toggle.style.cssText='width:46px;height:46px;border:1px solid #d4af37;border-radius:50%;background:#0b2518;color:#f1d16b;font-size:22px;font-weight:800;box-shadow:0 4px 14px #0008;pointer-events:auto';
    document.body.appendChild(root);
    let open=false;
    function setOpen(v){open=v;panel.style.display=open?'block':'none';toggle.textContent=open?'×':'☰';toggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')}
    toggle.onclick=()=>setOpen(!open);
    root.querySelector('#copaBk').onclick=()=>{setOpen(false);backup()};
    root.querySelector('#copaLd').onclick=()=>{setOpen(false);loadFile()};
    root.querySelector('#copaHome').onclick=()=>{setOpen(false);location.href='/'};
    root.querySelector('#copaOut').onclick=()=>{setOpen(false);logout()};
    document.addEventListener('click',e=>{if(open&&!root.contains(e.target))setOpen(false)});
  }
  if(active())restore(active());
  window.CopaProfiles={active,pname,activate,logout,collect,apply,backup,loadFile,restore,known};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',toolbar);else toolbar();
})();
