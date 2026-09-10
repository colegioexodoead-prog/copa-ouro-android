(function(){
'use strict';
const ROULETTE_KEY='copaOuroGameRouletteV135';
const path=(location.pathname||'').toLowerCase();
function readJSON(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function activeProfile(){try{return window.CopaProfiles?CopaProfiles.active()||'default':'default'}catch(e){return 'default'}}
function backupEliminationBeforeRenew(){
  const raw=localStorage.getItem('elimCopaOuro');
  if(!raw)return;
  try{
    const st=JSON.parse(raw);const hasData=(st.teams||[]).length||Object.keys(st.slots||{}).length||Object.keys(st.fedMatches||{}).length||Object.keys(st?.chance?.games||{}).length;
    if(!hasData)return;
    localStorage.setItem('copaElimPreRenewBackupV137:'+activeProfile(),JSON.stringify({savedAt:new Date().toISOString(),profile:activeProfile(),data:st}));
  }catch(e){console.warn('Backup preventivo das Eliminatórias não criado',e)}
}
function resetCupRoulette(){
  localStorage.setItem(ROULETTE_KEY,JSON.stringify({remaining:Array.from({length:18},(_,i)=>i+1),drawn:[]}));
}
function installCupProtection(){
  if(!path.includes('/copa/'))return;
  const original=window.finishAndStartNewCup;
  if(typeof original!=='function'||original.__v137)return;
  const wrapped=function(){
    const before=readJSON('copaOuroV3',{});const hadCup=Array.isArray(before.teams)&&before.teams.length===36;
    if(hadCup)backupEliminationBeforeRenew();
    const result=original.apply(this,arguments);
    const after=readJSON('copaOuroV3',{});
    if(hadCup&&Array.isArray(after.teams)&&after.teams.length===0){
      resetCupRoulette();
      localStorage.setItem('copaLastRenewV137',JSON.stringify({at:new Date().toISOString(),rouletteReset:true,elimBackup:true}));
    }
    return result;
  };
  wrapped.__v137=true;window.finishAndStartNewCup=wrapped;
}
function reservedMatchSlots(st,fed){
  const set=new Set();
  ((st&&st.fedMatches&&st.fedMatches[fed])||[]).forEach(m=>{const n=Number(m&&m.slot);if(n)set.add(n)});
  return set;
}
function installSafeDirectRegistration(){
  if(!path.includes('/eliminatorias/'))return;
  const original=window.addTeam;
  if(typeof original==='function'&&!original.__v137){
    const wrapped=async function(){
      const fed=document.getElementById('teamFed')?.value||'';
      const status=document.getElementById('teamStatus')?.value||'normal';
      if(status!=='direct')return original.apply(this,arguments);
      const current=readJSON('elimCopaOuro',{slots:{},fedMatches:{}});
      const reserved=reservedMatchSlots(current,fed);
      const snapshot=localStorage.getItem('elimCopaOuro');
      const temp=JSON.parse(JSON.stringify(current));temp.slots=temp.slots||{};
      reserved.forEach(n=>{if(!temp.slots[n])temp.slots[n]='__reserved_v137__'+n});
      localStorage.setItem('elimCopaOuro',JSON.stringify(temp));
      try{return await original.apply(this,arguments)}finally{
        const now=readJSON('elimCopaOuro',{});
        const hasSentinel=Object.values(now.slots||{}).some(v=>String(v).startsWith('__reserved_v137__'));
        if(hasSentinel&&snapshot!=null)localStorage.setItem('elimCopaOuro',snapshot);
      }
    };
    wrapped.__v137=true;window.addTeam=wrapped;
  }
  if(typeof window.correctDirectSlot==='function'&&!window.correctDirectSlot.__v137){
    const safe=function(id){
      try{
        const t=byId(id);if(!t)return;
        const allowed=fedSlots(t.fed);let old=null;for(const k in state.slots)if(state.slots[k]==id){old=Number(k);break}
        const reserved=reservedMatchSlots(state,t.fed);
        const free=allowed.filter(n=>!reserved.has(Number(n))||Number(n)===Number(old));
        const value=prompt('Corrigir a vaga garantida de '+t.name+' ('+free.join(', ')+'):',old||'');if(value===null)return;
        const n=parseInt(value);
        if(!allowed.includes(n))return alert('Essa vaga não pertence à federação '+t.fed+'.');
        if(reserved.has(n)&&n!==old)return alert('A Vaga '+n+' já está reservada para um confronto desta federação. Escolha outra vaga.');
        if(state.slots[n]&&state.slots[n]!=id)return alert('Essa vaga já está ocupada.');
        if(old)delete state.slots[old];state.slots[n]=id;save();
      }catch(e){console.warn(e);alert('Não foi possível corrigir a vaga agora. Tente novamente.')}
    };
    safe.__v137=true;window.correctDirectSlot=safe;
  }
  const cadastro=document.getElementById('cadastro');
  if(cadastro&&!document.getElementById('stableV137Notice')){
    const note=document.createElement('div');note.id='stableV137Notice';note.className='notice';note.style.marginBottom='12px';
    note.innerHTML='<b>🛡️ Proteção v1.3.7:</b> vagas já ligadas a confrontos ficam reservadas e não podem ser ocupadas por um novo classificado direto.';
    cadastro.insertBefore(note,cadastro.firstChild);
  }
}
function install(){installCupProtection();installSafeDirectRegistration()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
