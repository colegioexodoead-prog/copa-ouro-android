  if($('#drawBtn'))$('#drawBtn').textContent='Comprar + finalizar';
  if($('#endBtn'))$('#endBtn').textContent='Finalizar → próximo';
  const leaveLobby=$('#leaveBtn'); if(leaveLobby) leaveLobby.onclick=v060LeaveCurrent;
  v060RefreshProfileUI();
}
function v060RefreshProfileUI(){
  const set=(id,text)=>{const e=$(id);if(e)e.textContent=text;};
  set('#v060ProfileName',v060Profile.name);
  set('#v060CoinsHome',v060Fmt(v060Profile.coins));
  set('#v060DebtHome',v060Fmt(v060Profile.bankDebt));
  set('#v060WinsHome',v060Fmt(v060Profile.wins));
  set('#v060MatchesHome',v060Fmt(v060Profile.matches));
  if($('#v060StakeHome'))$('#v060StakeHome').value=v060Profile.preferredStake;
  if($('#v060OrientationHome'))$('#v060OrientationHome').value=v060Profile.orientation;
  const saved=v060ReadSavedGame(); if($('#v060Resume'))$('#v060Resume').classList.toggle('hide',!saved);
  const s=role==='client'?snap:(state?snapshotFor(clientId):null);
  const me=v060ProfilePlayerFromSnapshot(s);
  if($('#v060CoinsGame'))$('#v060CoinsGame').textContent='🪙 '+v060Fmt(me?.coins??v060Profile.coins);
  if($('#v060DebtGame'))$('#v060DebtGame').textContent='🏦 '+v060Fmt(me?.bankDebt??v060Profile.bankDebt);
  if($('#v060StakeLobby')&&s)$('#v060StakeLobby').value=s.stake||v060Profile.preferredStake;
}
function v060EditProfile(){
  const n=prompt('Nome do perfil:',v060Profile.name); if(n===null)return;
  const clean=String(n).trim().slice(0,18); if(!clean)return;
  v060Profile.name=clean; localStorage.rumixArenaName=clean; if($('#name'))$('#name').value=clean;
  if(state){const p=state.players?.find(x=>x.id===clientId);if(p)p.name=clean;afterStateChange();}
  v060SaveProfile();
}
function v060SetOrientation(mode){
  if(!['auto','portrait','landscape'].includes(mode))mode='auto';
  v060Profile.orientation=mode;v060SaveProfile();
  document.body.dataset.orientation=mode;
  try{if(window.AndroidApp&&typeof AndroidApp.setOrientation==='function')AndroidApp.setOrientation(mode);}catch(e){}
}
function v060CycleOrientation(){
  const list=['auto','portrait','landscape'];const i=list.indexOf(v060Profile.orientation);v060SetOrientation(list[(i+1)%list.length]);
}

function v060BorrowPrompt(){
  const s=role==='client'?snap:(state?snapshotFor(clientId):null);const p=v060ProfilePlayerFromSnapshot(s);
  const coins=p?.coins??v060Profile.coins, debt=p?.bankDebt??v060Profile.bankDebt;
  const raw=prompt('BANCO DA MAJU\nMoedas atuais: '+v060Fmt(coins)+'\nDívida atual: '+v060Fmt(debt)+'\n\nQuanto deseja pegar emprestado?\nExemplo: 150 moedas geram 500 moedas de dívida.','1000');
  if(raw===null)return;const amount=v060Int(String(raw).replace(/\D/g,''),0);if(amount<1){alert('Digite um valor maior que zero.');return;}
  const repay=v060LoanDebt(amount);
  if(!confirm('Receber '+v060Fmt(amount)+' moedas virtuais e adicionar '+v060Fmt(repay)+' à dívida do Banco da Maju?'))return;
  if(role==='client'&&snap){sendAction({type:'BANK_LOAN',amount});return;}
  if(state&&state.players?.some(x=>x.id===clientId)){handleAction(clientId,{type:'BANK_LOAN',amount});return;}
  v060Profile.coins+=amount;v060Profile.bankDebt+=repay;v060SaveProfile();
  note($('#homeNotice'),'Banco da Maju liberou '+v060Fmt(amount)+' moedas. Dívida adicionada: '+v060Fmt(repay)+'.','ok');
}
function v060SendNotice(pid,msg,type='error'){
  if(pid===clientId){note(state?.status==='lobby'?$('#lobbyNotice'):(state?.kind==='solo'?$('#homeNotice'):$('#gameNotice')),msg,type);return;}
  const c=conns.get(pid);if(c?.open)c.send({type:'NOTICE',message:msg,noticeType:type});
}
function v060ApplyLoan(pid,amount){
  amount=v060Int(amount,0);if(amount<1)return v060SendNotice(pid,'Empréstimo inválido.');
  const p=state?.players?.find(x=>x.id===pid);if(!p)return;
  const repay=v060LoanDebt(amount);p.coins=v060Int(p.coins,V060_START_COINS)+amount;p.bankDebt=Math.max(0,v060Int(p.bankDebt,0))+repay;
  addLog('🏦 '+p.name+' recebeu '+v060Fmt(amount)+' moedas do Banco da Maju. Dívida: +'+v060Fmt(repay)+'.');
  afterStateChange();v060SendNotice(pid,'Empréstimo liberado: +'+v060Fmt(amount)+' moedas. Nova dívida total: '+v060Fmt(p.bankDebt)+'.','ok');
}

