  if(role==='client' || !s.turnSeconds) return;
  const left=s.turnSeconds-Math.floor((Date.now()-s.turnStartedAt)/1000);
  if(left<=0){ const p=currentPlayer(); restoreTurn(p,true); if(state.deck.length) p.hand.push(state.deck.pop()); addLog('⏱ '+p.name+' ficou sem tempo e comprou 1 peça.'); advanceTurn(); }
}
function validateCombo(gameMode, tiles){ const base=modeBase(gameMode); if(base==='classic') return validateNumbers(tiles); if(base==='words') return validateWord(tiles); const n=validateNumbers(tiles); if(n.ok) return n; const w=validateWord(tiles); if(w.ok) return w; const c=validateCode(tiles); if(c.ok) return c; return {ok:false,msg:'No modo misto, forme sequência/grupo numérico, palavra ou código alternado.'}; }
function validateNumbers(tiles){
  if(tiles.length<3 || tiles.some(t=>!t.joker && t.type!=='number')) return {ok:false,msg:'Grupo numérico inválido.'};
  const jokers=tiles.filter(t=>t.joker).length; const nums=tiles.filter(t=>!t.joker);
  if(!nums.length) return {ok:false,msg:'Não vale apenas curinga.'};
  const same = nums.every(t=>t.value===nums[0].value) && new Set(nums.map(t=>t.color)).size===nums.length && tiles.length<=4;
  if(same) return {ok:true,label:'grupo '+nums[0].value,score:tiles.reduce((s,t)=>s+(t.joker?nums[0].value:+t.value),0)};
  if(!nums.every(t=>t.color===nums[0].color)) return {ok:false,msg:'Sequência precisa ser da mesma cor.'};
  const vals=nums.map(t=>+t.value).sort((a,b)=>a-b); if(new Set(vals).size!==vals.length) return {ok:false,msg:'Números repetidos na sequência.'};
  let gaps=0; for(let i=1;i<vals.length;i++) gaps += vals[i]-vals[i-1]-1; if(gaps>jokers) return {ok:false,msg:'Faltam peças para completar a sequência.'};
  return {ok:true,label:'sequência '+colorLabel(nums[0].color),score:nums.reduce((s,t)=>s+t.value,0)+(jokers*Math.round(nums.reduce((s,t)=>s+t.value,0)/nums.length||1))};
}
function validateWord(tiles){ if(tiles.length<3 || tiles.some(t=>!t.joker && t.type!=='letter')) return {ok:false,msg:'A palavra precisa ter 3 ou mais letras.'}; return {ok:true,label:'palavra '+tiles.map(t=>t.joker?'?':t.value).join(''),score:tiles.length}; }
function validateCode(tiles){ if(tiles.length<4 || tiles.some(t=>t.joker)) return {ok:false,msg:'Código misto inválido.'}; const start=tiles[0].type; if(!['letter','number'].includes(start)) return {ok:false,msg:'Código inválido.'}; for(let i=0;i<tiles.length;i++){ const expected=i%2===0?start:(start==='letter'?'number':'letter'); if(tiles[i].type!==expected) return {ok:false,msg:'Alterne letra e número.'}; }
  const letters=tiles.filter(t=>t.type==='letter').map(t=>ABC.indexOf(t.value)); const numbers=tiles.filter(t=>t.type==='number').map(t=>+t.value);
  for(let i=1;i<letters.length;i++) if(letters[i]!==letters[i-1]+1) return {ok:false,msg:'Letras fora de sequência.'};
  for(let i=1;i<numbers.length;i++) if(numbers[i]!==numbers[i-1]+1) return {ok:false,msg:'Números fora de sequência.'};
  return {ok:true,label:'código misto',score:numbers.reduce((a,b)=>a+b,0)+letters.length*2};
}
function colorLabel(color){ return {red:'vermelha',blue:'azul',orange:'laranja',black:'preta',joker:'curinga'}[color] || color; }

function triggerMegaReward(player, source){
  if(state.mode!=='mega' || player.megaRewards<=0) return err(player.id,'Nenhuma recompensa MegaRumiX disponível.');
  player.megaRewards -= 1;
  const effect = source==='spin' ? randomSpinEffect() : randomCardEffect();
  const msg = applyMegaEffect(player, effect);
  addLog(msg);
  if(state.status!=='finished') { afterStateChange(); if(player.megaRewards>0){ if(player.isCpu) setTimeout(()=>triggerMegaReward(player, Math.random()<0.5?'card':'spin'), 350); return; } advanceTurn(); }
}
function randomCardEffect(){ const effects=[
  {id:'extra_turn',title:'Jogue novamente'},
  {id:'steal_one',title:'Roube 1 peça'},
  {id:'opponent_draw_2',title:'Adversário compra 2'},
  {id:'peek_hand',title:'Espiar mão'},
  {id:'shield',title:'Escudo'},
  {id:'wild_convert',title:'Transformar peça em curinga'},
  {id:'swap_one',title:'Trocar 1 peça'},
  {id:'self_draw_1',title:'Você compra 1'}
]; return effects[Math.floor(Math.random()*effects.length)]; }
function randomSpinEffect(){ const effects=[
  {id:'skip_next',title:'Pular próximo'},
  {id:'reverse',title:'Inverter sentido'},
  {id:'opponent_draw_3',title:'Adversário compra 3'},
  {id:'steal_random',title:'Roubar peça aleatória'},
  {id:'peek_hand',title:'Espiar mão'},
  {id:'all_draw_1',title:'Todos compram 1'},
