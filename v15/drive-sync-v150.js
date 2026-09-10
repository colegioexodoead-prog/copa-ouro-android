(function(){
'use strict';
const B=window.AndroidBridge;let cache='',pendingRaw='',ready=false,busy=false,checking=false,reason='startup',conflictShown=false,lastPoll=0;
function id(){return window.CopaProfiles?CopaProfiles.active():''}
function supported(){return id()==='pedro'}
function baseKey(){return 'copaDriveBaseV150:'+id()}
function pauseKey(){return 'copaDrivePausedV150:'+id()}
function conflictKey(){return 'copaDriveConflictV150:'+id()}
function status(t,ok=true){let e=document.getElementById('cloudStatus')||document.getElementById('saveStatus')||document.getElementById('saved');if(e){e.textContent=(ok?'☁️ ':'⚠️ ')+t;e.style.display='block'}}
function decode(b){const a=Uint8Array.from(atob(b||''),c=>c.charCodeAt(0));return new TextDecoder().decode(a)}
function snapshot(){const p=id();if(!p||!window.CopaProfiles)return '';return JSON.stringify({version:150,storage:'google-drive',profile:p,updatedAt:Number(localStorage.getItem('copaProfileUpdatedAt:'+p)||0),data:CopaProfiles.collect(p)})}
function base(){return Number(localStorage.getItem(baseKey())||0)}
function setBase(v){localStorage.setItem(baseKey(),String(Number(v)||0))}
function setPaused(v){if(v)localStorage.setItem(pauseKey(),'1');else localStorage.removeItem(pauseKey())}
function label(){try{return B&&B.driveLabel?B.driveLabel():'Copa-Ouro-Nuvem.json'}catch(e){return 'Copa-Ouro-Nuvem.json'}}
function connected(){try{return !!(B&&B.driveHasFile&&B.driveHasFile())}catch(e){return false}}
function doPut(raw){if(!B||!supported()||!connected()||busy)return;busy=true;pendingRaw=raw;B.drivePut(raw)}
function requestGet(why){if(!B||!supported()||!connected()||checking)return;reason=why||'startup';checking=true;lastPoll=Date.now();B.driveGet()}
function put(){
  if(!B||!supported()||!connected())return;
  if(localStorage.getItem(pauseKey())==='1'){status('Google Drive pausado por conflito de dados',false);return}
  const s=snapshot();if(!s||s===cache||busy)return;
  requestGet('before-put');
}
function get(){
  if(!B||!id())return;
  if(!supported()){ready=true;status('Google Drive automático disponível no perfil Pedro Henrique',false);return}
  if(!connected()){ready=true;status('Salvo no aparelho • conecte o Google Drive',false);return}
  ready=false;requestGet('startup');
}
function applyRemote(remote,raw){
  const ts=Number(remote.updatedAt||Date.now());
  CopaProfiles.apply(id(),remote.data||{},ts);setBase(ts);cache='';pendingRaw='';setPaused(false);localStorage.removeItem(conflictKey());status('Dados carregados do Google Drive');setTimeout(()=>location.reload(),180)
}
function closeModal(root){if(root)root.remove();conflictShown=false}
function conflictModal(remote,remoteRaw,local,localRaw){
  const payload={savedAt:new Date().toISOString(),profile:id(),remote,local};localStorage.setItem(conflictKey(),JSON.stringify(payload));setPaused(true);ready=true;
  status('Conflito no Google Drive • nenhum dado foi sobrescrito',false);
  if(conflictShown||document.getElementById('copaDriveConflict150'))return;conflictShown=true;
  const show=()=>{
    if(document.getElementById('copaDriveConflict150'))return;
    const root=document.createElement('div');root.id='copaDriveConflict150';root.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:grid;place-items:center;padding:18px;font-family:Arial,sans-serif';
    const localDate=new Date(Number(local.updatedAt||0)).toLocaleString('pt-BR');const remoteDate=new Date(Number(remote.updatedAt||0)).toLocaleString('pt-BR');
    root.innerHTML='<div style="max-width:520px;background:#07150d;color:#fff;border:1px solid #d4af37;border-radius:18px;padding:18px;box-shadow:0 14px 40px #000"><h2 style="margin:0 0 10px;color:#f1d16b">⚠️ Conflito de sincronização</h2><p>Existem alterações neste aparelho e também no arquivo do Google Drive. <b>Nada foi sobrescrito.</b></p><p style="font-size:13px;color:#c8d5cb">Este aparelho: '+localDate+'<br>Google Drive: '+remoteDate+'</p><div style="display:grid;gap:8px;margin-top:14px"><button id="useRemote150" style="padding:12px;border:0;border-radius:10px;background:#d4af37;color:#07150d;font-weight:900">USAR DADOS DO GOOGLE DRIVE</button><button id="useLocal150" style="padding:12px;border:1px solid #d4af37;border-radius:10px;background:#153d28;color:#fff;font-weight:900">MANTER ESTE APARELHO</button><button id="later150" style="padding:10px;border:0;border-radius:10px;background:#26372d;color:#fff;font-weight:800">DECIDIR DEPOIS</button></div><p style="font-size:11px;color:#9fb0a3;margin:12px 0 0">Se tiver dúvida, escolha “Decidir depois” e salve um backup manual antes.</p></div>';
    document.body.appendChild(root);
    root.querySelector('#useRemote150').onclick=()=>applyRemote(remote,remoteRaw);
    root.querySelector('#useLocal150').onclick=()=>{setBase(Number(remote.updatedAt||0));setPaused(false);localStorage.removeItem(conflictKey());closeModal(root);doPut(localRaw)};
    root.querySelector('#later150').onclick=()=>closeModal(root);
  };
  if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});
}
function connectionModal(){
  if(document.getElementById('copaDriveConnect150'))return;
  const root=document.createElement('div');root.id='copaDriveConnect150';root.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:grid;place-items:center;padding:18px;font-family:Arial,sans-serif';
  const has=connected();
  root.innerHTML='<div style="max-width:520px;width:100%;background:#07150d;color:#fff;border:1px solid #d4af37;border-radius:18px;padding:18px;box-shadow:0 14px 40px #000"><h2 style="margin:0 0 8px;color:#f1d16b">☁️ Google Drive</h2>'+
    (has?'<p>Arquivo conectado: <b>'+label()+'</b></p><p style="font-size:12px;color:#b8c8bd">O salvamento automático está ligado a este arquivo no Drive.</p><div style="display:grid;gap:8px"><button id="sync150" style="padding:12px;border:0;border-radius:10px;background:#d4af37;color:#07150d;font-weight:900">SINCRONIZAR AGORA</button><button id="open150" style="padding:12px;border:1px solid #d4af37;border-radius:10px;background:#153d28;color:#fff;font-weight:900">USAR OUTRO ARQUIVO EXISTENTE</button><button id="new150" style="padding:12px;border:1px solid #536e5b;border-radius:10px;background:#0c2b1d;color:#fff;font-weight:900">CRIAR NOVO ARQUIVO</button><button id="disc150" style="padding:10px;border:0;border-radius:10px;background:#472525;color:#fff;font-weight:800">DESCONECTAR DRIVE</button></div>':'<p>Escolha como ligar a Copa Ouro ao seu Google Drive. O Android abrirá o seletor de arquivos da conta Google já conectada ao aparelho.</p><div style="display:grid;gap:8px"><button id="new150" style="padding:12px;border:0;border-radius:10px;background:#d4af37;color:#07150d;font-weight:900">CRIAR COPA-OURO-NUVEM.JSON NO DRIVE</button><button id="open150" style="padding:12px;border:1px solid #d4af37;border-radius:10px;background:#153d28;color:#fff;font-weight:900">CONECTAR ARQUIVO EXISTENTE</button></div><p style="font-size:11px;color:#9fb0a3;margin:12px 0 0">No primeiro celular, use “Criar”. Em outro celular, use “Conectar arquivo existente” e escolha o mesmo arquivo no Google Drive.</p>')+
    '<button id="close150" style="margin-top:10px;width:100%;padding:9px;border:0;border-radius:9px;background:#26372d;color:#fff;font-weight:800">FECHAR</button></div>';
  document.body.appendChild(root);
  const newBtn=root.querySelector('#new150'),openBtn=root.querySelector('#open150'),closeBtn=root.querySelector('#close150'),syncBtn=root.querySelector('#sync150'),discBtn=root.querySelector('#disc150');
  if(newBtn)newBtn.onclick=()=>{root.remove();B.driveCreate()};
  if(openBtn)openBtn.onclick=()=>{root.remove();B.driveOpen()};
  if(closeBtn)closeBtn.onclick=()=>root.remove();
  if(syncBtn)syncBtn.onclick=()=>{root.remove();requestGet('manual')};
  if(discBtn)discBtn.onclick=()=>{if(confirm('Desconectar o Google Drive deste aparelho? Os dados locais da Copa não serão apagados.')){root.remove();B.driveDisconnect()}};
}
window.CopaDriveConnectResult=function(ok,lab,created){
  if(!ok){ready=true;if(lab!=='CANCELADO')status('Não foi possível conectar ao Google Drive',false);return}
  cache='';setBase(0);setPaused(false);localStorage.removeItem(conflictKey());status('Google Drive conectado • '+(lab||label()));
  if(created){ready=true;setTimeout(()=>doPut(snapshot()),180)}else{ready=false;setTimeout(()=>requestGet('startup'),180)}
};
window.CopaDriveGetResult=function(ok,data,lab){
  checking=false;
  if(!ok){ready=true;status('Google Drive indisponível agora • salvo no aparelho',false);return}
  try{
    const remoteRaw=decode(data);
    const localRaw=snapshot(),local=JSON.parse(localRaw);
    if(!remoteRaw||!remoteRaw.trim()){setBase(0);ready=true;doPut(localRaw);status('Google Drive conectado • preparando primeira cópia');return}
    const remote=JSON.parse(remoteRaw);
    if(remote.profile&&remote.profile!==id()){ready=true;status('Este arquivo do Drive pertence a outro perfil',false);return}
    const r=Number(remote.updatedAt||0),l=Number(local.updatedAt||0),b=base();
    if(remoteRaw===localRaw){cache=localRaw;setBase(Math.max(r,l));setPaused(false);ready=true;status('Google Drive automático ativo • '+(lab||label()));return}
    if(!b){if(r>l){applyRemote(remote,remoteRaw);return}if(l>r&&r>0){conflictModal(remote,remoteRaw,local,localRaw);return}cache=localRaw;setBase(r);ready=true;doPut(localRaw);return}
    const remoteChanged=r>b,localChanged=l>b;
    if(remoteChanged&&localChanged){conflictModal(remote,remoteRaw,local,localRaw);return}
    if(remoteChanged){applyRemote(remote,remoteRaw);return}
    if(localChanged){doPut(localRaw);return}
    cache=localRaw;ready=true;status('Google Drive automático ativo • '+(lab||label()));
  }catch(e){ready=true;status('Arquivo do Google Drive inválido • nenhum dado foi apagado',false)}
};
window.CopaDrivePutResult=function(ok,why){
  const sent=pendingRaw;pendingRaw='';busy=false;
  if(ok){cache=sent||cache;try{setBase(Number(JSON.parse(sent).updatedAt||Date.now()))}catch(e){}ready=true;status('Salvo automaticamente no Google Drive');setTimeout(()=>{if(snapshot()!==cache)put()},120)}
  else{ready=true;status('Sem acesso ao Google Drive agora • salvo no aparelho',false)}
};
window.CopaDriveDisconnected=function(){cache='';setBase(0);setPaused(false);ready=true;status('Google Drive desconectado • salvamento local ativo',false)};
window.CopaCloudManualConnect=connectionModal;
window.CopaDriveManualConnect=connectionModal;
setInterval(()=>{if(ready&&navigator.onLine)put()},2500);
setInterval(()=>{if(ready&&navigator.onLine&&connected()&&!busy&&!checking&&Date.now()-lastPoll>15000)requestGet('poll')},5000);
window.addEventListener('online',get);window.addEventListener('offline',()=>status('Sem internet • salvo no aparelho',false));
if(id())get();
})();
