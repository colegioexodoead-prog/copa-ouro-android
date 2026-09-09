(function(){
  const B=window.AndroidBridge;let cache='',ready=false,busy=false;
  function id(){return window.CopaProfiles?CopaProfiles.active():''}
  function ckey(){return 'copaProfileStateV13_'+id()}
  function status(t,ok=true){let e=document.getElementById('cloudStatus')||document.getElementById('saveStatus')||document.getElementById('saved');if(e){e.textContent=(ok?'☁️ ':'⚠️ ')+t;e.style.display='block'}}
  function decode(b){const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0));return new TextDecoder().decode(a)}
  function snapshot(){const p=id();if(!p)return '';return JSON.stringify({version:13,profile:p,updatedAt:Number(localStorage.getItem('copaProfileUpdatedAt:'+p)||0),data:CopaProfiles.collect(p)})}
  function put(){if(!B||!id()||!B.cloudHasSession())return;const s=snapshot();if(!s||s===cache||busy)return;busy=true;B.cloudPut(ckey(),s)}
  function get(){if(!B||!id())return;if(!B.cloudHasSession()){ready=true;status('Salvo no aparelho • conecte a nuvem para sincronizar',false);return}ready=false;B.cloudGet()}
  window.CopaCloudLoginResult=function(ok){if(ok){status('Nuvem conectada');get()}else{ready=true;status('Senha da nuvem incorreta ou conexao indisponivel',false)}};
  window.CopaCloudGetResult=function(ok,data){
    if(!ok){ready=true;status(data==='AUTH'?'Sessao da nuvem expirada':'Sem internet • salvando no aparelho',false);return}
    try{
      const all=JSON.parse(decode(data));const remoteRaw=all.states?all.states[ckey()]:null;const localRaw=snapshot();
      if(!remoteRaw){cache='';ready=true;put();status('Salvamento online automatico ativo');return}
      const remote=JSON.parse(remoteRaw),local=JSON.parse(localRaw);
      if(Number(remote.updatedAt||0)>Number(local.updatedAt||0)){
        CopaProfiles.apply(id(),remote.data||{},Number(remote.updatedAt||Date.now()));
        cache=JSON.stringify({version:13,profile:id(),updatedAt:Number(remote.updatedAt||0),data:CopaProfiles.collect(id())});
        status('Dados online carregados');setTimeout(()=>location.reload(),180)
      }else{
        cache=remoteRaw;ready=true;if(localRaw!==remoteRaw)put();status('Salvamento online automatico ativo')
      }
    }catch(e){ready=true;status('Erro ao ler dados online',false)}
  };
  window.CopaCloudPutResult=function(k,ok,why){busy=false;if(k!==ckey())return;if(ok){cache=snapshot();status('Salvo online automaticamente')}else{status(why==='AUTH'?'Sessao da nuvem expirada':'Sem internet • salvo no aparelho',false)}};
  window.CopaCloudManualConnect=function(){if(!B)return;const p=prompt('Digite a senha da nuvem Copa Ouro:');if(p)B.cloudLogin(p)};
  setInterval(()=>{if(ready&&navigator.onLine)put()},2000);
  window.addEventListener('online',get);
  window.addEventListener('offline',()=>status('Sem internet • salvo no aparelho',false));
  if(id())get();
})();
