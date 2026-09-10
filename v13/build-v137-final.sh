#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$PWD"
WWW="$ROOT_DIR/app/src/main/assets/www"
DIST="$ROOT_DIR/dist"

cat > settings.gradle <<'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='CopaOuroV137Final'
include ':app'
EOF
cat > build.gradle <<'EOF'
plugins { id 'com.android.application' version '8.7.3' apply false }
EOF
cat > gradle.properties <<'EOF'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
EOF

mkdir -p app/src/main/java/com/copaouro/app/v13 app/src/main/res/values app/src/main/res/drawable-nodpi "$WWW"
cp v13/MainActivity.java app/src/main/java/com/copaouro/app/v13/MainActivity.java
cp v13/profile-manager-v137.js "$WWW/profile-manager-v137.js"
cp v13/cloud-sync-v137.js "$WWW/cloud-sync-v137.js"
cp v13/navigation-v135.js "$WWW/navigation-v135.js"
cp v13/edition-automation-v136.js "$WWW/edition-automation-v136.js"
cp v13/stability-v137.js "$WWW/stability-v137.js"
cp seed/seed-v12.json.gz.b64 app/src/main/assets/seed-v13.json.gz.b64

for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js; do
  node --check "$WWW/$f"
done

python3 - <<'PY'
from pathlib import Path
import hashlib
parts=sorted(Path('v13/icon-parts').glob('part*.hex'))
assert len(parts)==12, 'Partes do ícone incompletas'
raw=bytes.fromhex(''.join(p.read_text().strip() for p in parts))
assert len(raw)==5811, 'Tamanho inesperado do ícone'
assert hashlib.sha256(raw).hexdigest()=='38baa84623daa5c1caf912b028259ea1f2ca85205a150e0a0f0998bc40daf742','Hash do ícone diferente'
Path('app/src/main/res/drawable-nodpi/copa_ouro_icon_photo.jpg').write_bytes(raw)
PY

cat > app/build.gradle <<'EOF'
plugins { id 'com.android.application' }
android {
  namespace 'com.copaouro.app.v13'
  compileSdk 35
  defaultConfig {
    applicationId 'com.copaouro.app.v137'
    minSdk 24
    targetSdk 35
    versionCode 20
    versionName '1.3.7'
  }
}
EOF
cat > app/src/main/res/values/strings.xml <<'EOF'
<resources><string name="app_name">Copa Ouro 1.3.7</string></resources>
EOF
cat > app/src/main/res/values/styles.xml <<'EOF'
<resources><style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar"><item name="android:fontFamily">sans</item><item name="android:colorAccent">#D4AF37</item><item name="android:navigationBarColor">#07150D</item><item name="android:statusBarColor">#07150D</item><item name="android:windowLightStatusBar">false</item></style></resources>
EOF
cat > app/src/main/AndroidManifest.xml <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <application android:theme="@style/AppTheme" android:label="Copa Ouro 1.3.7" android:icon="@drawable/copa_ouro_icon_photo" android:roundIcon="@drawable/copa_ouro_icon_photo" android:usesCleartextTraffic="false" android:allowBackup="true">
    <activity android:name="com.copaouro.app.v13.MainActivity" android:exported="true">
      <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
    </activity>
  </application>
</manifest>
EOF

cd "$WWW"
wget -q --recursive --level=4 --page-requisites --no-host-directories --reject="*.map" \
  https://ourocopa.netlify.app/copa/ \
  https://ourocopa.netlify.app/eliminatorias/ \
  https://ourocopa.netlify.app/mercado/ \
  https://ourocopa.netlify.app/galeria/ || true
for f in market-sync.js crest-auto.js team-name-helper.js crest-auto.css team-name-helper.css; do
  if [ ! -s "$f" ]; then wget -q "https://ourocopa.netlify.app/$f" -O "$f" || true; fi
  test -s "$f"
done
test -s copa/index.html
test -s eliminatorias/index.html
test -s mercado/index.html
test -s galeria/index.html
cd "$ROOT_DIR"

