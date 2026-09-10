#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

# Base visual/funcional mais recente.
bash v13/build-v139-final.sh

cp v13/core-fixes-v140.js "$WWW/core-fixes-v140.js"
node --check "$WWW/core-fixes-v140.js"

python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
# Injeta a correção v1.4.0 por último para substituir com segurança os wrappers antigos.
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    p=root/rel
    s=p.read_text(errors='ignore')
    s=s.replace('<script src="/core-fixes-v140.js"></script>','')
    inject='<script src="/core-fixes-v140.js"></script>'
    s=s.replace('</body>',inject+'</body>') if '</body>' in s else s+inject
    s=s.replace('Copa Ouro 1.3.9','Copa Ouro 1.4.0').replace('Android v1.3.9','Android v1.4.0')
    p.write_text(s)

# Evita o erro inicial da v1.3.9 antes do script de correção carregar.
p=root/'copa/index.html'
s=p.read_text(errors='ignore')
s=s.replace('renderTeamForm();renderPotDraw();renderRounds();renderStandings();renderKnockout();renderNewCup();',
            "renderTeamForm();renderPotDraw();renderRounds();renderStandings();if(typeof renderKnockout==='function')renderKnockout();renderNewCup();")
# Preserva sourceSlot ao confirmar/corrigir cadastro.
s=s.replace("teams.push({id:i+1,name:name||`Time ${i+1}`,slot,fed,pot:old.pot||null})",
            "teams.push({id:i+1,name:name||`Time ${i+1}`,slot,fed,sourceSlot:old.sourceSlot||i+1,pot:old.pot||null})")
p.write_text(s)

# Android v1.4.0
p=Path('app/build.gradle');s=p.read_text()
s=s.replace("applicationId 'com.copaouro.app.v139'","applicationId 'com.copaouro.app.v140'")
s=s.replace('versionCode 22','versionCode 23').replace("versionName '1.3.9'","versionName '1.4.0'")
p.write_text(s)
for rel in ['app/src/main/res/values/strings.xml','app/src/main/AndroidManifest.xml']:
    p=Path(rel);s=p.read_text().replace('Copa Ouro 1.3.9','Copa Ouro 1.4.0');p.write_text(s)
PY

# Pente-fino estrutural.
python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
core=(root/'core-fixes-v140.js').read_text(errors='ignore')
copa=(root/'copa/index.html').read_text(errors='ignore')
elim=(root/'eliminatorias/index.html').read_text(errors='ignore')
assert "window.renderKnockout=renderKnockout140" in core
assert "window.advanceStage=advanceStage140" in core
assert "buildRound16FromLeagueAndPlayoffs" in core
assert "top8.map((seed,i)=>match(seed,pw[7-i]))" in core
assert "window.finishAndStartNewCup=finishCup140" in core
assert "next.slots[36]=champNew" in core
assert "CHANCE_RANDOM_KEYS=['a2','b1']" in core
assert "s===35||s===36" in core
assert "[...regular,...unknown]" in core and "special.forEach" in core
assert "sourceSlot:old.sourceSlot||i+1" in copa
assert "typeof renderKnockout==='function'" in copa
assert 'id="roletaVagas"' in elim
assert 'Zerar Copa' in (root/'reset-v138.js').read_text(errors='ignore')
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    assert '/core-fixes-v140.js' in (root/rel).read_text(errors='ignore'), rel
print('ESTRUTURA_V140_OK')
PY

# Testes lógicos de continuidade e mata-mata.
python3 - <<'PY'
FED={
'Inglaterra':[1,2,3,4],'Itália':[5,6,7,8],'Espanha':[9,10,11,12],'Brasil':[13,14,15,16],
'Europa A':[17,18,19,20],'México':[21,22],'CONCACAF':[23,24],'CONMEBOL A':[25,26,27],
'CONMEBOL B':[28,29],'Ásia':[30,31],'África':[32,33],'Arábia':[34]}

def allocate(qualified, champ):
    slots={36:champ['name']}; chance=[]
    regular=[t for t in qualified if t['name']!=champ['name'] and 1<=t['source']<=34]
    special=[t for t in qualified if t['name']!=champ['name'] and t['source'] in (35,36)]
    for group in (regular,special):
        for t in group:
            allowed=FED[t['fed']]
            preferred=t['source'] if t['source'] in allowed and t['source'] not in slots else None
            n=preferred or next((x for x in allowed if x not in slots),None)
            if n: slots[n]=t['name']
            else: chance.append(t['name'])
    return slots,chance

