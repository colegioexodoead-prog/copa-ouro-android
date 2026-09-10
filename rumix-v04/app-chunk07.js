  if(s.status==='lobby'){ show('lobby'); renderLobby(); return; }
  show('game');
  const selectable=[...(s.myHand||[]),...(s.editPool||[])];
  selected=selected.filter(id=>selectable.some(t=>t.id===id));
  if(s.error){ note($('#gameNotice'),s.error,'error'); delete s.error; }
  const idx=((s.turn%s.players.length)+s.players.length)%s.players.length;
  const turnPlayer=s.players[idx];
  const winner=s.players.find(p=>p.id===s.winner);
  $('#turnText').textContent=s.status==='finished'?(winner?'🏆 '+winner.name+' venceu!':'Partida encerrada'):(turnPlayer?.id===clientId?'🟡 Sua vez':'Vez de '+(turnPlayer?.name||'...'));
  $('#gameMeta').textContent=(MODE_LABELS[s.mode]||s.mode)+' • '+(PLAY_KIND_LABELS[s.kind]||s.kind)+' • '+(s.kind==='online'?'Sala '+s.code:'Partida local');
  $('#deckCount').textContent=s.deckCount;
  $('#directionTag').textContent=s.direction===1?'↻ Horário':'↺ Anti-horário';
  renderTimer(s);
  $('#gamePlayers').innerHTML=s.players.map(p=>playerCardHtml(p,s,true)).join('');
  renderTable(s);
  renderRack(s.myHand||[]);
  renderEditPool(s.editPool||[]);
  renderRevealedHands(s);
  $('#selectedCount').textContent=selected.length;
  $('#log').innerHTML=(s.log||[]).map(item=>'<div class="log-item">'+esc(item.m)+'<time>'+new Date(item.t).toLocaleTimeString()+'</time></div>').join('');
  const localPlayer=role==='client'?{megaRewards:s.myMegaRewards||0,combosCompleted:s.myCombosCompleted||0}:(state.players.find(p=>p.id===clientId)||{megaRewards:0,combosCompleted:0});
  const rewards=localPlayer.megaRewards||0;
  $('#megaPanel').classList.toggle('hide',s.mode!=='mega');
  if(s.mode==='mega'){
    $('#megaStatus').textContent=rewards>0?('Você tem '+rewards+' recompensa(s) MegaRumiX pronta(s).'):('Combinações concluídas: '+(localPlayer.combosCompleted||0)+' • a cada 3 você libera carta ou roleta.');
    $('#megaCardBtn').disabled=rewards<1||turnPlayer?.id!==clientId||s.status==='finished';
    $('#megaSpinBtn').disabled=rewards<1||turnPlayer?.id!==clientId||s.status==='finished';
  }
  const myTurn=turnPlayer?.id===clientId&&s.status==='playing';
  const draftHas=(s.draft?.groups||[]).length>0;
  $('#playBtn').disabled=!myTurn;
  $('#undoBtn').disabled=!myTurn||!draftHas;
  $('#drawBtn').disabled=!myTurn;
  $('#endBtn').disabled=!myTurn;
  $('#resetTurnBtn').disabled=!myTurn;
  updateHintVisibility();
}
function renderTimer(s){
  const tag=$('#timerTag'), text=$('#timerText'); if(!tag||!text) return;
  if(!s.turnSeconds){ text.textContent='∞'; tag.classList.remove('warn','danger'); return; }
  const left=Math.max(0,s.turnSeconds-Math.floor((Date.now()-s.turnStartedAt)/1000));
  text.textContent=left+'s'; tag.classList.toggle('warn',left<=20&&left>10); tag.classList.toggle('danger',left<=10);
}
function renderTable(s){
  const me=s.players.find(p=>p.id===clientId); const idx=((s.turn%s.players.length)+s.players.length)%s.players.length;
  const canEdit=s.status==='playing'&&s.players[idx]?.id===clientId&&!!me?.opened;
  const groups=[...(s.table||[]).map(g=>({...g,draft:false})),...((s.draft?.groups)||[]).map(g=>({...g,draft:true}))];
  $('#table').innerHTML=groups.length?groups.map(g=>{
    const edit=(!g.draft&&canEdit)?'<button class="group-edit-btn" data-edit-group="'+esc(g.id)+'">Editar grupo</button>':'';
    return '<div class="group"><div class="group-head"><b>'+esc(g.label)+'</b><span>'+(g.draft?'nova combinação':edit)+'</span></div><div class="tiles">'+g.tiles.map(t=>tileHtml(t,true,false)).join('')+'</div></div>';
