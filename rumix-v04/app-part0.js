(()=>{
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const COLORS = ['red','blue','orange','black'];
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MODE_LABELS = {classic:'Clássico',words:'Letras',mixed:'Misto',mega:'MegaRumiX'};
const PLAY_KIND_LABELS = {online:'Online',solo:'Single Player',training:'Treino'};
const clientId = localStorage.rumixArenaClientId || (localStorage.rumixArenaClientId='p-'+rand(10));
let playKind='online', mode='classic';
let role=null, peer=null, hostConn=null, room='';
let state=null, snap=null, selected=[];
let conns = new Map();
let currentSort='value';

function rand(n=6){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a=new Uint32Array(n); crypto.getRandomValues(a); return [...a].map(x=>chars[x%chars.length]).join(''); }
function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setPlayKind(kind){ playKind=kind; $$('#playKinds .kind-card').forEach(b=>b.classList.toggle('active',b.dataset.kind===kind)); $('#onlineJoinBox').classList.toggle('hide',kind!=='online'); $('#onlineActions').classList.toggle('hide',kind!=='online'); $('#soloCpuBox').classList.toggle('hide',kind!=='solo'); $('#soloDiffBox').classList.toggle('hide',kind!=='solo'); $('#soloActions').classList.toggle('hide',kind!=='solo'); $('#trainingActions').classList.toggle('hide',kind!=='training'); clearNote($('#homeNotice')); }
function setMode(next){ mode=next; $$('#modes .mode-card').forEach(b=>b.classList.toggle('active',b.dataset.mode===next)); }
function name(){ return ($('#name').value.trim()||localStorage.rumixArenaName||'Jogador').slice(0,18); }
function saveName(){ localStorage.rumixArenaName=name(); }
function show(view){ ['home','lobby','game'].forEach(id => $('#'+id).classList.toggle('hide',id!==view)); }
function note(el,msg,type=''){ if(!el) return; el.textContent=msg; el.className='notice'+(type?' '+type:''); el.classList.remove('hide'); }
function clearNote(el){ if(el) el.classList.add('hide'); }
function toast(msg){ try{ AndroidApp.toast(msg); }catch(e){} }
function modeBase(m){ return m==='mega' ? 'mixed' : m; }
function isMegaMode(){ return mode==='mega' || state?.mode==='mega' || snap?.mode==='mega'; }

function init(){
  $('#name').value = localStorage.rumixArenaName || '';
  $('#hintsSetting').value = localStorage.rumixHints || 'on';
  $('#turnTime').value = localStorage.rumixTurnTime || '90';
  $('#hintsSetting').onchange = e=>{ localStorage.rumixHints=e.target.value; updateHintVisibility(); };
  $('#turnTime').onchange = e=>{ localStorage.rumixTurnTime=e.target.value; };
  $('#joinCode').oninput = e=> e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  $$('#playKinds .kind-card').forEach(btn=>btn.onclick=()=>setPlayKind(btn.dataset.kind));
  $$('#modes .mode-card').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.mode));
  $('#createBtn').onclick=createRoom;
  $('#joinBtn').onclick=()=>joinRoom($('#joinCode').value.trim().toUpperCase());
  $('#startSoloBtn').onclick=startSolo;
  $('#startTrainingBtn').onclick=startTraining;
  $('#shareBtn').onclick=shareInvite;
  $('#copyBtn').onclick=copyCode;
  $('#leaveBtn').onclick=()=>location.reload();
  $('#startBtn').onclick=()=>sendAction({type:'START'});
  $('#playBtn').onclick=()=>sendAction({type:'PLAY', ids:[...selected]});
  $('#undoBtn').onclick=()=>sendAction({type:'UNDO'});
  $('#drawBtn').onclick=()=>sendAction({type:'DRAW'});
  $('#endBtn').onclick=()=>sendAction({type:'END'});
  $('#sortValueBtn').onclick=()=>{ currentSort='value'; sortMyHand(); render(); };
  $('#sortColorBtn').onclick=()=>{ currentSort='color'; sortMyHand(); render(); };
  $('#hintBtn').onclick=showHint;
  $('#toggleHintsBtn').onclick=toggleHints;
  $('#resetTurnBtn').onclick=()=>sendAction({type:'RESET_TURN'});
  $('#newTrainingBtn').onclick=newTrainingHand;
  $('#clearTrainingBtn').onclick=clearTrainingTable;
  $('#megaCardBtn').onclick=()=>sendAction({type:'MEGA_REWARD', source:'card'});
  $('#megaSpinBtn').onclick=()=>sendAction({type:'MEGA_REWARD', source:'spin'});
  setPlayKind('online');
  setMode('classic');
  updateHintVisibility();
  setInterval(tickClock,500);
  window.RumiMixArena = { openInvite(code){ show('home'); setPlayKind('online'); $('#joinCode').value=String(code||'').toUpperCase(); note($('#homeNotice'),'Convite recebido para a sala '+$('#joinCode').value+'. Digite seu nome e toque em Entrar na sala.','ok'); } };
  const q = new URLSearchParams(location.search); if(q.get('room')) window.RumiMixArena.openInvite(q.get('room'));
}

