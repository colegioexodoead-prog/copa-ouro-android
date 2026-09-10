  if(state.status!=='playing')return;
  const oldTurn=normalizeTurn(state.turn);const wasCurrent=state.players[oldTurn]?.id===pid;
  if(wasCurrent&&state.turnBackup){restoreTurn(p,true);}
  if(p.hand?.length){state.deck.push(...p.hand);shuffle(state.deck);}p.hand=[];p.connected=false;p.losses=v060Int(p.losses,0)+1;p.matches=v060Int(p.matches,0)+1;p._resultCounted=true;
  state.players.splice(idx,1);conns.delete(pid);addLog('🚪 '+p.name+' saiu da partida.');
  if(state.players.length===1){state.status='finished';state.winner=state.players[0].id;addLog('🏆 '+state.players[0].name+' venceu por ser o último jogador na mesa.');v060SettleEconomy();return;}
  if(!state.players.length){state.status='finished';state.winner=null;afterStateChange();return;}
  if(wasCurrent){state.turn=state.direction===1?(idx%state.players.length):((idx-1+state.players.length)%state.players.length);beginTurn();afterStateChange();maybeCpuTurn();}
  else{state.turn=idx<oldTurn?oldTurn-1:oldTurn;state.turn=normalizeTurn(state.turn);afterStateChange();}
}
function v060HandleDisconnect(pid){
  const p=state?.players?.find(x=>x.id===pid);if(!p)return;p.connected=false;addLog('📡 '+p.name+' ficou offline.');afterStateChange();
  setTimeout(()=>{const q=state?.players?.find(x=>x.id===pid);if(!q||q.connected||state.status!=='playing')return;if(currentPlayer()?.id===pid){restoreTurn(q,true);if(state.deck.length)q.hand.push(state.deck.pop());sortHand(q);addLog('⏭ '+q.name+' ficou offline; a vez passou automaticamente.');advanceTurn();}},5000);
}

/* ---- Extensões sobre o motor v0.5.3 ---- */
const v060LegacyMakePlayer=makePlayer;
makePlayer=function(opts){const p=v060LegacyMakePlayer(opts);const src=opts?.profile||(opts?.id===clientId?v060Profile:null);v060ApplyPublicProfileToPlayer(p,src||{});if(p.isCpu&&p.coins<V060_START_COINS)p.coins=V060_START_COINS;return p;};

const v060LegacyFreshState=freshState;
freshState=function(cfg){const s=v060LegacyFreshState(cfg);s.stake=cfg?.kind==='training'?0:v060Stake($('#v060StakeHome')?.value||v060Profile.preferredStake);s.pot=0;s.economySettled=false;return s;};

const v060LegacyStartGame=startGame;
startGame=function(){
  if(!state)return;
  if(!state.training){
    state.stake=v060Stake(state.stake||v060Profile.preferredStake);
    const short=[];
    for(const p of state.players){
      p.coins=v060Int(p.coins,V060_START_COINS);p.bankDebt=Math.max(0,v060Int(p.bankDebt,0));
      if(p.isCpu&&p.coins<state.stake){const need=state.stake-p.coins;const repay=v060LoanDebt(need);p.coins+=need;p.bankDebt+=repay;addLog('🏦 '+p.name+' usou o Banco da Maju para completar a aposta.');}
      if(!p.isCpu&&p.coins<state.stake)short.push(p);
    }
    if(short.length){const names=short.map(p=>p.name).join(', ');short.forEach(p=>v060SendNotice(p.id,'Você precisa de '+v060Fmt(state.stake)+' moedas para esta partida. Use o Banco da Maju.'));if(state.kind==='solo')note($('#homeNotice'),'Moedas insuficientes para a aposta de '+v060Fmt(state.stake)+'. Use o Banco da Maju.','error');addLog('A partida aguardou saldo de: '+names+'.');afterStateChange();return;}
    for(const p of state.players)p.coins-=state.stake;
    state.pot=state.stake*state.players.length;state.economySettled=false;
  }
  v060LegacyStartGame();
  if(!state.training){addLog('🪙 Aposta de brincadeira: '+v060Fmt(state.stake)+' por jogador • pote '+v060Fmt(state.pot)+'.');afterStateChange();}
};

const v060LegacyEndTurn=endTurn;
endTurn=function(player){const before=state?.status;v060LegacyEndTurn(player);if(before==='playing'&&state?.status==='finished')v060SettleEconomy();};

advanceTurn=function(){
  if(!state||!state.players?.length)return;
  let next=normalizeTurn(state.turn+state.direction),attempts=0;
  while(attempts<state.players.length&&state.players[next]?.connected===false&&!state.players[next]?.isCpu){next=normalizeTurn(next+state.direction);attempts++;}
  state.turn=next;beginTurn();afterStateChange();maybeCpuTurn();
};

const v060LegacySnapshotFor=snapshotFor;
snapshotFor=function(pid){const s=v060LegacySnapshotFor(pid);s.stake=state.stake||0;s.pot=state.pot||0;s.economySettled=!!state.economySettled;s.players=s.players.map(x=>{const p=state.players.find(q=>q.id===x.id);return {...x,coins:v060Int(p?.coins,V060_START_COINS),bankDebt:Math.max(0,v060Int(p?.bankDebt,0)),wins:Math.max(0,v060Int(p?.wins,0)),losses:Math.max(0,v060Int(p?.losses,0)),matches:Math.max(0,v060Int(p?.matches,0))};});return s;};

