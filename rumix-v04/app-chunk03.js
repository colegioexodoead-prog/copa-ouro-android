  const player=currentPlayer();
  if(state.status==='finished' && action.type!=='NEW_TRAINING_HAND') return;
  if(action.type==='MEGA_REWARD'){ if(player.id!==pid) return err(pid,'A recompensa MegaRumiX pertence ao jogador da vez.'); return triggerMegaReward(player, action.source); }
  if(player.id!==pid) return err(pid,'Aguarde sua vez.');
  if(player.megaRewards>0 && ['PLAY','DRAW','END'].includes(action.type) && !player.isCpu && state.mode==='mega') return err(pid,'Use primeiro sua carta ou roleta do MegaRumiX.');
  switch(action.type){
    case 'PLAY': return playSelection(player, action.ids||[]);
    case 'UNDO': return undoDraft(player);
    case 'RESET_TURN': return restoreTurn(player,false);
    case 'PICK_GROUP': return pickTableGroup(player,action.groupId);
    case 'DRAW': return drawTile(player);
    case 'END': return endTurn(player);
  }
}
function beginTurn(){
  const p=currentPlayer();
  state.draft={playerId:p.id,groups:[]};
  state.editPool=[];
  state.turnStartedAt=Date.now();
  state.turnBackup={
    table:clone(state.table), hand:clone(p.hand), opened:p.opened,
    combosCompleted:p.combosCompleted||0, megaRewards:p.megaRewards||0,
    megaThreshold:p._megaThresholdDone||0
  };
}
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function pickTableGroup(player,groupId){
  if(!player.opened) return err(player.id,'Faça primeiro sua abertura antes de reorganizar a mesa.');
  const idx=state.table.findIndex(g=>g.id===groupId);
  if(idx<0) return err(player.id,'Esse grupo não está mais disponível.');
  const [group]=state.table.splice(idx,1);
  state.editPool.push(...group.tiles);
  addLog(player.name+' abriu um grupo da mesa para reorganizar.');
  selected=[]; afterStateChange();
}
function playSelection(player, ids){
  const unique=[...new Set(ids)];
  if(unique.length<3) return err(player.id,'Selecione pelo menos 3 peças.');
  const sources={};
  const tiles=unique.map(tileId=>{
    const handTile=player.hand.find(t=>t.id===tileId); if(handTile){ sources[tileId]='hand'; return handTile; }
    const tableTile=state.editPool.find(t=>t.id===tileId); if(tableTile){ sources[tileId]='table'; return tableTile; }
    return null;
  });
  if(tiles.some(t=>!t)) return err(player.id,'Seleção inválida ou peça já utilizada.');
  const v=validateCombo(state.mode, tiles);
  if(!v.ok) return err(player.id,v.msg);
  player.hand=player.hand.filter(t=>!unique.includes(t.id));
  state.editPool=state.editPool.filter(t=>!unique.includes(t.id));
  state.draft.groups.push({id:'g'+Date.now()+Math.random(), tiles, label:v.label, score:v.score, sources});
