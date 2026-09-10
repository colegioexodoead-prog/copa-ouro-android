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
function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c])); }
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