const v060LegacyAfterStateChange=afterStateChange;
afterStateChange=function(){if((role==='host'||role==='local')&&state){const p=state.players?.find(x=>x.id===clientId);if(p)v060SyncOwnFromPlayer(p);}v060LegacyAfterStateChange();v060SaveLocalGame();};

const v060LegacyRender=render;
render=function(){v060LegacyRender();v060CreateUi();const s=role==='client'?snap:(state?snapshotFor(clientId):null);if(s){v060RefreshProfileUI();v060ShowTurnBanner(s);if($('#v060StakeLobby'))$('#v060StakeLobby').value=s.stake||v060Profile.preferredStake;}if($('#drawBtn'))$('#drawBtn').textContent='Comprar + finalizar';if($('#endBtn'))$('#endBtn').textContent='Finalizar → próximo';};

const v060LegacyReceiveClientMessage=receiveClientMessage;
receiveClientMessage=function(m){
  if(m?.type==='NOTICE'){note($('#lobby').classList.contains('hide')?$('#gameNotice'):$('#lobbyNotice'),m.message,m.noticeType||'');return;}
  if(m?.type==='ROOM_CLOSED'){note($('#homeNotice'),m.message||'A sala foi encerrada.','error');try{hostConn?.close();peer?.destroy();}catch(e){}hostConn=null;peer=null;snap=null;role=null;room='';show('home');v060RefreshProfileUI();return;}
  v060LegacyReceiveClientMessage(m);if(m?.type==='SNAP'){v060SyncFromSnapshot(m.data);v060CreateUi();}
};

bindHostConn=function(conn){
  conn.on('open',()=>{conn.send({type:'JOIN',id:clientId,name:name(),profile:v060PublicProfile()});showLobby();note($('#lobbyNotice'),'Conectado à sala.','ok');});
  conn.on('data',m=>receiveClientMessage(m));
  conn.on('close',()=>{if(role==='client')note($('#game').classList.contains('hide')?$('#lobbyNotice'):$('#gameNotice'),'A conexão com o anfitrião foi encerrada.','error');});
};

incomingConn=function(conn){
  conn.on('data',m=>{
    if(m.type==='JOIN'){
      let p=state.players.find(x=>x.id===m.id);
      if(state.status!=='lobby'&&!p){conn.send({type:'REJECT',message:'A partida já começou.'});return;}
      if(!p&&state.players.length>=8){conn.send({type:'REJECT',message:'Sala cheia (8 jogadores).'});return;}
      if(!p){p=makePlayer({id:m.id,name:String(m.name||'Jogador').slice(0,18),isCpu:false,profile:m.profile});state.players.push(p);}else v060ApplyPublicProfileToPlayer(p,m.profile||p);
      p.connected=true;p.name=String(m.name||p.name).slice(0,18);conns.set(m.id,conn);conn.pid=m.id;
      conn.on('close',()=>{if(conn.pid)v060HandleDisconnect(conn.pid);});
      addLog(p.name+(state.status==='lobby'?' entrou na sala.':' reconectou à partida.'));broadcast();
    }else if(m.type==='ACTION'&&conn.pid){handleAction(conn.pid,m.action);}
  });
};

const v060LegacyHandleAction=handleAction;
handleAction=function(pid,action){
  if(!state||!action)return;
  if(action.type==='SET_STAKE'){
    if(state.status!=='lobby')return v060SendNotice(pid,'A aposta só pode ser alterada antes da partida.');
    state.stake=v060Stake(action.stake);const p=state.players.find(x=>x.id===pid);if(p)addLog('🪙 '+p.name+' definiu a aposta em '+v060Fmt(state.stake)+'.');afterStateChange();return;
  }
  if(action.type==='BANK_LOAN'){return v060ApplyLoan(pid,action.amount);}
  if(action.type==='LEAVE'){return v060RemovePlayer(pid);}
  return v060LegacyHandleAction(pid,action);
};

const v060LegacyPlayerCardHtml=playerCardHtml;
playerCardHtml=function(p,s,gameView){
  const html=v060LegacyPlayerCardHtml(p,s,gameView);const coins=p.coins!==undefined?v060Fmt(p.coins):'50.000';const debt=p.bankDebt?v060Fmt(p.bankDebt):'0';
  return html.replace('</div></div>','<span class="v060-player-money">🪙 '+coins+(p.bankDebt?' • 🏦 '+debt:'')+'</span></div></div>');
};

const v060LegacyInit=init;
init=function(){
  v060LegacyInit();
  v060CreateUi();
  if($('#name')){$('#name').value=v060Profile.name;$('#name').onchange=()=>{const n=$('#name').value.trim().slice(0,18);if(n){v060Profile.name=n;v060SaveProfile();}};}
  v060SetOrientation(v060Profile.orientation);
  v060RefreshProfileUI();
};
