  $('#sortColorBtn').onclick=()=>{ currentSort='color'; sortMyHand(); render(); };
  $('#hintBtn').onclick=showHint;
  $('#toggleHintsBtn').onclick=toggleHints;
  $('#resetTurnBtn').onclick=()=>sendAction({type:'RESET_TURN'});
  $('#newTrainingBtn').onclick=newTrainingHand;
  $('#clearTrainingBtn').onclick=clearTrainingTable;
  $('#megaCardBtn').onclick=()=>sendAction({type:'MEGA_REWARD', source:'card'});
  $('#megaSpinBtn').onclick=()=>sendAction({type:'MEGA_REWARD', source:'spin'});
  setPlayKind('online');
  setMode('classic');
  updateHintVisibility();
  setInterval(tickClock,500);
  window.RumiMixArena = { openInvite(code){ show('home'); setPlayKind('online'); $('#joinCode').value=String(code||'').toUpperCase(); note($('#homeNotice'),'Convite recebido para a sala '+$('#joinCode').value+'. Digite seu nome e toque em Entrar na sala.','ok'); } };
  const q = new URLSearchParams(location.search); if(q.get('room')) window.RumiMixArena.openInvite(q.get('room'));
}

function createRoom(){
  if(typeof Peer==='undefined'){ note($('#homeNotice'),'Serviço multiplayer indisponível. Verifique a internet.','error'); return; }
  saveName(); room=rand(6); role='host'; peer=new Peer('rumix-arena-'+room.toLowerCase()+'-host',{debug:1}); bindPeerErrors(peer,$('#homeNotice'));
  peer.on('open',()=>{ state=freshState({kind:'online', mode}); state.players.push(makePlayer({id:clientId, name:name(), isCpu:false})); showLobby(); broadcast(); });
  peer.on('connection',incomingConn);
}
function joinRoom(code){
  if(!/^[A-Z0-9]{4,8}$/.test(code)){ note($('#homeNotice'),'Digite um código de sala válido.','error'); return; }
  if(typeof Peer==='undefined'){ note($('#homeNotice'),'Serviço multiplayer indisponível. Verifique a internet.','error'); return; }
  saveName(); room=code; role='client'; peer=new Peer(undefined,{debug:1}); bindPeerErrors(peer,$('#homeNotice'));
  peer.on('open',()=>{ hostConn=peer.connect('rumix-arena-'+room.toLowerCase()+'-host',{reliable:true}); bindHostConn(hostConn); });
}
function bindPeerErrors(p, el){ p.on('error',e=>{ const m=e.type==='peer-unavailable' ? 'Sala não encontrada ou anfitrião desconectado.' : e.type==='network' ? 'Falha de rede. Confira a internet.' : 'Erro: '+(e.type||e.message); note(el,m,'error'); }); }
function bindHostConn(conn){
  conn.on('open',()=>{ conn.send({type:'JOIN', id:clientId, name:name()}); showLobby(); note($('#lobbyNotice'),'Conectado à sala.','ok'); });
  conn.on('data',m=>receiveClientMessage(m));
  conn.on('close',()=>note($('#game').classList.contains('hide') ? $('#lobbyNotice') : $('#gameNotice'),'A conexão com o anfitrião foi encerrada.','error'));
}
function incomingConn(conn){
  conn.on('data',m=>{
    if(m.type==='JOIN'){
      if(state.status!=='lobby'){ conn.send({type:'REJECT', message:'A partida já começou.'}); return; }
      let p = state.players.find(x=>x.id===m.id);
      if(!p && state.players.length>=8){ conn.send({type:'REJECT', message:'Sala cheia (8 jogadores).'}); return; }
      if(!p){ p=makePlayer({id:m.id, name:String(m.name||'Jogador').slice(0,18), isCpu:false}); state.players.push(p); }
      p.connected=true; p.name=String(m.name||p.name).slice(0,18);
      conns.set(m.id,conn); conn.pid=m.id;
      conn.on('close',()=>{ const pl=state.players.find(z=>z.id===conn.pid); if(pl){ pl.connected=false; broadcast(); } });
      addLog(p.name+' entrou na sala.'); broadcast();
    } else if(m.type==='ACTION' && conn.pid){ handleAction(conn.pid,m.action); }
  });
}
function receiveClientMessage(m){
  if(m.type==='SNAP'){ snap=m.data; render(); }
