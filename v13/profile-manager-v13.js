(function(){
  const COMMON=['elimCopaOuro','copaOuroQualified','copaOuroV3','copaOuroTeamDraft','copaOuroHistory','copa-ouro-edicoes-v1','copaOuroMercadoV2','copaOuroTeamCountryMapV1'];
  const RESERVED=['copaProfile:','copaProfileUpdatedAt:','copaKnownDataKeysV13','copaOuroSeedPedroV13','copaOuroAppVersion','copaOuroOnlineSyncEnabled'];
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
    inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);const d=j.data||(j.local||j.remote);if(!d||typeof d!=='object')throw 0;apply(id,d,Date.now());alert('Backup carregado para '+pname()+'.');location.reload()}catch(e){alert('Arquivo de backup invalido.')}};r.readAsText(f)};inp.click()
  }
  function toolbar(){
    if(!active()||document.getElementById('copaUserBar'))return;
    const b=document.createElement('div');b.id='copaUserBar';b.innerHTML='<span>👤 '+pname()+'</span><button id="copaBk">💾 Backup</button><button id="copaLd">📂 Carregar</button><button id="copaHome">🏠 Inicio</button><button id="copaOut">Sair</button>';
    b.style.cssText='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;background:#07150dee;border:1px solid #b7952f;border-radius:12px;padding:7px;color:#fff;font:12px Arial;box-shadow:0 3px 15px #0008';
    b.querySelectorAll('button').forEach(x=>x.style.cssText='border:0;border-radius:8px;padding:7px 9px;background:#d4af37;color:#07150d;font-weight:700');document.body.appendChild(b);
    b.querySelector('#copaBk').onclick=backup;b.querySelector('#copaLd').onclick=loadFile;b.querySelector('#copaHome').onclick=()=>location.href='/';b.querySelector('#copaOut').onclick=logout;
  }
  if(active())restore(active());
  window.CopaProfiles={active,pname,activate,logout,collect,apply,backup,loadFile,restore,known};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',toolbar);else toolbar();
})();
