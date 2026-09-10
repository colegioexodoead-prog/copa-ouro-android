  if(first) combos.push(first);
  if(difficulty==='hard'&&first){
    const used=new Set(first.map(t=>t.id));
    const second=findAnyCombo(player.hand.filter(t=>!used.has(t.id)),state.mode);
    if(second) combos.push(second);
  }
  const openingMin=state.baseMode==='classic'?30:state.baseMode==='words'?7:20;
  const openingScore=combos.reduce((sum,c)=>sum+validateCombo(state.mode,c).score,0);
  if(!player.opened&&openingScore<openingMin){ drawTile(player); return; }
  if(combos.length){
    for(const combo of combos){ if(currentPlayer().id!==player.id) return; playSelection(player,combo.map(t=>t.id)); }
    endTurn(player);
  }else drawTile(player);
}

async function shareInvite(){
  const text='🎲 Convite para jogar Rumi Mix Arena\nSala: '+room+'\nAbra no app: rumixarena://join/'+room+'\nSe o link não abrir, digite o código '+room+' no aplicativo.';
  try{
    if(navigator.share){ await navigator.share({title:'Rumi Mix Arena',text}); return; }
  }catch(e){}
  try{
    await navigator.clipboard.writeText(text);
    note($('#lobbyNotice'),'Convite copiado. Agora é só enviar para os jogadores.','ok');
  }catch(e){
    note($('#lobbyNotice'),'Sala: '+room+' — compartilhe este código com os jogadores.','ok');
  }
}
async function copyCode(){ try{ await navigator.clipboard.writeText(room); note($('#lobbyNotice'),'Código '+room+' copiado.','ok'); }catch(e){ note($('#lobbyNotice'),'Código: '+room,'ok'); } }
function addLog(message){ if(!state) return; state.log.unshift({m:message,t:Date.now()}); state.log=state.log.slice(0,40); }
init();
})();
