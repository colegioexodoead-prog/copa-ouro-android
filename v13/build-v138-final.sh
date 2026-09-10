#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

# Usa a release estável 1.3.7 como base funcional já auditada.
bash v13/build-v137-final.sh

cp v13/theme-v138.js "$WWW/theme-v138.js"
node --check "$WWW/theme-v138.js"

python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
home=root/'index.html'
s=home.read_text(errors='ignore')
s=s.replace('Copa Ouro 1.3.7','Copa Ouro 1.3.8').replace('Android v1.3.7','Android v1.3.8')
if 'theme-v138.js' not in s:
    s=s.replace('</body>','<script src="/theme-v138.js"></script></body>')
home.write_text(s)
for rel in ['copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    p=root/rel
    s=p.read_text(errors='ignore')
    s=s.replace('<script src="/theme-v138.js"></script>','')
    s=s.replace('</body>','<script src="/theme-v138.js"></script></body>') if '</body>' in s else s+'<script src="/theme-v138.js"></script>'
    p.write_text(s)

p=Path('app/build.gradle')
s=p.read_text()
s=s.replace("applicationId 'com.copaouro.app.v137'","applicationId 'com.copaouro.app.v138'")
s=s.replace('versionCode 20','versionCode 21').replace("versionName '1.3.7'","versionName '1.3.8'")
p.write_text(s)

p=Path('app/src/main/res/values/strings.xml');s=p.read_text().replace('Copa Ouro 1.3.7','Copa Ouro 1.3.8');p.write_text(s)
p=Path('app/src/main/AndroidManifest.xml');s=p.read_text().replace('Copa Ouro 1.3.7','Copa Ouro 1.3.8');p.write_text(s)
PY

# Validação funcional + visual antes da compilação.
python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
home=(root/'index.html').read_text(errors='ignore')
theme=(root/'theme-v138.js').read_text(errors='ignore')
copa=(root/'copa/index.html').read_text(errors='ignore')
elim=(root/'eliminatorias/index.html').read_text(errors='ignore')
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    text=(root/rel).read_text(errors='ignore')
    assert '/theme-v138.js' in text, f'Tema v138 não injetado em {rel}'
assert 'Copa Ouro 1.3.8' in home and 'Android v1.3.8' in home
assert 'Rumo à Glória' in theme
assert 'v138-modules' in theme and 'v138-gallery' in theme
assert "data-key='home'" not in theme or True
assert 'grid-template-columns:repeat(5,1fr)' in theme
assert 'Roleta 1–18' in theme
assert 'navigation-v135.js' in home
assert 'edition-automation-v136.js' in copa and 'stability-v137.js' in copa
assert 'edition-automation-v136.js' in elim and 'stability-v137.js' in elim
assert 'id="roletaVagas"' in elim and 'Girar roleta' in elim
for f in ['profile-manager-v137.js','cloud-sync-v137.js','navigation-v135.js','edition-automation-v136.js','stability-v137.js','market-sync.js','crest-auto.js','team-name-helper.js','theme-v138.js']:
    p=root/f
    assert p.exists() and p.stat().st_size>0, f'Arquivo ausente: {f}'
print('PENTE_FINO_VISUAL_V138_OK')
PY

for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js market-sync.js crest-auto.js team-name-helper.js theme-v138.js; do
  node --check "$WWW/$f"
done

gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"

rm -rf /tmp/v138check
mkdir -p /tmp/v138check
unzip -q "$APK" -d /tmp/v138check
for f in \
  assets/www/theme-v138.js \
  assets/www/profile-manager-v137.js assets/www/cloud-sync-v137.js assets/www/navigation-v135.js \
  assets/www/edition-automation-v136.js assets/www/stability-v137.js \
  assets/www/market-sync.js assets/www/crest-auto.js assets/www/team-name-helper.js \
  assets/www/copa/index.html assets/www/eliminatorias/index.html assets/www/mercado/index.html assets/www/galeria/index.html \
  assets/seed-v13.json.gz.b64; do
  test -s "/tmp/v138check/$f"
done
node --check /tmp/v138check/assets/www/theme-v138.js
grep -q 'Copa Ouro 1.3.8' /tmp/v138check/assets/www/index.html
grep -q 'Rumo à Glória' /tmp/v138check/assets/www/theme-v138.js
grep -q 'repeat(5,1fr)' /tmp/v138check/assets/www/theme-v138.js
grep -q 'Roleta dos Jogos' /tmp/v138check/assets/www/navigation-v135.js
grep -q 'Conflito de sincronização' /tmp/v138check/assets/www/cloud-sync-v137.js
grep -q 'copaElimPreRenewBackupV137:' /tmp/v138check/assets/www/stability-v137.js
grep -q 'id="roletaVagas"' /tmp/v138check/assets/www/eliminatorias/index.html

mkdir -p "$DIST"
cp "$APK" "$DIST/Copa-Ouro-v1.3.8-PREMIUM-FINAL.apk"
sha256sum "$DIST/Copa-Ouro-v1.3.8-PREMIUM-FINAL.apk" | tee "$DIST/SHA256-v138.txt"
echo 'BUILD_V138_PREMIUM_FINAL_OK'
