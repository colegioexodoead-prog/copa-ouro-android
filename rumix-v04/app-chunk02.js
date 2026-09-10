  else if(m.type==='REJECT') note($('#lobbyNotice'),m.message,'error');
}

function freshState({kind, mode}){
  return { code:room||rand(6), kind, mode, baseMode:modeBase(mode), hostId:clientId, status:'lobby', direction:1, turn:0, winner:null, deck:[], table:[], draft:{playerId:null,groups:[]}, editPool:[], turnBackup:null, turnSeconds:+($('#turnTime')?.value||localStorage.rumixTurnTime||90), turnStartedAt:0, players:[], log:[], seq:1, training:kind==='training', solo:kind==='solo', cpuDifficulty:$('#cpuDifficulty')?.value || 'normal' };
}
function makePlayer({id,name,isCpu}){ return {id, name, isCpu:!!isCpu, connected:true, hand:[], opened:false, shields:0, revealedUntil:0, combosCompleted:0, megaRewards:0}; }
function nextId(){ return 't'+(state.seq++); }
function makeTile(type,value,color=null,joker=false){ return {id:nextId(), type, value, color, joker}; }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

function buildDeck(gameMode, playerCount){
  const base = modeBase(gameMode);
  const deck=[];
  if(base==='classic' || base==='mixed'){
    const copies = playerCount<=4 ? 2 : playerCount<=6 ? 3 : 4;
    for(let k=0;k<copies;k++) for(const color of COLORS) for(let v=1; v<=13; v++) deck.push(makeTile('number',v,color,false));
    for(let j=0;j<(copies===2?2:4);j++) deck.push(makeTile('number','★','joker',true));
  }
  if(base==='words' || base==='mixed'){
    const freq={A:14,B:3,C:5,D:6,E:12,F:3,G:3,H:2,I:10,J:2,K:1,L:5,M:6,N:5,O:11,P:4,Q:1,R:7,S:8,T:5,U:5,V:2,W:1,X:1,Y:1,Z:1};
    const mult = base==='words' ? (playerCount<=4 ? 1 : 2) : 1;
    for(let k=0;k<mult;k++) for(const [letter,count] of Object.entries(freq)) for(let i=0;i<count;i++) deck.push(makeTile('letter',letter,null,false));
    for(let j=0;j<2;j++) deck.push(makeTile('letter','★','joker',true));
  }
  return shuffle(deck);
}

function startSolo(){ saveName(); role='local'; room='SOLO'; state=freshState({kind:'solo',mode}); state.players.push(makePlayer({id:clientId,name:name(),isCpu:false})); const n=+($('#cpuCount').value||2); for(let i=1;i<=n;i++) state.players.push(makePlayer({id:'cpu-'+i,name:'CPU '+i,isCpu:true})); startGame(); }
function startTraining(){ saveName(); role='local'; room='TREINO'; state=freshState({kind:'training',mode}); state.players.push(makePlayer({id:clientId,name:name(),isCpu:false})); startGame(); $('#newTrainingBtn').classList.remove('hide'); $('#clearTrainingBtn').classList.remove('hide'); }
function startGame(){ state.deck=buildDeck(state.mode,state.players.length); for(const p of state.players){ p.hand=[]; p.opened=false; p.combosCompleted=0; p.megaRewards=0; p.shields=0; p._megaThresholdDone=0; for(let i=0;i<14 && state.deck.length;i++) p.hand.push(state.deck.pop()); } state.status='playing'; state.turn=0; state.direction=1; sortAllHands(); beginTurn(); addLog('Partida iniciada em '+MODE_LABELS[state.mode]+'.'); afterStateChange(); maybeCpuTurn(); }
function showLobby(){ show('lobby'); $('#roomCode').textContent=room; $('#lobbyKind').textContent='ONLINE'; $('#lobbyMode').textContent=MODE_LABELS[mode]; $('#startBtn').classList.toggle('hide',role!=='host'); renderLobby(); }
function renderLobby(){ const s=role==='host' ? state : snap; if(!s) return; $('#roomCode').textContent=s.code; $('#lobbyKind').textContent=(PLAY_KIND_LABELS[s.kind]||'Online').toUpperCase(); $('#lobbyMode').textContent=MODE_LABELS[s.mode] || s.mode; $('#playerCountLabel').textContent=s.players.length+'/8'; $('#lobbyPlayers').innerHTML=s.players.map(p=>playerCardHtml(p,s,false)).join(''); if(role==='host') $('#startBtn').disabled = s.players.length<1; }

function playerCardHtml(p,s,gameView){
  const idx=((s.turn%s.players.length)+s.players.length)%s.players.length;
  const turnId = gameView && s.status==='playing' ? s.players[idx]?.id : null;
  const tags=[];
  if(p.id===s.hostId) tags.push('<span class="pill">👑</span>');
  if(p.isCpu) tags.push('<span class="pill">🤖</span>');
  if(gameView){ if(p.opened) tags.push('<span class="pill gold">aberto</span>'); if(p.shields) tags.push('<span class="pill">🛡 '+p.shields+'</span>'); tags.push('<span class="pill">'+(p.count ?? p.hand?.length ?? 0)+' peças</span>'); }
  const initial=esc((p.name||'?').trim().charAt(0).toUpperCase()||'?');
  return '<div class="player-card '+(p.id===clientId?'me':'')+' '+((gameView&&p.id===turnId)?'turn':'')+'"><div class="player-main-wrap"><div class="player-avatar">'+initial+'</div><div class="player-main"><b>'+esc(p.name)+'</b><div class="minor-text">'+(p.id===turnId?'🟡 jogando agora':(p.connected===false?'offline':'aguardando'))+'</div></div></div><div class="player-tags">'+tags.join('')+'</div></div>';
}

function sendAction(action){ clearNote($('#gameNotice')); if(role==='host' || role==='local') handleAction(clientId, action); else if(hostConn?.open) hostConn.send({type:'ACTION', action}); }
function handleAction(pid,action){
  if(!state) return;
  if(action.type==='START'){ if(pid!==state.hostId || state.status!=='lobby') return; startGame(); return; }
  if(state.status!=='playing' && state.status!=='finished') return;
