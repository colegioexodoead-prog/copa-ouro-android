(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const COLORS=['red','blue','green','orange'];
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MODE_LABEL={classic:'Clássico',words:'Letras & Palavras',mixed:'Misto Letras + Números',mega:'MegaRumiX'};
const PLAY_LABEL={online:'Multiplayer Online',cpu:'Single Player',training:'Treino'};
const clientId=localStorage.rumixClientId||(localStorage.rumixClientId='p-'+rnd(10));
let playType='online',mode='classic',role=null,peer=null,hostConn=null,room='',state=null,snap=null,selected=[],conns=new Map(),cpuTimer=null;

function rnd(n=6){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint32Array(n);crypto.getRandomValues(a);return [...a].map(x=>c[x%c.length]).join('')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(m){try{AndroidApp.toast(m)}catch(e){}}
function show(x){['home','lobby','game'].forEach(y=>$('#'+y).classList.toggle('hide',x!==y))}
function note(el,msg,type=''){el.textContent=msg;el.className='notice'+(type?' '+type:'');el.classList.remove('hide')}
function clear(el){el.classList.add('hide')}
function playerName(){return ($('#name').value.trim()||localStorage.rumixName||'Jogador').slice(0,18)}
function saveName(){localStorage.rumixName=playerName()}
function modeLabel(m){return MODE_LABEL[m]||m}
function current(){return state?.players?.[state.turn%state.players.length]}
function tile(type,value,color=null,joker=false){return{id:'t'+(state?state.seq++:Date.now()+Math.random()),type,value,color,joker}}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function randItem(a){return a[Math.floor(Math.random()*a.length)]}
function log(m){if(!state)return;state.log.unshift({m,t:Date.now()});state.log=state.log.slice(0,50)}
function safeMode(m){return ['classic','words','mixed','mega'].includes(m)?m:'classic'}

$$('#playTypes .choice').forEach(e=>e.onclick=()=>{playType=e.dataset.play;$$('#playTypes .choice').forEach(x=>x.classList.toggle('active',x===e));syncHome()});
$$('#modes .mode').forEach(e=>e.onclick=()=>{mode=safeMode(e.dataset.mode);$$('#modes .mode').forEach(x=>x.classList.toggle('active',x===e))});
$('#name').value=localStorage.rumixName||'';
$('#joinCode').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
$('#createBtn').onclick=createRoom;
$('#joinBtn').onclick=()=>joinRoom($('#joinCode').value.trim().toUpperCase());
$('#soloStartBtn').onclick=startCpuGame;
$('#trainingStartBtn').onclick=startTraining;
$('#shareBtn').onclick=share;
$('#copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(room);toast('Código copiado')}catch(e){note($('#lobbyNotice'),'Código: '+room,'ok')}};
$('#startBtn').onclick=()=>action({type:'START'});
$('#leaveBtn').onclick=resetToHome;
$('#quitGameBtn').onclick=resetToHome;
$('#playBtn').onclick=()=>action({type:'PLAY',ids:[...selected]});
$('#undoBtn').onclick=()=>action({type:'UNDO'});
$('#endBtn').onclick=()=>action({type:'END'});
$('#drawBtn').onclick=()=>action({type:'DRAW'});
$('#cardBtn').onclick=()=>action({type:'POWER',source:'card'});
$('#wheelBtn').onclick=()=>action({type:'POWER',source:'wheel'});
$('#hintBtn').onclick=trainingHint;
$('#newHandBtn').onclick=()=>action({type:'NEW_HAND'});
$('#clearTableBtn').onclick=()=>action({type:'CLEAR_TABLE'});
$('#sortBtn').onclick=sortRack;

window.RumiMix={openInvite(c){playType='online';syncHome();show('home');$('#joinCode').value=String(c||'').toUpperCase();note($('#homeNotice'),'Convite recebido para a sala '+$('#joinCode').value+'. Digite seu nome e toque em Entrar na sala.','ok')}};
const q=new URLSearchParams(location.search);if(q.get('room'))window.RumiMix.openInvite(q.get('room'));
syncHome();

function syncHome(){
  $('#roomField').classList.toggle('hide',playType!=='online');
  $('#onlineButtons').classList.toggle('hide',playType!=='online');
  $('#soloButtons').classList.toggle('hide',playType!=='cpu');
  $('#trainingButtons').classList.toggle('hide',playType!=='training');
  $('#cpuCountField').classList.toggle('hide',playType!=='cpu');
  $('#difficultyField').classList.toggle('hide',playType!=='cpu');
}

function resetToHome(){
  clearTimeout(cpuTimer); cpuTimer=null;
  try{hostConn?.close();peer?.destroy()}catch(e){}
  role=null;peer=null;hostConn=null;room='';state=null;snap=null;selected=[];conns=new Map();
  clear($('#homeNotice'));show('home');syncHome();
}

function fresh(m,kind='online'){
  return{code:room||'LOCAL',mode:safeMode(m),kind,status:kind==='online'?'lobby':'playing',hostId:clientId,players:[],deck:[],table:[],draft:{playerId:null,groups:[]},turn:0,direction:1,skipNext:0,winner:null,log:[],seq:1,turnNo:1,pendingPower:null,lastPower:null,difficulty:$('#difficulty')?.value||'normal'};
}
function newPlayer(id,name,opt={}){return{id,name:String(name||'Jogador').slice(0,18),hand:[],opened:false,connected:true,isCpu:!!opt.isCpu,comboProgress:0,shield:false,reveal:null}}

function buildDeck(m,n){
  const a=[]; const base=m==='mega'?'classic':m;
  if(base==='classic'||base==='mixed'){
    const copies=n<=4?2:n<=6?3:4;
    for(let k=0;k<copies;k++)for(const c of COLORS)for(let v=1;v<=13;v++)a.push(tile('number',v,c));
    for(let j=0;j<Math.max(2,Math.ceil(copies/2)*2);j++)a.push(tile('joker','★','joker',true));
  }
  if(base==='words'||base==='mixed'){
    const f={A:14,B:3,C:5,D:6,E:12,F:3,G:3,H:2,I:10,J:2,K:1,L:5,M:6,N:5,O:11,P:4,Q:1,R:7,S:8,T:5,U:5,V:2,W:1,X:1,Y:1,Z:1};
    const mul=base==='words'?(n<=4?1:2):1;
    for(let k=0;k<mul;k++)for(const [l,v] of Object.entries(f))for(let i=0;i<v;i++)a.push(tile('letter',l));
    if(base==='words')for(let j=0;j<2;j++)a.push(tile('joker','★','joker',true));
  }
  return shuffle(a);
}
function deal(){
  state.deck=buildDeck(state.mode,state.players.length);
  for(const p of state.players){p.hand=[];p.opened=false;p.comboProgress=0;p.shield=false;p.reveal=null;for(let i=0;i<14&&state.deck.length;i++)p.hand.push(state.deck.pop())}
  state.table=[];state.turn=0;state.direction=1;state.skipNext=0;state.turnNo=1;state.pendingPower=null;state.lastPower=null;state.draft={playerId:current()?.id||null,groups:[]};
}

function startTraining(){
  saveName();role='local';room='TREINO';state=fresh(mode,'training');state.players=[newPlayer(clientId,playerName())];deal();state.status='playing';log('🎯 Treino iniciado em '+modeLabel(mode)+'.');show('game');render();
}
function startCpuGame(){
  saveName();role='local';room='CPU';state=fresh(mode,'cpu');state.players=[newPlayer(clientId,playerName())];
  const count=Math.max(1,Math.min(3,+$('#cpuCount').value||1));
  for(let i=1;i<=count;i++)state.players.push(newPlayer('cpu-'+i,'CPU '+i,{isCpu:true}));
  deal();state.status='playing';log('🤖 Partida contra '+count+' CPU(s) iniciada em '+modeLabel(mode)+'.');show('game');render();maybeCpu();
}

function peerErr(p,el){p.on('error',e=>{const m=e.type==='peer-unavailable'?'Sala não encontrada ou anfitrião desconectado.':e.type==='network'?'Falha de rede. Confira a internet.':'Conexão: '+(e.type||e.message);note(el,m,'error')})}
function createRoom(){
  if(typeof Peer==='undefined'){note($('#homeNotice'),'Componente multiplayer não carregou. Treino e CPU continuam disponíveis.','error');return}
  saveName();room=rnd(6);role='host';peer=new Peer('rumix-'+room.toLowerCase()+'-host',{debug:1});peerErr(peer,$('#homeNotice'));
  peer.on('open',()=>{state=fresh(mode,'online');state.players.push(newPlayer(clientId,playerName()));showLobby();broadcast()});peer.on('connection',incoming);
}
function joinRoom(c){
  if(!/^[A-Z0-9]{4,8}$/.test(c)){note($('#homeNotice'),'Digite um código de sala válido.','error');return}
  if(typeof Peer==='undefined'){note($('#homeNotice'),'Componente multiplayer não carregou.','error');return}
  saveName();room=c;role='client';peer=new Peer(undefined,{debug:1});peerErr(peer,$('#homeNotice'));
  peer.on('open',()=>{hostConn=peer.connect('rumix-'+room.toLowerCase()+'-host',{reliable:true});bindHost(hostConn)});
}
function bindHost(c){
  c.on('open',()=>{c.send({type:'JOIN',id:clientId,name:playerName()});showLobby();note($('#lobbyNotice'),'Conectado à sala.','ok')});
  c.on('data',m=>{if(m.type==='SNAP'){snap=m.data;room=snap.code;render()}else if(m.type==='REJECT')note($('#lobbyNotice'),m.message,'error')});
  c.on('close',()=>note($('#game').classList.contains('hide')?$('#lobbyNotice'):$('#gameNotice'),'Conexão com o anfitrião foi encerrada.','error'));
}
function incoming(c){
  c.on('data',m=>{
    if(m.type==='JOIN'){
      if(state.status!=='lobby'){c.send({type:'REJECT',message:'A partida já começou.'});return}
      let p=state.players.find(x=>x.id===m.id);
      if(!p&&state.players.length>=8){c.send({type:'REJECT',message:'Sala cheia (8 jogadores).'});return}
      if(!p){p=newPlayer(m.id,m.name);state.players.push(p)}else{p.connected=true;p.name=String(m.name||p.name).slice(0,18)}
      conns.set(m.id,c);c.pid=m.id;
      c.on('close',()=>{let x=state&&state.players.find(z=>z.id===c.pid);if(x){x.connected=false;broadcast()}});
      log(p.name+' entrou na sala.');broadcast();
    }else if(m.type==='ACTION'&&c.pid)handle(c.pid,m.a)
  });
}
function showLobby(){show('lobby');$('#roomCode').textContent=room;$('#startBtn').classList.toggle('hide',role!=='host');renderLobby()}
function renderLobby(){
  const s=role==='host'?state:snap;if(!s)return;
  $('#roomCode').textContent=s.code;$('#lobbyMode').textContent=modeLabel(s.mode);$('#playerCount').textContent=s.players.length+'/8';
  $('#lobbyPlayers').innerHTML=s.players.map(p=>`<div class="player ${p.id===clientId?'me':''}"><b>${esc(p.name)}</b><div class="muted">${p.id===s.hostId?'👑 anfitrião':'jogador'}${p.connected===false?' • offline':''}</div></div>`).join('');
  if(role==='host')$('#startBtn').disabled=s.players.length<1;
}
function share(){try{AndroidApp.shareInvite(room)}catch(e){note($('#lobbyNotice'),'Convite: rumix://join/'+room,'ok')}}
function action(a){clear($('#gameNotice'));if(role==='host'||role==='local')handle(clientId,a);else if(hostConn?.open)hostConn.send({type:'ACTION',a})}

function handle(pid,a){
  if(!state)return;
  if(a.type==='START'){
    if(pid!==state.hostId||state.status!=='lobby')return;deal();state.status='playing';state.draft={playerId:current().id,groups:[]};log('▶ Partida iniciada em '+modeLabel(state.mode)+'.');broadcast();return;
  }
  if(state.status!=='playing')return;
  const p=current();
  if(!p||p.id!==pid){err(pid,'Aguarde sua vez.');return}
  if(state.pendingPower&&state.pendingPower.playerId===pid&&a.type!=='POWER'){err(pid,'Você completou 3 combinações. Escolha Carta ou Roleta antes de continuar.');return}

  if(a.type==='PLAY'){
    const ids=[...new Set(a.ids||[])];if(ids.length<3){err(pid,'Selecione pelo menos 3 peças.');return}
    const ts=ids.map(x=>p.hand.find(t=>t.id===x));if(ts.some(x=>!x)){err(pid,'Seleção inválida.');return}
    const v=valid(state.mode,ts);if(!v.ok){err(pid,v.msg);return}
    p.hand=p.hand.filter(t=>!ids.includes(t.id));state.draft.groups.push({id:'g'+Date.now()+Math.random(),tiles:ts,label:v.label,score:v.score});log(p.name+' preparou '+v.label+'.');broadcast();return;
  }
  if(a.type==='UNDO'){
    if(!state.draft.groups.length){err(pid,'Não há jogadas para desfazer.');return}
    for(const g of state.draft.groups)p.hand.push(...g.tiles);state.draft.groups=[];broadcast();return;
  }
  if(a.type==='END'){
    if(!state.draft.groups.length){err(pid,'Baixe ao menos uma combinação ou compre uma peça.');return}
    const total=state.draft.groups.reduce((s,g)=>s+g.score,0),min=state.mode==='classic'||state.mode==='mega'?30:state.mode==='words'?7:20;
    if(state.kind!=='training'&&!p.opened&&total<min){for(const g of state.draft.groups)p.hand.push(...g.tiles);state.draft.groups=[];err(pid,'Primeira abertura precisa somar pelo menos '+min+' pontos.');broadcast();return}
    const combos=state.draft.groups.length;p.opened=true;state.table.push(...state.draft.groups);state.draft.groups=[];
    if(state.mode==='mega'){
      const before=p.comboProgress;p.comboProgress+=combos;const powers=Math.floor(p.comboProgress/3);p.comboProgress%=3;
      if(powers>0){state.pendingPower={playerId:p.id,count:powers};log('⚡ '+p.name+' completou '+(before+combos)+' combinações e liberou '+powers+' efeito(s) MegaRumiX!');broadcast();return}
    }
    if(state.kind==='training'){if(!p.hand.length){log('✅ Você esvaziou a mão no treino! Nova mão liberada.')}state.draft={playerId:p.id,groups:[]};broadcast();return}
    if(!p.hand.length){finishWinner(p);return}
    nextTurn();return;
  }
  if(a.type==='DRAW'){
    if(state.draft.groups.length){err(pid,'Desfaça ou finalize as peças baixadas antes de comprar.');return}
    drawTo(p,1);log(p.name+' comprou uma peça.');if(state.kind==='training'){broadcast();return}nextTurn();return;
  }
  if(a.type==='POWER'){
    if(state.mode!=='mega'||!state.pendingPower||state.pendingPower.playerId!==pid){err(pid,'Nenhum efeito MegaRumiX disponível agora.');return}
    const source=a.source==='wheel'?'wheel':'card';applyPower(p,source);state.pendingPower.count--;
    if(state.pendingPower.count>0){broadcast();return}
    state.pendingPower=null;
    if(!p.hand.length){finishWinner(p);return}
    if(state._extraTurn){state._extraTurn=false;state.draft={playerId:p.id,groups:[]};log('🔁 '+p.name+' ganhou uma jogada extra.');broadcast();return}
    nextTurn();return;
  }
  if(a.type==='NEW_HAND'&&state.kind==='training'){p.hand=[];for(let i=0;i<14&&state.deck.length;i++)p.hand.push(state.deck.pop());if(p.hand.length<14){state.deck=buildDeck(state.mode,1);while(p.hand.length<14&&state.deck.length)p.hand.push(state.deck.pop())}state.table=[];state.draft={playerId:p.id,groups:[]};p.comboProgress=0;log('🔄 Nova mão de treino criada.');broadcast();return}
  if(a.type==='CLEAR_TABLE'&&state.kind==='training'){state.table=[];state.draft={playerId:p.id,groups:[]};log('🧹 Mesa de treino limpa.');broadcast();return}
}

function drawTo(p,n){for(let i=0;i<n&&state.deck.length;i++)p.hand.push(state.deck.pop())}
function finishWinner(p){state.status='finished';state.winner=p.id;log('🏆 '+p.name+' venceu a partida!');broadcast()}
function nextIndex(idx,steps=1){const len=state.players.length;let x=idx;for(let s=0;s<steps;s++)x=(x+state.direction+len)%len;return x}
function nextTurn(){
  let idx=state.turn;idx=nextIndex(idx,1);if(state.skipNext>0&&state.players.length>1){const skipped=state.players[idx];log('⏭️ '+skipped.name+' perdeu a vez.');state.skipNext--;idx=nextIndex(idx,1)}
  state.turn=idx;state.turnNo++;state.draft={playerId:current().id,groups:[]};
  for(const pl of state.players)if(pl.reveal&&pl.reveal.expires<state.turnNo)pl.reveal=null;
  broadcast();maybeCpu();
}
function maybeCpu(){
  clearTimeout(cpuTimer);if(!state||state.status!=='playing'||state.kind!=='cpu')return;const p=current();if(!p?.isCpu)return;
  cpuTimer=setTimeout(()=>cpuTurn(p),state.difficulty==='hard'?500:state.difficulty==='easy'?1050:750);
}

function cpuTurn(p){
  if(!state||state.status!=='playing'||current()?.id!==p.id)return;
  const groups=findCpuGroups(p.hand,state.mode,state.difficulty);
  let chosen=[];let score=0;
  for(const g of groups){chosen.push(g);score+=valid(state.mode,g).score;if(p.opened||score>=openingMin())break}
  if(!p.opened&&score<openingMin())chosen=[];
  if(chosen.length){
    const used=new Set(chosen.flat().map(t=>t.id));p.hand=p.hand.filter(t=>!used.has(t.id));
    for(const g of chosen){const v=valid(state.mode,g);state.table.push({id:'cpu'+Date.now()+Math.random(),tiles:g,label:v.label,score:v.score})}
    p.opened=true;log('🤖 '+p.name+' baixou '+chosen.length+' combinação(ões).');
    if(state.mode==='mega'){p.comboProgress+=chosen.length;const powers=Math.floor(p.comboProgress/3);p.comboProgress%=3;for(let i=0;i<powers;i++)applyPower(p,Math.random()<.5?'card':'wheel',true)}
    if(!p.hand.length){finishWinner(p);return}
  }else{drawTo(p,1);log('🤖 '+p.name+' comprou uma peça.')}
  if(state._extraTurn){state._extraTurn=false;state.draft={playerId:p.id,groups:[]};broadcast();maybeCpu();return}
  nextTurn();
}
function openingMin(){return state.mode==='classic'||state.mode==='mega'?30:state.mode==='words'?7:20}

function applyPower(p,source,auto=false){
  const wheel=[
    {k:'skip',name:'⏭️ PULA!',desc:'O próximo jogador perde a vez.'},
    {k:'reverse',name:'🔄 INVERTE!',desc:'O sentido da rodada foi invertido.'},
    {k:'draw3',name:'➕3 REVÉS!',desc:'O próximo jogador compra 3 peças.'},
    {k:'steal',name:'🫳 ROUBO!',desc:'Você pega uma peça aleatória do próximo rival.'},
    {k:'spy',name:'👁️ ESPIAR!',desc:'Você vê as peças do próximo rival por esta rodada.'},
    {k:'extra',name:'⚡ JOGUE DE NOVO!',desc:'Você ganha uma jogada extra.'},
    {k:'shield',name:'🛡️ ESCUDO!',desc:'Você fica protegido do próximo efeito negativo.'},
    {k:'selfdraw',name:'🌩️ AZAR!',desc:'Você compra 2 peças.'},
    {k:'swap',name:'🔁 TROCA!',desc:'Você troca uma peça aleatória com o próximo rival.'},
    {k:'discard',name:'🍀 SORTE!',desc:'Uma peça sua volta para o fundo do monte.'}
  ];
  const cards=[
    {k:'skip',name:'🃏 Carta Pular',desc:'O próximo jogador perde a vez.'},
    {k:'reverse',name:'🃏 Carta Inverter',desc:'Muda o sentido da rodada.'},
    {k:'draw2',name:'🃏 Carta +2',desc:'O próximo jogador compra 2 peças.'},
    {k:'steal',name:'🃏 Carta Roubar',desc:'Pegue uma peça aleatória do próximo rival.'},
    {k:'spy',name:'🃏 Carta Espião',desc:'Veja as peças do próximo rival nesta rodada.'},
    {k:'shield',name:'🃏 Carta Escudo',desc:'Bloqueia o próximo efeito negativo contra você.'},
    {k:'extra',name:'🃏 Carta Jogada Extra',desc:'Jogue novamente.'},
    {k:'swap',name:'🃏 Carta Troca',desc:'Troque uma peça aleatória com o próximo rival.'},
    {k:'wild',name:'🃏 Carta Curinga',desc:'Uma peça aleatória da sua mão vira curinga.'},
    {k:'selfdraw',name:'🃏 Carta Revés',desc:'Você compra 2 peças.'}
  ];
  const effect=randItem(source==='wheel'?wheel:cards);const target=nextOpponent(p.id);
  let msg=effect.name+' — '+effect.desc;
  const hitNegative=(t,fn)=>{if(!t)return false;if(t.shield){t.shield=false;msg+=' 🛡️ O escudo de '+t.name+' bloqueou o efeito.';return false}fn();return true};
  if(effect.k==='skip')state.skipNext++;
  if(effect.k==='reverse')state.direction*=-1;
  if(effect.k==='draw2'&&target)hitNegative(target,()=>drawTo(target,2));
  if(effect.k==='draw3'&&target)hitNegative(target,()=>drawTo(target,3));
  if(effect.k==='steal'&&target&&target.hand.length)hitNegative(target,()=>{const t=target.hand.splice(Math.floor(Math.random()*target.hand.length),1)[0];p.hand.push(t)});
  if(effect.k==='spy'&&target)hitNegative(target,()=>{p.reveal={targetId:target.id,expires:state.turnNo+1}});
  if(effect.k==='extra')state._extraTurn=true;
  if(effect.k==='shield')p.shield=true;
  if(effect.k==='selfdraw')hitNegative(p,()=>drawTo(p,2));
  if(effect.k==='swap'&&target&&target.hand.length&&p.hand.length)hitNegative(target,()=>{const ai=Math.floor(Math.random()*p.hand.length),bi=Math.floor(Math.random()*target.hand.length);[p.hand[ai],target.hand[bi]]=[target.hand[bi],p.hand[ai]]});
  if(effect.k==='discard'&&p.hand.length){const t=p.hand.splice(Math.floor(Math.random()*p.hand.length),1)[0];state.deck.unshift(t)}
  if(effect.k==='wild'&&p.hand.length){const t=randItem(p.hand);t.type='joker';t.value='★';t.color='joker';t.joker=true}
  state.lastPower={playerId:p.id,source,effect:effect.k,message:msg,at:Date.now()};log((source==='wheel'?'🎡 ':'🃏 ')+p.name+': '+msg);broadcast();if(auto&&state.pendingPower?.playerId===p.id)state.pendingPower=null;
}
function nextOpponent(pid){if(!state||state.players.length<2)return null;let i=state.players.findIndex(x=>x.id===pid);for(let s=0;s<state.players.length-1;s++){i=nextIndex(i,1);if(state.players[i].id!==pid)return state.players[i]}return null}

function valid(m,t){const base=m==='mega'?'classic':m;if(base==='classic')return nums(t);if(base==='words')return word(t);let a=nums(t);if(a.ok)return a;let b=word(t);if(b.ok)return b;let c=code(t);if(c.ok)return c;return{ok:false,msg:'No modo misto, forme grupo/sequência numérica, palavra ou código alternando letra e número.'}}
function nums(t){
  if(t.length<3||t.some(x=>!x.joker&&x.type!=='number'))return{ok:false,msg:'Grupo numérico inválido.'};const j=t.filter(x=>x.joker).length,n=t.filter(x=>!x.joker);if(!n.length)return{ok:false,msg:'Não vale usar apenas curingas.'};
  const same=n.every(x=>x.value===n[0].value)&&new Set(n.map(x=>x.color)).size===n.length&&t.length<=4;if(same)return{ok:true,label:'grupo '+n[0].value,score:t.reduce((s,x)=>s+(x.joker?n[0].value:x.value),0)};
  if(!n.every(x=>x.color===n[0].color))return{ok:false,msg:'Sequência precisa ser da mesma cor.'};const v=n.map(x=>+x.value).sort((a,b)=>a-b);if(new Set(v).size!==v.length)return{ok:false,msg:'Número repetido na sequência.'};let gaps=0;for(let i=1;i<v.length;i++)gaps+=v[i]-v[i-1]-1;if(gaps>j)return{ok:false,msg:'Faltam peças para completar a sequência.'};return{ok:true,label:'sequência '+n[0].color,score:n.reduce((s,x)=>s+x.value,0)+j*Math.max(1,Math.round(n.reduce((s,x)=>s+x.value,0)/n.length))}
}
function word(t){if(t.length<3||t.some(x=>!x.joker&&x.type!=='letter'))return{ok:false,msg:'Palavra precisa ter 3 ou mais letras.'};return{ok:true,label:'palavra '+t.map(x=>x.joker?'?':x.value).join(''),score:t.length}}
function code(t){if(t.length<6||t.some(x=>x.joker))return{ok:false,msg:'Código misto inválido.'};const start=t[0].type;if(!['letter','number'].includes(start))return{ok:false,msg:'Código inválido.'};for(let i=0;i<t.length;i++){const e=i%2===0?start:(start==='letter'?'number':'letter');if(t[i].type!==e)return{ok:false,msg:'Alterne letra e número.'}}const l=t.filter(x=>x.type==='letter').map(x=>ABC.indexOf(x.value)),n=t.filter(x=>x.type==='number').map(x=>+x.value);for(let i=1;i<l.length;i++)if(l[i]!==l[i-1]+1)return{ok:false,msg:'Letras fora de sequência.'};for(let i=1;i<n.length;i++)if(n[i]!==n[i-1]+1)return{ok:false,msg:'Números fora de sequência.'};return{ok:true,label:'código misto',score:n.reduce((a,b)=>a+b,0)+l.length*2}}

function findCpuGroups(hand,m,diff='normal'){
  const max=diff==='easy'?1:diff==='hard'?3:2,groups=[],used=new Set();
  for(let k=0;k<max;k++){const available=hand.filter(t=>!used.has(t.id));const g=findBestCombo(available,m);if(!g)break;groups.push(g);g.forEach(t=>used.add(t.id))}
  return groups;
}
function findBestCombo(hand,m){
  const base=m==='mega'?'classic':m;
  if(base==='classic'){const g=findNumberCombo(hand);if(g)return g}
  if(base==='words'){const g=findWordCombo(hand);if(g)return g}
  if(base==='mixed'){return findNumberCombo(hand)||findCodeCombo(hand)||findWordCombo(hand)}
  return null;
}
function findNumberCombo(hand){
  const numsOnly=hand.filter(t=>t.type==='number'&&!t.joker);
  const byVal={};for(const t of numsOnly)(byVal[t.value]??=[]).push(t);
  for(const v of Object.keys(byVal)){const unique=[];const seen=new Set();for(const t of byVal[v])if(!seen.has(t.color)){seen.add(t.color);unique.push(t)}if(unique.length>=3)return unique.slice(0,Math.min(4,unique.length))}
  for(const c of COLORS){const arr=numsOnly.filter(t=>t.color===c).sort((a,b)=>a.value-b.value);for(let i=0;i<arr.length;i++){let seq=[arr[i]];for(let j=i+1;j<arr.length;j++){if(arr[j].value===seq[seq.length-1].value)continue;if(arr[j].value===seq[seq.length-1].value+1)seq.push(arr[j]);else if(arr[j].value>seq[seq.length-1].value+1)break;if(seq.length>=3)return seq.slice(0,Math.min(5,seq.length))}}}
  const jok=hand.find(t=>t.joker);if(jok){for(const c of COLORS){const arr=numsOnly.filter(t=>t.color===c).sort((a,b)=>a.value-b.value);for(let i=0;i<arr.length-1;i++)if(arr[i+1].value-arr[i].value===2)return[arr[i],jok,arr[i+1]]}}
  return null;
}
function findWordCombo(hand){const letters=hand.filter(t=>t.type==='letter'&&!t.joker);if(letters.length>=3)return letters.slice(0,Math.min(5,letters.length));const j=hand.find(t=>t.joker);if(j&&letters.length>=2)return[letters[0],letters[1],j];return null}
function findCodeCombo(hand){const l=hand.filter(t=>t.type==='letter'&&!t.joker).sort((a,b)=>ABC.indexOf(a.value)-ABC.indexOf(b.value)),n=hand.filter(t=>t.type==='number'&&!t.joker).sort((a,b)=>a.value-b.value);for(let i=0;i<l.length-2;i++)for(let j=0;j<n.length-2;j++)if(ABC.indexOf(l[i+1].value)===ABC.indexOf(l[i].value)+1&&ABC.indexOf(l[i+2].value)===ABC.indexOf(l[i].value)+2&&n[j+1].value===n[j].value+1&&n[j+2].value===n[j].value+2)return[l[i],n[j],l[i+1],n[j+1],l[i+2],n[j+2]];return null}
function trainingHint(){
  if(!state||state.kind!=='training')return;const p=current(),g=findBestCombo(p.hand,state.mode);if(!g){note($('#gameNotice'),'Ainda não encontrei uma combinação pronta. Tente comprar outra peça.','ok');return}selected=g.map(t=>t.id);note($('#gameNotice'),'💡 Dica: destaquei uma combinação possível.','ok');render();
}
function sortRack(){
  const s=role==='client'?snap:null;if(role==='client'){note($('#gameNotice'),'A ordenação local será aplicada na próxima versão online.','ok');return}
  if(!state)return;const p=state.players.find(x=>x.id===clientId);if(!p)return;p.hand.sort((a,b)=>{if(a.joker!==b.joker)return a.joker?1:-1;if(a.type!==b.type)return a.type.localeCompare(b.type);if(a.type==='number')return COLORS.indexOf(a.color)-COLORS.indexOf(b.color)||a.value-b.value;return String(a.value).localeCompare(String(b.value))});broadcast();
}

function err(pid,m){if(pid===clientId&&(role==='host'||role==='local'))note($('#gameNotice'),m,'error');else{const c=conns.get(pid);if(c?.open)c.send({type:'SNAP',data:{...shot(pid),error:m}})}}
function shot(pid){
  const me=state.players.find(p=>p.id===pid);let revealHand=null,revealName=null;
  if(me?.reveal){const t=state.players.find(p=>p.id===me.reveal.targetId);if(t){revealHand=t.hand;revealName=t.name}}
  return{code:state.code,mode:state.mode,kind:state.kind,status:state.status,hostId:state.hostId,players:state.players.map(p=>({id:p.id,name:p.name,count:p.hand.length,opened:p.opened,connected:p.connected,isCpu:p.isCpu,comboProgress:p.comboProgress,shield:p.shield})),myHand:me?me.hand:[],table:state.table,draft:state.draft,turn:state.turn,direction:state.direction,deckCount:state.deck.length,winner:state.winner,log:state.log,pendingPower:state.pendingPower,lastPower:state.lastPower,revealHand,revealName,turnNo:state.turnNo};
}
function broadcast(){if(!state)return;snap=shot(clientId);render();if(role==='host')for(const [pid,c] of conns)if(c.open)c.send({type:'SNAP',data:shot(pid)})}

function render(){
  const s=role==='client'?snap:shot(clientId);if(!s)return;
  if(s.error){note($('#gameNotice'),s.error,'error');delete s.error}
  if(s.status==='lobby'){show('lobby');renderLobby();return}
  show('game');selected=selected.filter(x=>(s.myHand||[]).some(t=>t.id===x));
  const c=s.players[s.turn%s.players.length],w=s.players.find(p=>p.id===s.winner),me=s.players.find(p=>p.id===clientId);
  $('#turnText').textContent=s.status==='finished'?(w?'🏆 '+w.name+' venceu!':'Partida encerrada'):(c?.id===clientId?'🟡 Sua vez':(c?.isCpu?'🤖 '+c.name+' pensando...':'Vez de '+(c?.name||'...')));
  $('#gameMeta').textContent=PLAY_LABEL[s.kind]+' • '+modeLabel(s.mode)+(s.kind==='online'?' • Sala '+s.code:'')+' • Sentido '+(s.direction===1?'↻':'↺');
  $('#deckCount').textContent=s.deckCount;
  $('#comboPill').classList.toggle('hide',s.mode!=='mega');$('#comboCount').textContent=me?.comboProgress??0;
  $('#gamePlayers').innerHTML=s.players.map((p,i)=>`<div class="player ${i===s.turn&&s.status==='playing'?'turn':''} ${p.id===clientId?'me':''} ${p.isCpu?'cpu':''}"><b>${esc(p.name)}</b><div>${p.count} peças ${p.opened?'• aberto':''}${p.shield?' 🛡️':''}${s.mode==='mega'?` <span class="power-tag">⚡${p.comboProgress}/3</span>`:''}</div></div>`).join('');
  const gs=[...(s.table||[]),...((s.draft&&s.draft.groups)||[]).map(g=>({...g,draft:true}))];
  $('#table').innerHTML=gs.length?gs.map(g=>`<div class="group ${g.draft?'draft':''}" title="${esc(g.label||'')}">${g.tiles.map(t=>tileHtml(t,true)).join('')}</div>`).join(''):'<div class="empty">A mesa ainda está vazia.</div>';
  $('#rack').innerHTML=(s.myHand||[]).map(t=>tileHtml(t,false,selected.includes(t.id))).join('');
  $$('#rack .tile').forEach(el=>el.onclick=()=>{if(s.status!=='playing'||c?.id!==clientId||s.pendingPower)return;const id=el.dataset.id;selected.includes(id)?selected=selected.filter(x=>x!==id):selected.push(id);render()});
  const mine=s.status==='playing'&&c?.id===clientId&&!c?.isCpu;
  ['playBtn','undoBtn','endBtn','drawBtn'].forEach(x=>$('#'+x).disabled=!mine||!!s.pendingPower);
  $('#trainingTools').classList.toggle('hide',s.kind!=='training');
  const powerMine=s.mode==='mega'&&s.pendingPower?.playerId===clientId;
  $('#powerPanel').classList.toggle('hide',!powerMine);$('#cardBtn').disabled=!powerMine;$('#wheelBtn').disabled=!powerMine;
  if(s.lastPower&&Date.now()-s.lastPower.at<20000){$('#powerResult').textContent=s.lastPower.message;$('#powerResult').classList.remove('hide')}else $('#powerResult').classList.add('hide');
  if(s.revealHand?.length){$('#spyPanel').innerHTML=`<b>👁️ Espiando ${esc(s.revealName||'rival')}</b><div class="spy-tiles">${s.revealHand.map(t=>tileHtml(t,true)).join('')}</div>`;$('#spyPanel').classList.remove('hide')}else $('#spyPanel').classList.add('hide');
  $('#log').innerHTML=(s.log||[]).map(x=>`<div>${esc(x.m)}</div>`).join('');
  if(s.kind==='cpu'&&c?.isCpu)$('#game').classList.add('cpu-thinking');else $('#game').classList.remove('cpu-thinking');
}
function tileHtml(t,small=false,sel=false){const cls=['tile',small?'small':'',t.joker?'joker':(t.type==='letter'?'letter':t.color||''),sel?'selected':''].filter(Boolean).join(' ');return`<div class="${cls}" data-id="${esc(t.id)}">${esc(t.value)}</div>`}

})();
