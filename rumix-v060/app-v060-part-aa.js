/* Rumi Mix Arena v0.6.0 - perfil persistente, moedas virtuais, Banco da Maju,
   saída segura, troca automática de turno e orientação retrato/paisagem. */

const V060_PROFILE_KEY='rumixArenaProfileV060';
const V060_SAVE_KEY='rumixArenaSavedGameV060';
const V060_START_COINS=50000;
const V060_MIN_STAKE=1000;
const V060_MAX_STAKE=500000;
const V060_LOAN_MULTIPLIER=10/3; // 150 -> 500
let v060LastTurnId=null;
let v060TurnBannerTimer=null;

function v060Int(v,fallback=0){ const n=Math.floor(Number(v)); return Number.isFinite(n)?n:fallback; }
function v060Clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function v060Stake(n){ return v060Clamp(v060Int(n,V060_MIN_STAKE),V060_MIN_STAKE,V060_MAX_STAKE); }
function v060Fmt(n){
  try{return new Intl.NumberFormat('pt-BR').format(v060Int(n,0));}catch(e){return String(v060Int(n,0));}
}
function v060LoanDebt(amount){ return Math.ceil(v060Int(amount,0)*V060_LOAN_MULTIPLIER); }
function v060DefaultProfile(){
  return {
    version:1,id:clientId,name:(localStorage.rumixArenaName||'Jogador').slice(0,18),
    coins:V060_START_COINS,bankDebt:0,wins:0,losses:0,matches:0,
    preferredStake:V060_MIN_STAKE,orientation:'auto',createdAt:Date.now(),updatedAt:Date.now()
  };
}
function v060ReadAndroidProfile(){
  try{ if(window.AndroidApp&&typeof AndroidApp.loadProfile==='function') return AndroidApp.loadProfile()||''; }catch(e){}
  return '';
}
function v060LoadProfile(){
  let raw='';
  try{raw=localStorage.getItem(V060_PROFILE_KEY)||'';}catch(e){}
  if(!raw) raw=v060ReadAndroidProfile();
  let p=null;
  try{p=raw?JSON.parse(raw):null;}catch(e){p=null;}
  const d=v060DefaultProfile();
  if(!p||typeof p!=='object') return d;
  const out={...d,...p,id:clientId};
  out.name=String(out.name||d.name).slice(0,18);
  out.coins=v060Int(out.coins,V060_START_COINS);
  out.bankDebt=Math.max(0,v060Int(out.bankDebt,0));
  out.wins=Math.max(0,v060Int(out.wins,0));
  out.losses=Math.max(0,v060Int(out.losses,0));
  out.matches=Math.max(out.wins+out.losses,v060Int(out.matches,0));
  out.preferredStake=v060Stake(out.preferredStake);
  if(!['auto','portrait','landscape'].includes(out.orientation)) out.orientation='auto';
  return out;
}
let v060Profile=v060LoadProfile();
function v060SaveProfile(){
  v060Profile.updatedAt=Date.now();
  const raw=JSON.stringify(v060Profile);
  try{localStorage.setItem(V060_PROFILE_KEY,raw);localStorage.rumixArenaName=v060Profile.name;}catch(e){}
  try{if(window.AndroidApp&&typeof AndroidApp.saveProfile==='function')AndroidApp.saveProfile(raw);}catch(e){}
  v060RefreshProfileUI();
}
function v060SyncOwnFromPlayer(p){
  if(!p||p.id!==clientId||p.isCpu)return;
  v060Profile.name=String(p.name||v060Profile.name).slice(0,18);
  v060Profile.coins=v060Int(p.coins,v060Profile.coins);
  v060Profile.bankDebt=Math.max(0,v060Int(p.bankDebt,v060Profile.bankDebt));
  v060Profile.wins=Math.max(0,v060Int(p.wins,v060Profile.wins));
  v060Profile.losses=Math.max(0,v060Int(p.losses,v060Profile.losses));
  v060Profile.matches=Math.max(v060Profile.wins+v060Profile.losses,v060Int(p.matches,v060Profile.matches));
  v060SaveProfile();
}
function v060PublicProfile(){
  return {name:v060Profile.name,coins:v060Profile.coins,bankDebt:v060Profile.bankDebt,wins:v060Profile.wins,losses:v060Profile.losses,matches:v060Profile.matches};
}
function v060ApplyPublicProfileToPlayer(p,data){
  if(!p||!data)return p;
  p.coins=v060Int(data.coins,V060_START_COINS);
  p.bankDebt=Math.max(0,v060Int(data.bankDebt,0));
  p.wins=Math.max(0,v060Int(data.wins,0));
  p.losses=Math.max(0,v060Int(data.losses,0));
  p.matches=Math.max(p.wins+p.losses,v060Int(data.matches,0));
  return p;
}
function v060ProfilePlayerFromSnapshot(s){ return s?.players?.find(p=>p.id===clientId)||null; }
function v060SyncFromSnapshot(s){ const p=v060ProfilePlayerFromSnapshot(s); if(p)v060SyncOwnFromPlayer(p); }

