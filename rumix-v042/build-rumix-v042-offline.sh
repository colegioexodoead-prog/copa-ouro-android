#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist-v042"
PASS='RumiMixArenaOffline042'

rm -rf app "$DIST" aligned-v042.apk rumix-v042-release.jks
mkdir -p app/src/main/java/com/rumix/arena/offline app/src/main/res/values app/src/main/res/drawable "$WWW" "$DIST"

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaOffline'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

cp rumix-v042/MainActivity.java app/src/main/java/com/rumix/arena/offline/MainActivity.java
cp rumix-v042/index.html "$WWW/index.html"
cp rumix-v042/app.js "$WWW/app.js"
cp rumix-v04/style.css "$WWW/style.css"

node --check "$WWW/app.js"
grep -q 'Offline SAFE' "$WWW/index.html"
grep -q "const COLORS=\['red','blue','orange','black'\]" "$WWW/app.js"
grep -q 'makeDeck' "$WWW/app.js"
grep -q 'validateGroup' "$WWW/app.js"
grep -q 'candidateCombos' "$WWW/app.js"

# A edição de diagnóstico não deve conter código de rede nem dependências remotas.
! grep -R -Eiq 'https?://|PeerJS|new Peer|WebSocket|RTCPeerConnection|XMLHttpRequest|fetch\(' "$WWW"
! grep -R -Eiq 'JavascriptInterface|addJavascriptInterface|setAllowUniversalAccessFromFileURLs|setAllowFileAccessFromFileURLs' rumix-v042/MainActivity.java

grep -q 'setAllowFileAccess(false)' rumix-v042/MainActivity.java
grep -q 'setAllowContentAccess(false)' rumix-v042/MainActivity.java
grep -q 'MIXED_CONTENT_NEVER_ALLOW' rumix-v042/MainActivity.java

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena.offline'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.offline.v042'
    minSdk 24
    targetSdk 35
    versionCode 42
    versionName '0.4.2'
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'EOF2'
<resources><string name="app_name">Rumi Mix Arena Offline</string></resources>
EOF2

cat > app/src/main/res/values/styles.xml <<'EOF2'
<resources>
  <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">
    <item name="android:fontFamily">sans</item>
    <item name="android:statusBarColor">#0D5EE6</item>
    <item name="android:navigationBarColor">#0D5EE6</item>
    <item name="android:windowLightStatusBar">false</item>
  </style>
</resources>
EOF2

cat > app/src/main/res/drawable/app_icon.xml <<'EOF2'
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <corners android:radius="28dp"/>
  <gradient android:startColor="#FFCD29" android:centerColor="#0D5EE6" android:endColor="#EC4F49" android:angle="45"/>
</shape>
EOF2

cat > app/src/main/AndroidManifest.xml <<'EOF2'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Arena Offline"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="false">
    <activity android:name="com.rumix.arena.offline.MainActivity" android:exported="true" android:screenOrientation="unspecified">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF2

gradle --no-daemon :app:assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
test -s "$UNSIGNED"

BTDIR=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -mindepth 1 -type d | sort -V | tail -n 1)
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v042.apk

keytool -genkeypair -noprompt \
  -keystore rumix-v042-release.jks \
  -storepass "$PASS" -keypass "$PASS" \
  -alias rumixarenaoffline \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname 'CN=Rumi Mix Arena Offline, OU=Android, O=Rumi Mix Arena, L=Sao Paulo, ST=SP, C=BR'

APK="$DIST/RumiMixArena-v0.4.2-OFFLINE-SAFE.apk"
"$BTDIR/apksigner" sign \
  --ks rumix-v042-release.jks \
  --ks-key-alias rumixarenaoffline \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "$APK" aligned-v042.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"
! "$BTDIR/aapt" dump permissions "$APK" | grep -q 'android.permission.INTERNET'
! "$BTDIR/aapt" dump permissions "$APK" | grep -q 'ACCESS_NETWORK_STATE'

sha256sum "$APK" | tee "$DIST/SHA256.txt"
cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.4.2 OFFLINE SAFE

Versão de diagnóstico totalmente offline.
- Não possui permissão INTERNET.
- Não possui ACCESS_NETWORK_STATE.
- Não usa PeerJS, WebRTC, WebSocket, fetch ou bibliotecas remotas.
- Não usa ponte JavaScript do Android.
- WebView sem acesso a arquivos/conteúdo externos.

Modos disponíveis: Single Player, Treino, Clássico e MegaRumiX local.

Não desative o antivírus ou o Play Protect. Se esta versão também for bloqueada, consulte o Histórico de Proteção do Windows e envie o nome exato da detecção.
TXT

(cd "$DIST" && zip -X -9 RumiMixArena-v0.4.2-OFFLINE-SAFE.zip RumiMixArena-v0.4.2-OFFLINE-SAFE.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.4.2-OFFLINE-SAFE.zip"
echo 'RUMIX_V042_OFFLINE_SAFE_BUILD_OK'
