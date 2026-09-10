#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

# Base funcional: v1.3.8 PREMIUM com reset seguro e todos os módulos existentes.
bash v13/build-v138-final.sh

cp v13/contrast-fix-v139.js "$WWW/contrast-fix-v139.js"
node --check "$WWW/contrast-fix-v139.js"

python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    p=root/rel
    s=p.read_text(errors='ignore')
    s=s.replace('<script src="/contrast-fix-v139.js"></script>','')
    inject='<script src="/contrast-fix-v139.js"></script>'
    s=s.replace('</body>',inject+'</body>') if '</body>' in s else s+inject
    s=s.replace('Copa Ouro 1.3.8','Copa Ouro 1.3.9').replace('Android v1.3.8','Android v1.3.9')
    p.write_text(s)

p=Path('app/build.gradle')
s=p.read_text()
s=s.replace("applicationId 'com.copaouro.app.v138'","applicationId 'com.copaouro.app.v139'")
s=s.replace('versionCode 21','versionCode 22').replace("versionName '1.3.8'","versionName '1.3.9'")
p.write_text(s)

for rel in ['app/src/main/res/values/strings.xml','app/src/main/AndroidManifest.xml']:
    p=Path(rel);s=p.read_text().replace('Copa Ouro 1.3.8','Copa Ouro 1.3.9');p.write_text(s)
PY

# Validações de contraste e preservação funcional.
python3 - <<'PY'
from pathlib import Path
root=Path('app/src/main/assets/www')
fix=(root/'contrast-fix-v139.js').read_text(errors='ignore')
for rel in ['index.html','copa/index.html','eliminatorias/index.html','mercado/index.html','galeria/index.html']:
    text=(root/rel).read_text(errors='ignore')
    assert '/theme-v138.js' in text, f'Tema premium ausente em {rel}'
    assert '/contrast-fix-v139.js' in text, f'Correção v139 ausente em {rel}'
    assert '/reset-v138.js' in text, f'Reset seguro ausente em {rel}'
assert 'co-v139-mercado' in fix and 'co-v139-galeria' in fix
assert 'var(--ink,#10251c)' in fix
assert 'var(--ink,#142018)' in fix
assert '.winner h3' in fix and '.teams h3' in fix and '.club h3' in fix
assert '#fed-champions-extra .fed-team h3' in fix
assert '.rankPanel .rankList>div>span>strong' in fix
assert 'co-v139-copa' in fix and 'co-v139-eliminatorias' in fix
assert (root/'reset-v138.js').exists()
assert 'Zerar Copa' in (root/'reset-v138.js').read_text(errors='ignore')
assert 'id="roletaVagas"' in (root/'eliminatorias/index.html').read_text(errors='ignore')
assert 'Roleta dos Jogos' in (root/'navigation-v135.js').read_text(errors='ignore')
print('CONTRASTE_V139_VALIDADO')
PY

for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js market-sync.js crest-auto.js team-name-helper.js theme-v138.js reset-v138.js contrast-fix-v139.js; do
  node --check "$WWW/$f"
done

gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"

rm -rf /tmp/v139check
mkdir -p /tmp/v139check
unzip -q "$APK" -d /tmp/v139check
for f in \
  assets/www/theme-v138.js assets/www/contrast-fix-v139.js assets/www/reset-v138.js \
  assets/www/profile-manager-v137.js assets/www/cloud-sync-v137.js assets/www/navigation-v135.js \
  assets/www/edition-automation-v136.js assets/www/stability-v137.js \
  assets/www/market-sync.js assets/www/crest-auto.js assets/www/team-name-helper.js \
  assets/www/copa/index.html assets/www/eliminatorias/index.html assets/www/mercado/index.html assets/www/galeria/index.html \
  assets/seed-v13.json.gz.b64; do
  test -s "/tmp/v139check/$f"
done
node --check /tmp/v139check/assets/www/contrast-fix-v139.js
grep -q 'co-v139-mercado' /tmp/v139check/assets/www/contrast-fix-v139.js
grep -q 'co-v139-galeria' /tmp/v139check/assets/www/contrast-fix-v139.js
grep -q 'Zerar Copa' /tmp/v139check/assets/www/reset-v138.js
grep -q 'id="roletaVagas"' /tmp/v139check/assets/www/eliminatorias/index.html

mkdir -p "$DIST"
cp "$APK" "$DIST/Copa-Ouro-v1.3.9-CONTRASTE-CORRIGIDO.apk"
sha256sum "$DIST/Copa-Ouro-v1.3.9-CONTRASTE-CORRIGIDO.apk" | tee "$DIST/SHA256-v139.txt"
echo 'BUILD_V139_CONTRASTE_CORRIGIDO_OK'
