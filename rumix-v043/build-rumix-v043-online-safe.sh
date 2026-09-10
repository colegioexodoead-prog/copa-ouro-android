#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"
PASS='RumiMixArenaBuild043'

rm -rf app "$DIST" aligned-v043.apk rumix-v043-release.jks

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaOnlineSafe'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

mkdir -p app/src/main/java/com/rumix/arena/online app/src/main/res/values app/src/main/res/drawable "$WWW" "$DIST"
cp rumix-v043/MainActivity.java app/src/main/java/com/rumix/arena/online/MainActivity.java
cp rumix-v04/index.html "$WWW/index.html"
cp rumix-v04/style.css "$WWW/style.css"
cat rumix-v04/app-chunk00.js rumix-v04/app-chunk01.js rumix-v04/app-chunk02.js rumix-v04/app-chunk03.js rumix-v04/app-chunk04.js rumix-v04/app-chunk05.js rumix-v04/app-chunk06.js rumix-v04/app-chunk07.js rumix-v04/app-chunk08.js rumix-v043/app-chunk09.js > "$WWW/app.js"

# Incorporar PeerJS em formato legível para não depender de script remoto durante o jogo.
sed -i 's#<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>#<script src="peerjs.js"></script>#' "$WWW/index.html"
curl --fail --location --retry 3 --silent --show-error \
  'https://unpkg.com/peerjs@1.5.5/dist/peerjs.js' \
  --output "$WWW/peerjs.js"
test -s "$WWW/peerjs.js"

node --check "$WWW/app.js"
node --check "$WWW/peerjs.js"
grep -q 'peerjs.js' "$WWW/index.html"
! grep -q 'https://unpkg.com' "$WWW/index.html"
! grep -R -q 'addJavascriptInterface' rumix-v043/MainActivity.java
! grep -R -q 'JavascriptInterface' rumix-v043/MainActivity.java
! grep -R -q 'setAllowUniversalAccessFromFileURLs' rumix-v043/MainActivity.java
! grep -R -q 'setAllowFileAccessFromFileURLs' rumix-v043/MainActivity.java
grep -q 'setAllowFileAccess(false)' rumix-v043/MainActivity.java
grep -q 'setAllowContentAccess(false)' rumix-v043/MainActivity.java
grep -q 'setSafeBrowsingEnabled(true)' rumix-v043/MainActivity.java
grep -q 'MIXED_CONTENT_NEVER_ALLOW' rumix-v043/MainActivity.java
grep -q "new Peer" "$WWW/app.js"
grep -q 'MegaRumiX' "$WWW/index.html"
grep -q 'toggleHints' "$WWW/app.js"
grep -q 'pickTableGroup' "$WWW/app.js"
grep -q 'restoreTurn' "$WWW/app.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena.online'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.online.v043'
    minSdk 24
    targetSdk 35
    versionCode 43
    versionName '0.4.3'
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'EOF2'
<resources><string name="app_name">Rumi Mix Arena Online</string></resources>
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
  <uses-permission android:name="android.permission.INTERNET" />
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Arena Online"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="false">
    <activity android:name="com.rumix.arena.online.MainActivity" android:exported="true" android:screenOrientation="unspecified">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="rumixarena" android:host="join" />
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF2

gradle --no-daemon :app:assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
test -s "$UNSIGNED"

BTDIR=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -mindepth 1 -type d | sort -V | tail -n 1)
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v043.apk

keytool -genkeypair -noprompt \
  -keystore rumix-v043-release.jks \
  -storepass "$PASS" -keypass "$PASS" \
  -alias rumixarena \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname 'CN=Rumi Mix Arena, OU=Android, O=Rumi Mix Arena, L=Sao Paulo, ST=SP, C=BR'

APK="$DIST/RumiMixArena-v0.4.3-ONLINE-SAFE.apk"
"$BTDIR/apksigner" sign \
  --ks rumix-v043-release.jks \
  --ks-key-alias rumixarena \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "$APK" aligned-v043.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'
unzip -l "$APK" | grep -q 'assets/www/peerjs.js'
unzip -p "$APK" assets/www/index.html | grep -q 'peerjs.js'
! unzip -p "$APK" assets/www/index.html | grep -q 'https://unpkg.com'
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"
grep -q 'android.permission.INTERNET' "$DIST/PERMISSOES.txt"
! grep -q 'ACCESS_NETWORK_STATE' "$DIST/PERMISSOES.txt"

sha256sum "$APK" | tee "$DIST/SHA256.txt"
cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.4.3 ONLINE SAFE

Modos: Online, Single Player, Treino, Clássico, Letras, Misto e MegaRumiX.
A biblioteca de multiplayer PeerJS está incorporada no APK em formato legível.
O app não carrega JavaScript externo e não usa ponte JavascriptInterface do Android.
Permissão Android solicitada: somente INTERNET, necessária para partidas online.
Não desative antivírus ou Play Protect. Se houver bloqueio, consulte o nome exato da detecção no Histórico de Proteção do Windows.
TXT

(cd "$DIST" && zip -9 RumiMixArena-v0.4.3-ONLINE-SAFE.zip RumiMixArena-v0.4.3-ONLINE-SAFE.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.4.3-ONLINE-SAFE.zip"
echo 'RUMIX_V043_ONLINE_SAFE_BUILD_OK'