cp v13/index.html "$WWW/index.html"
python3 - <<'PY'
from pathlib import Path
import re
root=Path('app/src/main/assets/www')
home=root/'index.html'
s=home.read_text()
s=s.replace('Copa Ouro 1.3.3','Copa Ouro 1.3.7').replace('Copa Ouro 1.3.5','Copa Ouro 1.3.7').replace('Copa Ouro 1.3.6','Copa Ouro 1.3.7')
s=s.replace('Android v1.3.3','Android v1.3.7').replace('Android v1.3.5','Android v1.3.7').replace('Android v1.3.6','Android v1.3.7')
s=s.replace('/profile-manager-v13.js','/profile-manager-v137.js').replace('/cloud-sync-v13.js','/cloud-sync-v137.js')
if 'navigation-v135.js' not in s:
    s=s.replace('</body>','<script src="/navigation-v135.js"></script></body>')
home.write_text(s)

modules=[root/'copa/index.html',root/'eliminatorias/index.html',root/'mercado/index.html',root/'galeria/index.html']
for p in modules:
    s=p.read_text(errors='ignore')
    s=re.sub(r'<script[^>]+src=["\']/\.netlify/[^"\']+["\'][^>]*></script>','',s,flags=re.I)
    for old in [
        '<script src="/sync-bridge.js"></script>','<script src="sync-bridge.js"></script>','<script src="/online-sync-bridge.js"></script>',
        '<script src="/profile-manager-v13.js"></script>','<script src="/profile-manager-v137.js"></script>',
        '<script src="/cloud-sync-v13.js"></script>','<script src="/cloud-sync-v137.js"></script>',
        '<script src="/navigation-v135.js"></script>','<script src="/edition-automation-v136.js"></script>','<script src="/stability-v137.js"></script>'
    ]:
        s=s.replace(old,'')
    if '<head>' in s:
        s=s.replace('<head>','<head><script src="/profile-manager-v137.js"></script>',1)
    else:
        s='<script src="/profile-manager-v137.js"></script>'+s
    tail='<script src="/navigation-v135.js"></script>'
    if p in [root/'copa/index.html',root/'eliminatorias/index.html']:
        tail+='<script src="/edition-automation-v136.js"></script><script src="/stability-v137.js"></script>'
    tail+='<script src="/cloud-sync-v137.js"></script>'
    s=s.replace('</body>',tail+'</body>') if '</body>' in s else s+tail
    p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse, unquote
import base64,gzip,json,re
root=Path('app/src/main/assets/www').resolve()
critical=['market-sync.js','crest-auto.js','team-name-helper.js','crest-auto.css','team-name-helper.css','profile-manager-v137.js','cloud-sync-v137.js','navigation-v135.js','edition-automation-v136.js','stability-v137.js']
for f in critical:
    p=root/f
    assert p.exists() and p.stat().st_size>0, f'Arquivo crítico ausente: {f}'

pages=[root/'index.html',root/'copa/index.html',root/'eliminatorias/index.html',root/'mercado/index.html',root/'galeria/index.html']
texts={p:p.read_text(errors='ignore') for p in pages}
home=texts[pages[0]];copa=texts[pages[1]];elim=texts[pages[2]];market=texts[pages[3]];gallery=texts[pages[4]]
stable=(root/'stability-v137.js').read_text();cloud=(root/'cloud-sync-v137.js').read_text();profile=(root/'profile-manager-v137.js').read_text();auto=(root/'edition-automation-v136.js').read_text();nav=(root/'navigation-v135.js').read_text()

assert 'Copa Ouro 1.3.7' in home and 'Android v1.3.7' in home
assert 'Salvar senha neste aparelho' in home
assert 'profile-manager-v137.js' in home and 'cloud-sync-v137.js' in home
assert 'stability-v137.js' in copa and 'stability-v137.js' in elim
assert 'copaElimPreRenewBackupV137:' in stable
assert "localStorage.setItem(ROULETTE_KEY" in stable
assert '__reserved_v137__' in stable and 'reservedMatchSlots' in stable
assert 'Conflito de sincronização' in cloud and "requestGet('before-put')" in cloud
assert "pendingRaw=''" in cloud and 'setTimeout(()=>{if(snapshot()!==cache)put()},80)' in cloud
assert 'copaCloudBaseV137:' in profile and 'copaCloudConflictV137:' in profile
assert "next.slots[36]=champNew" in auto and "status:'direct'" in auto and "status:'dispute'" in auto
assert 'playoffWinners' in auto and 'table.slice(0,8)' in auto
assert 'Roleta dos Jogos' in nav and 'Array.from({length:18}' in nav
assert 'id="roletaVagas"' in elim and 'Girar roleta' in elim
assert '/.netlify/scripts/hud' not in copa+elim+market+gallery

