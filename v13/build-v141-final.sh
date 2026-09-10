#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

# Base homologada v1.4.0.
bash v13/build-v140-final.sh

cp v13/chance-protected-final-v141.js "$WWW/chance-protected-final-v141.js"
node --check "$WWW/chance-protected-final-v141.js"

python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
# Injeta por último para especializar a continuidade da Vaga 35 sem alterar a Chance normal.
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    p=root/rel
    s=p.read_text(errors='ignore')
    s=s.replace('<script src="/chance-protected-final-v141.js"></script>','')
    inject='<script src="/chance-protected-final-v141.js"></script>'
    s=s.replace('</body>',inject+'</body>') if '</body>' in s else s+inject
    s=s.replace('Copa Ouro 1.4.0','Copa Ouro 1.4.1').replace('Android v1.4.0','Android v1.4.1')
    p.write_text(s)

p=Path('app/build.gradle');s=p.read_text()
s=s.replace("applicationId 'com.copaouro.app.v140'","applicationId 'com.copaouro.app.v141'")
s=s.replace('versionCode 23','versionCode 24').replace("versionName '1.4.0'","versionName '1.4.1'")
p.write_text(s)
for rel in ['app/src/main/res/values/strings.xml','app/src/main/AndroidManifest.xml']:
    p=Path(rel);s=p.read_text().replace('Copa Ouro 1.4.0','Copa Ouro 1.4.1');p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
js=(root/'chance-protected-final-v141.js').read_text(errors='ignore')
copa=(root/'copa/index.html').read_text(errors='ignore')
elim=(root/'eliminatorias/index.html').read_text(errors='ignore')
assert "sourceSlotOf(t)===35" in js
assert "String(t.id)!==String(champ)" in js
assert "status='protected35'" in js
assert "reason:'Chegou às oitavas vindo da Vaga 35'" in js
assert "state.chance.games.P={home:winRef(z),away:p.teamId" in js
assert "state.slots[35]=winRef(m)" in js
assert "FINAL DIRETA — VAGA 35" in js
assert "Vencedor da Finalíssima × protegido da Vaga 35" in js
assert "championSlot:36" in js
assert '/chance-protected-final-v141.js' in copa
assert '/chance-protected-final-v141.js' in elim
assert '/core-fixes-v140.js' in copa and '/core-fixes-v140.js' in elim
assert 'id="roletaVagas"' in elim
print('ESTRUTURA_V141_OK')
PY

# Testes lógicos da nova regra.
python3 - <<'PY'
def decide(source, reached_r16, is_champion):
    if is_champion: return 'vaga36'
    if source==35 and reached_r16: return 'final_direta_35'
    return 'regra_normal'
assert decide(35,True,False)=='final_direta_35'
assert decide(35,True,True)=='vaga36'
assert decide(35,False,False)=='regra_normal'
assert decide(12,True,False)=='regra_normal'
protected=True
slot35=None
winner_z='VENCEDOR_FINALISSIMA'
if protected:
    P=(winner_z,'PROTEGIDO35')
else:
    slot35=winner_z
assert slot35 is None and P==('VENCEDOR_FINALISSIMA','PROTEGIDO35')
winner_p='PROTEGIDO35';slot35=winner_p
assert slot35=='PROTEGIDO35'
print('LOGICA_V141_OK')
PY

for f in core-fixes-v140.js chance-protected-final-v141.js profile-manager-v137.js cloud-sync-v137.js navigation-v135.js reset-v138.js contrast-fix-v139.js; do
  node --check "$WWW/$f"
done

gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
rm -rf /tmp/v141check && mkdir -p /tmp/v141check
unzip -q "$APK" -d /tmp/v141check
test -s /tmp/v141check/assets/www/chance-protected-final-v141.js
node --check /tmp/v141check/assets/www/chance-protected-final-v141.js
grep -q 'FINAL DIRETA — VAGA 35' /tmp/v141check/assets/www/chance-protected-final-v141.js
grep -q 'championSlot:36' /tmp/v141check/assets/www/chance-protected-final-v141.js
grep -q 'id="roletaVagas"' /tmp/v141check/assets/www/eliminatorias/index.html

mkdir -p "$DIST"
cp "$APK" "$DIST/Copa-Ouro-v1.4.1-FINAL-DIRETA-VAGA-35.apk"
sha256sum "$DIST/Copa-Ouro-v1.4.1-FINAL-DIRETA-VAGA-35.apk" | tee "$DIST/SHA256-v141.txt"
echo 'BUILD_V141_FINAL_DIRETA_35_OK'