function v060CreateUi(){
  const home=$('#home');
  if(home&&!$('#v060ProfileCard')){
    const box=document.createElement('div'); box.id='v060ProfileCard'; box.className='v060-profile-card';
    box.innerHTML=`
      <div class="v060-profile-head"><div><div class="section-title">👤 Meu perfil</div><b id="v060ProfileName"></b></div><button id="v060EditProfile" class="btn mini">Editar</button></div>
      <div class="v060-wallet-grid">
        <div><span>🪙 Moedas</span><b id="v060CoinsHome">50.000</b></div>
        <div><span>🏦 Dívida Banco da Maju</span><b id="v060DebtHome">0</b></div>
        <div><span>🏆 Vitórias</span><b id="v060WinsHome">0</b></div>
        <div><span>🎮 Partidas</span><b id="v060MatchesHome">0</b></div>
      </div>
      <div class="v060-profile-controls">
        <label>Aposta de brincadeira <small>1.000 a 500.000</small><input id="v060StakeHome" class="input" type="number" min="1000" max="500000" step="1000"></label>
        <label>Tela<select id="v060OrientationHome" class="input"><option value="auto">Automática</option><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label>
      </div>
      <div class="home-actions small-gap"><button id="v060BankHome" class="btn gold">🏦 Banco da Maju</button><button id="v060Resume" class="btn blue hide">▶ Continuar partida salva</button></div>
      <div class="v060-playmoney-note">Moedas 100% virtuais: sem valor real, sem compra e sem saque.</div>`;
    const h2=home.querySelector('h2'); if(h2)h2.insertAdjacentElement('afterend',box); else home.prepend(box);
    $('#v060EditProfile').onclick=v060EditProfile;
    $('#v060BankHome').onclick=v060BorrowPrompt;
    $('#v060StakeHome').onchange=e=>{v060Profile.preferredStake=v060Stake(e.target.value);e.target.value=v060Profile.preferredStake;v060SaveProfile();};
    $('#v060OrientationHome').onchange=e=>v060SetOrientation(e.target.value);
    $('#v060Resume').onclick=v060ResumeLocalGame;
  }
  const lobby=$('#lobby');
  if(lobby&&!$('#v060LobbyEconomy')){
    const box=document.createElement('div');box.id='v060LobbyEconomy';box.className='v060-lobby-economy';
    box.innerHTML=`<div><b>🪙 Partida com moedas virtuais</b><div class="minor-text">Qualquer jogador pode ajustar o valor antes do início. O último valor confirmado vale para a sala.</div></div><label>Aposta<input id="v060StakeLobby" class="input" type="number" min="1000" max="500000" step="1000"></label><button id="v060BankLobby" class="btn gold mini">🏦 Banco</button>`;
    const actions=lobby.querySelector('.home-actions'); if(actions)actions.insertAdjacentElement('afterend',box); else lobby.appendChild(box);
    $('#v060StakeLobby').onchange=e=>{const n=v060Stake(e.target.value);e.target.value=n;sendAction({type:'SET_STAKE',stake:n});};
    $('#v060BankLobby').onclick=v060BorrowPrompt;
  }
  const top=$('#game .topbar-right');
  if(top&&!$('#v060CoinsGame')){
    const wallet=document.createElement('span');wallet.id='v060CoinsGame';wallet.className='pill v060-wallet-pill';wallet.textContent='🪙 50.000';top.appendChild(wallet);
    const debt=document.createElement('span');debt.id='v060DebtGame';debt.className='pill v060-debt-pill';debt.textContent='🏦 0';top.appendChild(debt);
    const orient=document.createElement('button');orient.id='v060OrientationGame';orient.className='v060-top-btn';orient.title='Alternar orientação';orient.textContent='↕';orient.onclick=v060CycleOrientation;top.appendChild(orient);
    const leave=document.createElement('button');leave.id='v060LeaveGame';leave.className='v060-top-btn danger';leave.textContent='SAIR';leave.onclick=v060LeaveCurrent;top.appendChild(leave);
  }
  const quick=$('#game .stack-buttons');
  if(quick&&!$('#v060BankGame')){const b=document.createElement('button');b.id='v060BankGame';b.className='btn mini v060-bank-game';b.title='Banco da Maju';b.setAttribute('aria-label','Banco da Maju');b.onclick=v060BorrowPrompt;quick.appendChild(b);}
  if(!$('#v060TurnBanner')){const b=document.createElement('div');b.id='v060TurnBanner';document.body.appendChild(b);}
