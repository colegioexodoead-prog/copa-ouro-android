(function(){
'use strict';
const B=window.AndroidBridge;let cache='',ready=false,busy=false,checking=false,reason='startup',conflictShown=false;
function id(){return window.CopaProfiles?CopaProfiles.active():''}
function ckey(){return 'copaProfileStateV13_'+id()}
function baseKey(){return 'copaCloudBaseV137:'+id()}
function pauseKey(){return 'copaCloudPausedV137:'+id()}
function conflictKey(){return 'copaCloudConflictV137:'+id()}
function status(t,ok=true){let e=document.getElementById('cloudStatus')||document.getElementById('saveStatus')||document.getElementById('saved');if(e){e.textContent=(ok?'☁️ ':'⚠️ ')+t;e.style.display='block'}}
function decode(b){const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0));return new TextDecoder().decode(a)}
function snapshot(){const p=id();if(!p)return '';return JSON.stringify({version:137,profile:p,updatedAt:Number(localStorage.getItem('copaProfileUpdatedAt:'+p)||0),data:CopaProfiles.collect(p)})}
function base(){return Number(localStorage.getItem(baseKey())||0)}
function setBase(v){localStorage.setItem(baseKey(),String(Number(v)||0))}
function setPaused(v){if(v)localStorage.setItem(pauseKey(),'1');else localStorage.removeItem(pauseKey())}
function doPut(raw){if(!B||!id()||!B.cloudHasSession()||busy)return;busy=true;cache=raw;B.cloudPut(ckey(),raw)}
function requestGet(why){if(!B||!id()||checking)return;reason=why||'startup';checking=true;B.cloudGet()}
function put(){
  if(!B||!id()||!B.cloudHasSession())return;
  if(localStorage.getItem(pauseKey())==='1'){status('Sincronização pausada por conflito de dados',false);return}
  const s=snapshot();if(!s||s===cache||busy)return;
  requestGet('before-put');
}
function get(){
  if(!B||!id())return;
  if(!B.cloudHasSession()){ready=true;status('Salvo no aparelho • conecte a nuvem para sincronizar',false);return}
  ready=false;requestGet('startup');
}
function applyRemote(remote,raw){
  const ts=Number(remote.updatedAt||Date.now());
  CopaProfiles.apply(id(),remote.data||{},ts);setBase(ts);cache=raw;setPaused(false);localStorage.removeItem(conflictKey());status('Dados online carregados');setTimeout(()=>location.reload(),180)
}
function conflictModal(remote,remoteRaw,local,localRaw){
  const payload={savedAt:new Date().toISOString(),profile:id(),remote,local};localStorage.setItem(conflictKey(),JSON.stringify(payload));setPaused(true);ready=true;
  status('Conflito detectado • nenhum dado foi sobrescrito',false);
  if(conflictShown||document.getElementById('copaCloudConflict137'))return;conflictShown=true;
  const show=()=>{
    if(document.getElementById('copaCloudConflict137'))return;
    const root=document.createElement('div');root.id='copaCloudConflict137';root.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:grid;place-items:center;padding:18px;font-family:Arial,sans-serif';
    const localDate=new Date(Number(local.updatedAt||0)).toLocaleString('pt-BR');const remoteDate=new Date(Number(remote.updatedAt||0)).toLocaleString('pt-BR');
    root.innerHTML='<div style="max-width:520px;background:#07150d;color:#fff;border:1px solid #d4af37;border-radius:18px;padding:18px;box-shadow:0 14px 40px #000"><h2 style="margin:0 0 10px;color:#f1d16b">⚠️ Conflito de sincronização</h2><p>Existem alterações neste aparelho e também na nuvem. <b>Nada foi sobrescrito.</b></p><p style="font-size:13px;color:#c8d5cb">Este aparelho: '+localDate+'<br>Nuvem: '+remoteDate+'</p><div style="display:grid;gap:8px;margin-top:14px"><button id="useRemote137" style="padding:12px;border:0;border-radius:10px;background:#d4af37;color:#07150d;font-weight:900">USAR DADOS ONLINE</button><button id="useLocal137" style="padding:12px;border:1px solid #d4af37;border-radius:10px;background:#153d28;color:#fff;font-weight:900">MANTER ESTE APARELHO</button><button id="later137" style="padding:10px;border:0;border-radius:10px;background:#26372d;color:#fff;font-weight:800">DECIDIR DEPOIS</button></div><p style="font-size:11px;color:#9fb0a3;margin:12px 0 0">Se tiver dúvida, escolha “Decidir depois” e salve um backup antes.</p></div>';
    document.body.appendChild(root);
    root.querySelector('#useRemote137').onclick=()=>applyRemote(remote,remoteRaw);
    root.querySelector('#useLocal137').onclick=()=>{setBase(Number(remote.updatedAt||0));setPaused(false);localStorage.removeItem(conflictKey());root.remove();conflictShown=false;doPut(localRaw)};
    root.querySelector('#later137').onclick=()=>{root.remove();conflictShown=false};
  };
  if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});
}
window.CopaCloudLoginResult=function(ok){if(ok){status('Nuvem conectada');get()}else{ready=true;status('Senha da nuvem incorreta ou conexão indisponível',false)}};
window.CopaCloudGetResult=function(ok,data){
  checking=false;
  if(!ok){ready=true;status(data==='AUTH'?'Sessão da nuvem expirada':'Sem internet • salvando no aparelho',false);return}
  try{
    const all=JSON.parse(decode(data));const remoteRaw=all.states?all.states[ckey()]:null;const localRaw=snapshot();const local=JSON.parse(localRaw);
    if(!remoteRaw){setBase(0);ready=true;doPut(localRaw);status('Salvamento online automático ativo');return}
    const remote=JSON.parse(remoteRaw),r=Number(remote.updatedAt||0),l=Number(local.updatedAt||0),b=base();
    if(remoteRaw===localRaw){cache=remoteRaw;setBase(Math.max(r,l));setPaused(false);ready=true;status('Salvamento online automático ativo');return}
    if(!b){
      if(r>l){applyRemote(remote,remoteRaw);return}
      if(l>r){conflictModal(remote,remoteRaw,local,localRaw);return}
      cache=remoteRaw;setBase(r);ready=true;status('Salvamento online automático ativo');return
    }
    const remoteChanged=r>b,localChanged=l>b;
    if(remoteChanged&&localChanged){conflictModal(remote,remoteRaw,local,localRaw);return}
    if(remoteChanged){applyRemote(remote,remoteRaw);return}
    if(localChanged){doPut(localRaw);return}
    cache=remoteRaw;ready=true;status('Salvamento online automático ativo');
  }catch(e){ready=true;status('Erro ao ler dados online',false)}
};
window.CopaCloudPutResult=function(k,ok,why){
  busy=false;if(k!==ckey())return;
  if(ok){const s=snapshot();cache=s;try{setBase(Number(JSON.parse(s).updatedAt||Date.now()))}catch(e){}ready=true;status('Salvo online automaticamente')}
  else{ready=true;status(why==='AUTH'?'Sessão da nuvem expirada':'Sem internet • salvo no aparelho',false)}
};
window.CopaCloudManualConnect=function(){if(!B)return;const p=prompt('Digite a senha da nuvem Copa Ouro:');if(p)B.cloudLogin(p)};
setInterval(()=>{if(ready&&navigator.onLine)put()},2500);
window.addEventListener('online',get);window.addEventListener('offline',()=>status('Sem internet • salvo no aparelho',false));
if(id())get();
})();
