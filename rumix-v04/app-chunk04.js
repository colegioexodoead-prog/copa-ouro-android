  selected=[]; sortHand(player); addLog(player.name+' montou '+v.label+'.'); afterStateChange();
}
function undoDraft(player){
  if(!state.draft.groups.length) return err(player.id,'Não há combinações novas para desfazer.');
  const g=state.draft.groups.pop();
  for(const t of g.tiles){ if(g.sources?.[t.id]==='table') state.editPool.push(t); else player.hand.push(t); }
  sortHand(player); selected=[]; afterStateChange();
}
function restoreTurn(player,quiet){
  if(!state.turnBackup) return;
  state.table=clone(state.turnBackup.table);
  player.hand=clone(state.turnBackup.hand);
  player.opened=state.turnBackup.opened;
  player.combosCompleted=state.turnBackup.combosCompleted;
  player.megaRewards=state.turnBackup.megaRewards;
  player._megaThresholdDone=state.turnBackup.megaThreshold;
  state.draft={playerId:player.id,groups:[]}; state.editPool=[]; selected=[]; sortHand(player);
  if(!quiet) addLog(player.name+' restaurou o início do turno.');
  state.turnStartedAt=Date.now(); afterStateChange();
}
function drawTile(player){
  if(state.draft.groups.length || state.editPool.length) return err(player.id,'Restaure o turno antes de comprar uma peça.');
  if(state.deck.length) player.hand.push(state.deck.pop()); sortHand(player); addLog(player.name+' comprou uma peça.'); advanceTurn();
}
function endTurn(player){
  if(state.editPool.length) return err(player.id,'Ainda há peças retiradas da mesa. Recombine todas elas ou restaure o turno.');
  if(!state.draft.groups.length) return err(player.id,'Baixe ao menos uma combinação ou compre uma peça.');
  const total=state.draft.groups.reduce((sum,g)=>sum+g.score,0);
  const min=state.baseMode==='classic'?30:state.baseMode==='words'?7:20;
  if(!player.opened && total<min){ restoreTurn(player,true); return err(player.id,'A primeira abertura precisa somar pelo menos '+min+' pontos.'); }
  player.opened=true;
  const madeWithHand=state.draft.groups.filter(g=>Object.values(g.sources||{}).includes('hand')).length;
  state.table.push(...state.draft.groups.map(g=>({id:g.id,tiles:g.tiles,label:g.label,score:g.score})));
  player.combosCompleted += madeWithHand;
  if(state.mode==='mega'){
    const earned=Math.floor(player.combosCompleted/3)-(player._megaThresholdDone||0);
    if(earned>0){ player.megaRewards+=earned; player._megaThresholdDone=(player._megaThresholdDone||0)+earned; addLog('⚡ '+player.name+' desbloqueou '+earned+' recompensa(s) MegaRumiX.'); }
  }
  state.draft.groups=[];
  if(!player.hand.length){ state.status='finished'; state.winner=player.id; addLog('🏆 '+player.name+' venceu a partida!'); afterStateChange(); return; }
  if(state.mode==='mega' && player.megaRewards>0){ afterStateChange(); if(player.isCpu) setTimeout(()=>triggerMegaReward(player,Math.random()<.5?'card':'spin'),450); return; }
  advanceTurn();
}
function advanceTurn(){ state.turn=normalizeTurn(state.turn+state.direction); beginTurn(); afterStateChange(); maybeCpuTurn(); }
function normalizeTurn(value){ const len=state.players.length; return ((value%len)+len)%len; }
function currentPlayer(){ return state.players[normalizeTurn(state.turn)]; }
function err(pid,msg){ if((role==='host'||role==='local') && pid===clientId) note($('#gameNotice'),msg,'error'); else { const c=conns.get(pid); if(c?.open) c.send({type:'SNAP', data:{...snapshotFor(pid), error:msg}}); } }
function tickClock(){
  const s=role==='client'?snap:state; if(!s || s.status!=='playing') return;
  renderTimer(s);