seed=json.loads(gzip.decompress(base64.b64decode(Path('app/src/main/assets/seed-v13.json.gz.b64').read_text().strip())))
data=seed.get('local') or seed.get('remote') or {}
assert {'elimCopaOuro','copaOuroQualified','copaOuroTeamDraft','copa-ouro-edicoes-v1','copaOuroMercadoV2'}.issubset(data)

# Confere src/href locais respeitando a pasta de cada HTML.
def resolve_local(page,u):
    raw=u.strip().split('?',1)[0].split('#',1)[0]
    if not raw or raw.startswith(('http:','https:','data:','mailto:','tel:','#','javascript:','/.netlify/','/api/')):
        return None
    raw=unquote(raw)
    if raw.startswith('/'):
        target=root/raw.lstrip('/')
    else:
        target=page.parent/raw
    target=target.resolve()
    try: target.relative_to(root)
    except ValueError: raise AssertionError(f'Referência escapando do pacote: {u} em {page.relative_to(root)}')
    if raw.endswith('/'):
        target=target/'index.html'
    return target

for page,html in texts.items():
    for u in re.findall(r'(?:src|href)=["\']([^"\']+)',html,re.I):
        target=resolve_local(page,u)
        if target is not None:
            assert target.exists(),f'Referência local ausente: {u} em {page.relative_to(root)} -> {target.relative_to(root)}'

# Confere assets locais usados nos CSS baixados.
for css in root.rglob('*.css'):
    text=css.read_text(errors='ignore')
    for u in re.findall(r'url\(["\']?([^"\')]+)',text,re.I):
        target=resolve_local(css,u)
        if target is not None:
            assert target.exists(),f'Asset CSS ausente: {u} em {css.relative_to(root)}'

print('PENTE_FINO_V137_FINAL_OK')
PY

for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js market-sync.js crest-auto.js team-name-helper.js; do
  node --check "$WWW/$f"
done

# Compilação Android
gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"

# Auditoria interna do APK
for f in \
  assets/www/market-sync.js assets/www/crest-auto.js assets/www/team-name-helper.js \
  assets/www/crest-auto.css assets/www/team-name-helper.css \
  assets/www/profile-manager-v137.js assets/www/cloud-sync-v137.js assets/www/navigation-v135.js \
  assets/www/edition-automation-v136.js assets/www/stability-v137.js \
  assets/www/copa/index.html assets/www/eliminatorias/index.html assets/www/mercado/index.html assets/www/galeria/index.html \
  assets/seed-v13.json.gz.b64; do
  unzip -l "$APK" | grep -q "$f"
done

rm -rf /tmp/v137apkcheck
mkdir -p /tmp/v137apkcheck
unzip -q "$APK" -d /tmp/v137apkcheck
for f in profile-manager-v137.js cloud-sync-v137.js navigation-v135.js edition-automation-v136.js stability-v137.js market-sync.js crest-auto.js team-name-helper.js; do
  node --check "/tmp/v137apkcheck/assets/www/$f"
done

grep -q 'Copa Ouro 1.3.7' /tmp/v137apkcheck/assets/www/index.html
grep -q 'Salvar senha neste aparelho' /tmp/v137apkcheck/assets/www/index.html
grep -q 'copaElimPreRenewBackupV137:' /tmp/v137apkcheck/assets/www/stability-v137.js
grep -q 'Conflito de sincronização' /tmp/v137apkcheck/assets/www/cloud-sync-v137.js
! grep -R -q '/.netlify/scripts/hud' /tmp/v137apkcheck/assets/www/copa/index.html /tmp/v137apkcheck/assets/www/eliminatorias/index.html /tmp/v137apkcheck/assets/www/mercado/index.html /tmp/v137apkcheck/assets/www/galeria/index.html

mkdir -p "$DIST"
cp "$APK" "$DIST/Copa-Ouro-v1.3.7-FINAL-ESTAVEL.apk"
sha256sum "$DIST/Copa-Ouro-v1.3.7-FINAL-ESTAVEL.apk" | tee "$DIST/SHA256.txt"
echo 'BUILD_V137_FINAL_OK'