function createRoom(){
  if(typeof Peer==='undefined'){ note($('#homeNotice'),'Serviço multiplayer indisponível. Verifique a internet.','error'); return; }
  saveName(); room=rand(6); role='host'; peer=new Peer('rumix-arena-'+room.toLowerCase()+'-host',{debug:1}); bindPeerErrors(peer,$('#homeNotice'));
  peer.on('open',()=>{ state=freshState({kind:'online', mode}); state.players.push(makePlayer({id:clientId, name:name(), isCpu:false})); showLobby(); broadcast(); });
  peer.on('connection',incomingConn);
}
function joinRoom(code){
  if(!/^[A-Z0-9]{4,8}$/.test(code)){ note($('#homeNotice'),'Digite um código de sala válido.','error'); return; }
  if(typeof Peer==='undefined'){ note($('#homeNotice'),'Serviço multiplayer indisponível. Verifique a internet.','error'); return; }
  saveName(); room=code; role='client'; peer=new Peer(undefined,{debug:1}); bindPeerErrors(peer,$('#homeNotice'));
  peer.on('open',()=>{ hostConn=peer.connect('rumix-arena-'+room.toLowerCase()+'-host',{reliable:true}); bindHostConn(hostConn); });
}
function bindPeerErrors(p, el){ p.on('error',e=>{ const m=e.type==='peer-unavailable' ? 'Sala não encontrada ou anfitrião desconectado.' : e.type==='network' ? 'Falha de rede. Confira a internet.' : 'Erro: '+(e.type||e.message); note(el,m,'error'); }); }
function bindHostConn(conn){
  conn.on('open',()=>{ conn.send({type:'JOIN', id:clientId, name:name()}); showLobby(); note($('#lobbyNotice'),'Conectado à sala.','ok'); });
  conn.on('data',m=>receiveClientMessage(m));
  conn.on('close',()=>note($('#game').classList.contains('hide') ? $('#lobbyNotice') : $('#gameNotice'),'A conexão com o anfitrião foi encerrada.','error'));
}
function incomingConn(conn){
  conn.on('data',m=>{
    if(m.type==='JOIN'){
      if(state.status!=='lobby'){ conn.send({type:'REJECT', message:'A partida já começou.'}); return; }
      let p = state.players.find(x=>x.id===m.id);
      if(!p && state.players.length>=8){ conn.send({type:'REJECT', message:'Sala cheia (8 jogadores).'}); return; }
      if(!p){ p=makePlayer({id:m.id, name:String(m.name||'Jogador').slice(0,18), isCpu:false}); state.players.push(p); }
      p.connected=true; p.name=String(m.name||p.name).slice(0,18);
      conns.set(m.id,conn); conn.pid=m.id;
      conn.on('close',()=>{ const pl=state.players.find(z=>z.id===conn.pid); if(pl){ pl.connected=false; broadcast(); } });
      addLog(p.name+' entrou na sala.'); broadcast();
    } else if(m.type==='ACTION' && conn.pid){ handleAction(conn.pid,m.action); }
  });
}
function receiveClientMessage(m){
  if(m.type==='SNAP'){ snap=m.data; render(); }
  else if(m.type==='REJECT') note($('#lobbyNotice'),m.message,'error');
}

function freshState({kind, mode}){
  return { code:room||rand(6), kind, mode, baseMode:modeBase(mode), hostId:clientId, status:'lobby', direction:1, turn:0, winner:null, deck:[], table:[], draft:{playerId:null,groups:[]}, editPool:[], turnBackup:null, turnSeconds:+($('#turnTime')?.value||localStorage.rumixTurnTime||90), turnStartedAt:0, players:[], log:[], seq:1, training:kind==='training', solo:kind==='solo', cpuDifficulty:$('#cpuDifficulty')?.value || 'normal' };
}
function makePlayer({id,name,isCpu}){ return {id, name, isCpu:!!isCpu, connected:true, hand:[], opened:false, shields:0, revealedUntil:0, combosCompleted:0, megaRewards:0}; }
function nextId(){ return 't'+(state.seq++); }
function makeTile(type,value,color=null,joker=false){ return {id:nextId(), type, value, color, joker}; }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
