  {id:'extra_turn',title:'Jogada extra'},
  {id:'self_draw_2',title:'Revés: você compra 2'}
]; return effects[Math.floor(Math.random()*effects.length)]; }
function otherPlayersAlive(player){ return state.players.filter(p=>p.id!==player.id); }
function randomOther(player){ const others=otherPlayersAlive(player); return others.length ? others[Math.floor(Math.random()*others.length)] : null; }
function drawFor(p, n){ for(let i=0;i<n && state.deck.length;i++) p.hand.push(state.deck.pop()); sortHand(p); }
function applyMegaEffect(player,effect){
  const target = randomOther(player);
  switch(effect.id){
    case 'extra_turn': state.turn = normalizeTurn(state.players.findIndex(p=>p.id===player.id) - state.direction); return '⚡ '+player.name+' ativou "'+effect.title+'" e ganhou mais um turno.';
    case 'skip_next': state.turn = normalizeTurn(state.turn + state.direction); return '⚡ '+player.name+' ativou "'+effect.title+'" e pulou o próximo jogador.';
    case 'reverse': state.direction *= -1; return '⚡ '+player.name+' ativou "'+effect.title+'".';
    case 'opponent_draw_2': if(target){ if(target.shields>0){ target.shields--; return '⚡ '+player.name+' tentou obrigar '+target.name+' a comprar 2, mas o escudo defendeu.'; } drawFor(target,2); return '⚡ '+player.name+' fez '+target.name+' comprar 2 peças.'; } return '⚡ Mega sem alvo disponível.';
    case 'opponent_draw_3': if(target){ if(target.shields>0){ target.shields--; return '⚡ '+player.name+' tentou obrigar '+target.name+' a comprar 3, mas o escudo defendeu.'; } drawFor(target,3); return '⚡ '+player.name+' fez '+target.name+' comprar 3 peças.'; } return '⚡ Mega sem alvo disponível.';
    case 'peek_hand': if(target){ target.revealedUntil=Date.now()+20000; target.revealedTo=player.id; return '⚡ '+player.name+' pode ver as peças de '+target.name+' por 20 segundos.'; } return '⚡ Mega sem alvo disponível.';
    case 'shield': player.shields=(player.shields||0)+1; return '⚡ '+player.name+' ganhou 1 escudo.';
    case 'steal_one':
    case 'steal_random': if(target && target.hand.length){ const stolen=target.hand.splice(Math.floor(Math.random()*target.hand.length),1)[0]; player.hand.push(stolen); sortHand(player); return '⚡ '+player.name+' roubou 1 peça de '+target.name+'.'; } return '⚡ Não havia peça para roubar.';
    case 'swap_one': if(target && target.hand.length && player.hand.length){ const i=Math.floor(Math.random()*player.hand.length), j=Math.floor(Math.random()*target.hand.length); const mine=player.hand[i]; player.hand[i]=target.hand[j]; target.hand[j]=mine; sortHand(player); sortHand(target); return '⚡ '+player.name+' trocou 1 peça com '+target.name+'.'; } return '⚡ Troca indisponível.';
    case 'wild_convert': { const candidate=player.hand.find(t=>!t.joker); if(candidate){ candidate.joker=true; candidate.color='joker'; candidate.value='★'; return '⚡ '+player.name+' transformou uma peça em curinga.'; } return '⚡ Nenhuma peça disponível para virar curinga.'; }
    case 'all_draw_1': state.players.forEach(p=>drawFor(p,1)); return '⚡ '+player.name+' girou um evento global: todos compram 1 peça.';
    case 'self_draw_1': drawFor(player,1); return '⚡ Revés: '+player.name+' precisou comprar 1 peça.';
    case 'self_draw_2': drawFor(player,2); return '⚡ Revés: '+player.name+' precisou comprar 2 peças.';
    default: return '⚡ '+player.name+' ativou um efeito surpresa.';
  }
}

function snapshotFor(pid){
  const me=state.players.find(p=>p.id===pid)||state.players[0];
  const revealedHands={};
  for(const target of state.players){ if(target.revealedTo===pid && target.revealedUntil>Date.now()) revealedHands[target.id]=target.hand; }
  return {code:state.code,kind:state.kind,mode:state.mode,baseMode:state.baseMode,status:state.status,hostId:state.hostId,turn:state.turn,direction:state.direction,deckCount:state.deck.length,winner:state.winner,turnSeconds:state.turnSeconds,turnStartedAt:state.turnStartedAt,players:state.players.map(p=>({id:p.id,name:p.name,isCpu:p.isCpu,connected:p.connected,count:p.hand.length,opened:p.opened,shields:p.shields,revealedUntil:p.revealedUntil,revealedTo:p.revealedTo||null})),myHand:me.hand,myMegaRewards:me.megaRewards||0,myCombosCompleted:me.combosCompleted||0,table:state.table,draft:state.draft,editPool:state.editPool||[],revealedHands,log:state.log};
}
function afterStateChange(){ if(role==='host'){ broadcast(); } else { snap=snapshotFor(clientId); render(); } }
function broadcast(){ snap=snapshotFor(clientId); render(); for(const [pid,conn] of conns){ if(conn.open) conn.send({type:'SNAP',data:snapshotFor(pid)}); } }

function sortHand(player){
  if(!player?.hand) return;
  if(currentSort==='color') player.hand.sort((a,b)=>sortKeyColor(a)-sortKeyColor(b) || sortKeyValue(a)-sortKeyValue(b));
  else player.hand.sort((a,b)=>sortKeyValue(a)-sortKeyValue(b) || sortKeyColor(a)-sortKeyColor(b));
}
function sortKeyValue(t){ const typeW=t.type==='letter'?100:0; const val=t.joker?999:(t.type==='letter'?ABC.indexOf(t.value):+t.value); return typeW+val; }
function sortKeyColor(t){ const colorOrder={red:1,blue:2,orange:3,black:4,joker:9,null:8}; return (colorOrder[t.color] || 8) + (t.type==='letter'?20:0); }
function sortMyHand(){ const p = role==='client' ? null : state?.players.find(pl=>pl.id===clientId); if(p){ sortHand(p); } else if(snap?.myHand){ if(currentSort==='color') snap.myHand.sort((a,b)=>sortKeyColor(a)-sortKeyColor(b)||sortKeyValue(a)-sortKeyValue(b)); else snap.myHand.sort((a,b)=>sortKeyValue(a)-sortKeyValue(b)||sortKeyColor(a)-sortKeyColor(b)); } }
function sortAllHands(){ state?.players?.forEach(sortHand); }

function render(){
  const s=role==='client'?snap:snapshotFor(clientId);
  if(!s) return;
  document.body.classList.toggle('game-active',s.status!=='lobby');