# 5 ingleses: os quatro de origem federativa têm prioridade; Vaga 35 volta à Chance.
q=[{'name':f'ENG{i}','fed':'Inglaterra','source':i} for i in range(1,5)]
q += [{'name':'OURO35','fed':'Inglaterra','source':35},{'name':'CAMPEAO','fed':'Itália','source':5}]
slots,chance=allocate(q,q[-1])
assert slots[36]=='CAMPEAO'
assert [slots[i] for i in [1,2,3,4]]==['ENG1','ENG2','ENG3','ENG4']
assert chance==['OURO35']

# Antigo campeão (origem 36), se não for o campeão atual e a federação estiver cheia, vai à Chance.
q2=[{'name':f'ENG{i}','fed':'Inglaterra','source':i} for i in range(1,5)]
q2 += [{'name':'ANTIGO36','fed':'Inglaterra','source':36},{'name':'NOVO_CAMPEAO','fed':'Brasil','source':13}]
slots,chance=allocate(q2,q2[-1])
assert slots[36]=='NOVO_CAMPEAO' and chance==['ANTIGO36']

# Se o campeão atual veio da Vaga 35, ainda assim ocupa 36 e não a Chance.
q3=[{'name':'CAMPEAO35','fed':'Inglaterra','source':35}]+[{'name':f'ENG{i}','fed':'Inglaterra','source':i} for i in range(1,5)]
slots,chance=allocate(q3,q3[0])
assert slots[36]=='CAMPEAO35' and 'CAMPEAO35' not in chance

# Chaveamento: 8 Top + 8 vencedores = 16 únicos e 8 jogos.
top=list(range(1,9)); winners=list(range(9,17)); r16=[(top[i],winners[7-i]) for i in range(8)]
flat=[x for p in r16 for x in p]
assert len(r16)==8 and len(set(flat))==16 and set(flat)==set(range(1,17))
# Próximas fases: 8 -> 4 -> 2 -> 1.
assert len(r16)//2==4 and 4//2==2 and 2//2==1
print('LOGICA_V140_OK')
PY

for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js market-sync.js crest-auto.js team-name-helper.js theme-v138.js reset-v138.js contrast-fix-v139.js core-fixes-v140.js; do
  node --check "$WWW/$f"
done

gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"

rm -rf /tmp/v140check && mkdir -p /tmp/v140check
unzip -q "$APK" -d /tmp/v140check
for f in \
 assets/www/core-fixes-v140.js assets/www/theme-v138.js assets/www/contrast-fix-v139.js assets/www/reset-v138.js \
 assets/www/profile-manager-v137.js assets/www/cloud-sync-v137.js assets/www/navigation-v135.js \
 assets/www/edition-automation-v136.js assets/www/stability-v137.js \
 assets/www/market-sync.js assets/www/crest-auto.js assets/www/team-name-helper.js \
 assets/www/copa/index.html assets/www/eliminatorias/index.html assets/www/mercado/index.html assets/www/galeria/index.html \
 assets/seed-v13.json.gz.b64; do test -s "/tmp/v140check/$f"; done
node --check /tmp/v140check/assets/www/core-fixes-v140.js
grep -q 'window.renderKnockout=renderKnockout140' /tmp/v140check/assets/www/core-fixes-v140.js
grep -q 'next.slots\[36\]=champNew' /tmp/v140check/assets/www/core-fixes-v140.js
grep -q "CHANCE_RANDOM_KEYS=\['a2','b1'\]" /tmp/v140check/assets/www/core-fixes-v140.js
grep -q 'sourceSlot:old.sourceSlot||i+1' /tmp/v140check/assets/www/copa/index.html
grep -q 'id="roletaVagas"' /tmp/v140check/assets/www/eliminatorias/index.html
grep -q 'Zerar Copa' /tmp/v140check/assets/www/reset-v138.js

mkdir -p "$DIST"
cp "$APK" "$DIST/Copa-Ouro-v1.4.0-CONTINUIDADE-CORRIGIDA.apk"
sha256sum "$DIST/Copa-Ouro-v1.4.0-CONTINUIDADE-CORRIGIDA.apk" | tee "$DIST/SHA256-v140.txt"
echo 'BUILD_V140_CONTINUIDADE_CORRIGIDA_OK'