function v060ReadSavedGame(){
  try{const raw=localStorage.getItem(V060_SAVE_KEY);if(!raw)return null;const x=JSON.parse(raw);if(!x?.state||x.state.status!=='playing')return null;return x;}catch(e){return null;}
}
function v060SaveLocalGame(){
  if(role==='local'&&state?.status==='playing'&&!state.training){try{localStorage.setItem(V060_SAVE_KEY,JSON.stringify({savedAt:Date.now(),state}));}catch(e){}}
  else if(state?.status==='finished'){try{localStorage.removeItem(V060_SAVE_KEY);}catch(e){}}
  v060RefreshProfileUI();
}
function v060ResumeLocalGame(){
  const saved=v060ReadSavedGame();if(!saved){note($('#homeNotice'),'Não há partida local salva.','error');return;}
  role='local';peer=null;hostConn=null;room=saved.state.code||'SOLO';state=saved.state;snap=null;selected=[];
  const me=state.players?.find(p=>p.id===clientId);if(me){me.name=v060Profile.name;v060SyncOwnFromPlayer(me);}else{note($('#homeNotice'),'O perfil desta partida não corresponde ao perfil atual.','error');return;}
  show('game');afterStateChange();maybeCpuTurn();note($('#gameNotice'),'Partida local restaurada do ponto em que foi salva.','ok');
}

function v060ShowTurnBanner(s){
  if(!s||s.status!=='playing'||!s.players?.length)return;
  const idx=((s.turn%s.players.length)+s.players.length)%s.players.length;const p=s.players[idx];if(!p)return;
  if(p.id===v060LastTurnId)return;v060LastTurnId=p.id;
  const b=$('#v060TurnBanner');if(!b)return;b.textContent=p.id===clientId?'SUA VEZ':'PRÓXIMO: '+p.name.toUpperCase();b.classList.add('show');clearTimeout(v060TurnBannerTimer);v060TurnBannerTimer=setTimeout(()=>b.classList.remove('show'),900);
}

function v060SettleEconomy(){
  if(!state||state.training||state.economySettled||state.status!=='finished'||!state.winner)return;
  const w=state.players.find(p=>p.id===state.winner);if(!w)return;
  const prize=Math.max(0,v060Int(state.pot,0));const beforeDebt=Math.max(0,v060Int(w.bankDebt,0));const paid=Math.min(prize,beforeDebt);
  w.bankDebt=beforeDebt-paid;w.coins=v060Int(w.coins,V060_START_COINS)+(prize-paid);
  state.players.forEach(p=>{if(p._resultCounted)return;p.matches=Math.max(0,v060Int(p.matches,0))+1;if(p.id===w.id)p.wins=Math.max(0,v060Int(p.wins,0))+1;else p.losses=Math.max(0,v060Int(p.losses,0))+1;p._resultCounted=true;});
  state.economySettled=true;
  addLog('🪙 '+w.name+' recebeu o pote de '+v060Fmt(prize)+' moedas virtuais.');
  if(paid>0)addLog('🏦 Banco da Maju descontou '+v060Fmt(paid)+' da vitória. Dívida restante: '+v060Fmt(w.bankDebt)+'.');
  afterStateChange();
}
function v060RefundRoom(){
  if(!state||state.training||state.economySettled||!state.stake)return;
  const stake=v060Int(state.stake,0);state.players.forEach(p=>{p.coins=v060Int(p.coins,V060_START_COINS)+stake;});state.pot=0;state.economySettled=true;addLog('🪙 Aposta devolvida porque a sala foi encerrada pelo anfitrião.');afterStateChange();
}

function v060LeaveCurrent(){
  const s=role==='client'?snap:(state?snapshotFor(clientId):null);const playing=s?.status==='playing';
  const msg=playing?(role==='host'&&s.kind==='online'?'Sair agora encerrará a sala online. As apostas serão devolvidas aos jogadores conectados. Deseja sair?':'Sair da partida agora? Sua aposta de brincadeira já usada na partida não será devolvida.'):'Sair desta sala?';
  if(!confirm(msg))return;
  if(role==='host'&&state?.kind==='online'){
    if(playing)v060RefundRoom();
    for(const [,c] of conns)if(c?.open)c.send({type:'ROOM_CLOSED',message:'O anfitrião encerrou a sala.'});
    try{peer?.destroy();}catch(e){}conns.clear();state=null;snap=null;role=null;room='';show('home');note($('#homeNotice'),'Sala encerrada.','ok');v060RefreshProfileUI();return;
  }
  if(role==='client'){
    if(playing){v060Profile.losses++;v060Profile.matches++;v060SaveProfile();}
    try{if(hostConn?.open)hostConn.send({type:'ACTION',action:{type:'LEAVE'}});}catch(e){}
    try{hostConn?.close();peer?.destroy();}catch(e){}hostConn=null;peer=null;snap=null;role=null;room='';show('home');note($('#homeNotice'),'Você saiu da partida. Seu perfil foi preservado.','ok');v060RefreshProfileUI();return;
  }
  if(role==='local'){
    if(playing){const p=state?.players?.find(x=>x.id===clientId);if(p){p.losses=v060Int(p.losses,0)+1;p.matches=v060Int(p.matches,0)+1;v060SyncOwnFromPlayer(p);}}
    state=null;snap=null;role=null;room='';try{localStorage.removeItem(V060_SAVE_KEY);}catch(e){}show('home');note($('#homeNotice'),'Partida encerrada. Seu perfil foi preservado.','ok');v060RefreshProfileUI();return;
  }
  show('home');
}
function v060RemovePlayer(pid){
  if(!state)return;const idx=state.players.findIndex(p=>p.id===pid);if(idx<0)return;const p=state.players[idx];
  if(state.status==='lobby'){
    state.players.splice(idx,1);conns.delete(pid);addLog(p.name+' saiu da sala.');afterStateChange();return;
  }
