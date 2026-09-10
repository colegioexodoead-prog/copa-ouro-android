  }).join(''):'<div class="minor-text" style="color:#d8e8ff">A mesa está vazia. Monte sua primeira combinação.</div>';
  $$('[data-edit-group]').forEach(btn=>btn.onclick=()=>sendAction({type:'PICK_GROUP',groupId:btn.dataset.editGroup}));
}
function renderRack(hand){
  $('#rack').innerHTML=hand.map(t=>tileHtml(t,false,selected.includes(t.id))).join('');
  $$('#rack .tile').forEach(el=>el.onclick=()=>toggleSelect(el.dataset.id));
}
function renderEditPool(pool){
  const wrap=$('#editPoolWrap'), rack=$('#editPool'), tag=$('#editPoolTag'), count=$('#editPoolCount');
  const has=pool.length>0; wrap.classList.toggle('hide',!has); tag.classList.toggle('hide',!has); count.textContent=pool.length;
  rack.innerHTML=pool.map(t=>tileHtml(t,false,selected.includes(t.id),false,'mesa')).join('');
  $$('#editPool .tile').forEach(el=>el.onclick=()=>toggleSelect(el.dataset.id));
}
function renderRevealedHands(s){
  const old=document.querySelector('#revealedHandsBox'); if(old) old.remove();
  const entries=Object.entries(s.revealedHands||{}); if(!entries.length) return;
  const box=document.createElement('div'); box.id='revealedHandsBox'; box.className='panel compact revealed-hands-box';
  box.innerHTML='<div class="section-title">👁 Peças reveladas</div>'+entries.map(([pid,hand])=>{const p=s.players.find(x=>x.id===pid);return '<div class="minor-text"><b>'+esc(p?.name||'Jogador')+'</b></div><div class="rack edit-rack">'+hand.map(t=>tileHtml(t,true,false)).join('')+'</div>';}).join('');
  document.querySelector('.side-column').appendChild(box);
}
function tileHtml(t,small,selectedState,revealed=false,origin=''){ const cls=['tile',small?'small':'',tileClass(t),selectedState?'selected':''].join(' ').trim(); const value=t.joker?'★':esc(t.value); const sub=origin==='mesa'?'MESA':(t.type==='number'?colorLabel(t.color):(revealed?'visível':'')); return '<div class="'+cls+'" data-id="'+esc(t.id)+'"><div class="t-top">'+(t.joker?'coringa':t.type)+'</div><div class="t-val">'+value+'</div><div class="t-sub">'+esc(sub)+'</div></div>'; }
function tileClass(t){ if(t.joker)return'joker'; if(t.type==='letter')return'letter'; return t.color||''; }
function toggleSelect(id){ const idx=selected.indexOf(id); if(idx>=0)selected.splice(idx,1); else selected.push(id); render(); }
function updateHintVisibility(){ const on=(localStorage.rumixHints||$('#hintsSetting')?.value||'on')!=='off'; $('#hintBtn')?.classList.toggle('hide',!on); if($('#toggleHintsBtn')) $('#toggleHintsBtn').textContent=on?'Ocultar dicas':'Mostrar dicas'; }
function toggleHints(){ const on=(localStorage.rumixHints||'on')!=='off'; localStorage.rumixHints=on?'off':'on'; if($('#hintsSetting')) $('#hintsSetting').value=localStorage.rumixHints; updateHintVisibility(); }
function showHint(){
  const hand = role==='client' ? (snap?.myHand||[]) : (state?.players.find(p=>p.id===clientId)?.hand || []);
  const hint = findAnyCombo(hand, state?.mode || snap?.mode || mode);
  if(!hint) note($('#gameNotice'),'Dica: nenhuma combinação de 3+ peças foi encontrada agora.','error');
  else { selected = hint.map(t=>t.id); note($('#gameNotice'),'Dica: combinação sugerida -> '+hint.map(t=>t.joker?'★':t.value).join(' - '),'ok'); render(); }
}
function findAnyCombo(hand, gameMode){
  const max=Math.min(6,hand.length);
  for(let len=3; len<=max; len++){
    const combs = combinations(hand,len,1200);
    for(const c of combs){ if(validateCombo(gameMode,c).ok) return c; }
  }
  return null;
}
function combinations(arr,k,limit){ const out=[]; const n=arr.length; function rec(start,p){ if(out.length>=limit) return; if(p.length===k){ out.push(p.slice()); return; } for(let i=start;i<n;i++){ p.push(arr[i]); rec(i+1,p); p.pop(); if(out.length>=limit) return; } } rec(0,[]); return out; }
function newTrainingHand(){ if(role!=='local' || !state?.training) return; state.table=[]; state.draft={playerId:clientId,groups:[]}; const p=state.players[0]; p.hand=[]; state.deck=buildDeck(state.mode,1); for(let i=0;i<14 && state.deck.length;i++) p.hand.push(state.deck.pop()); sortHand(p); selected=[]; addLog('Nova mão de treino gerada.'); render(); }
function clearTrainingTable(){ if(role!=='local' || !state?.training) return; state.table=[]; state.draft={playerId:clientId,groups:[]}; selected=[]; addLog('Mesa de treino limpa.'); render(); }

function maybeCpuTurn(){ if(role!=='local' || !state || state.status!=='playing') return; const p=currentPlayer(); if(!p?.isCpu) return; setTimeout(()=>cpuAct(p), 700); }
function cpuAct(player){
  if(state.status!=='playing'||currentPlayer().id!==player.id)return;
  if(state.mode==='mega'&&player.megaRewards>0){ triggerMegaReward(player,Math.random()<.5?'card':'spin'); return; }
  const difficulty=state.cpuDifficulty||'normal';
  let combos=[];
  const first=findAnyCombo(player.hand.slice(),state.mode);
