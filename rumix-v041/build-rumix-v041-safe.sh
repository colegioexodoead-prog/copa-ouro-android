#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"
PASS='RumiMixArenaBuild041'

rm -rf app "$DIST" aligned-v041.apk rumix-v041-release.jks

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaSafe'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

mkdir -p app/src/main/java/com/rumix/arena/safe app/src/main/res/values app/src/main/res/drawable "$WWW" "$DIST"
cp rumix-v041/MainActivity.java app/src/main/java/com/rumix/arena/safe/MainActivity.java
cp rumix-v04/index.html "$WWW/index.html"
cp rumix-v04/style.css "$WWW/style.css"
cat rumix-v04/app-chunk00.js rumix-v04/app-chunk01.js rumix-v04/app-chunk02.js rumix-v04/app-chunk03.js rumix-v04/app-chunk04.js rumix-v04/app-chunk05.js rumix-v04/app-chunk06.js rumix-v04/app-chunk07.js rumix-v04/app-chunk08.js rumix-v04/app-chunk09.js > "$WWW/app.js"

# Não carregar JavaScript remoto durante o jogo: PeerJS é incorporado ao APK.
sed -i 's#<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>#<script src="peerjs.min.js"></script>#' "$WWW/index.html"
curl --fail --location --retry 3 --silent --show-error \
  'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js' \
  --output "$WWW/peerjs.min.js"
test -s "$WWW/peerjs.min.js"

node --check "$WWW/app.js"
node --check "$WWW/peerjs.min.js"
grep -q 'peerjs.min.js' "$WWW/index.html"
! grep -q 'https://unpkg.com' "$WWW/index.html"
! grep -q 'setAllowUniversalAccessFromFileURLs' rumix-v041/MainActivity.java
! grep -q 'setAllowFileAccessFromFileURLs' rumix-v041/MainActivity.java
grep -q 'setAllowFileAccess(false)' rumix-v041/MainActivity.java
grep -q 'setAllowContentAccess(false)' rumix-v041/MainActivity.java
grep -q 'MIXED_CONTENT_NEVER_ALLOW' rumix-v041/MainActivity.java

grep -q 'MegaRumiX' "$WWW/index.html"
grep -q 'toggleHints' "$WWW/app.js"
grep -q 'pickTableGroup' "$WWW/app.js"
grep -q 'restoreTurn' "$WWW/app.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena.safe'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.safe.v041'
    minSdk 24
    targetSdk 35
    versionCode 41
    versionName '0.4.1'
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'EOF2'
<resources><string name="app_name">Rumi Mix Arena SAFE</string></resources>
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
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Arena SAFE"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="false"
    android:debuggable="false">
    <activity android:name="com.rumix.arena.safe.MainActivity" android:exported="true" android:screenOrientation="unspecified">
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
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v041.apk

keytool -genkeypair -noprompt \
  -keystore rumix-v041-release.jks \
  -storepass "$PASS" -keypass "$PASS" \
  -alias rumixarena \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname 'CN=Rumi Mix Arena, OU=Android, O=Rumi Mix Arena, L=Sao Paulo, ST=SP, C=BR'

APK="$DIST/RumiMixArena-v0.4.1-SAFE.apk"
"$BTDIR/apksigner" sign \
  --ks rumix-v041-release.jks \
  --ks-key-alias rumixarena \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "$APK" aligned-v041.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'
unzip -l "$APK" | grep -q 'assets/www/peerjs.min.js'
unzip -p "$APK" assets/www/index.html | grep -q 'peerjs.min.js'
! unzip -p "$APK" assets/www/index.html | grep -q 'https://unpkg.com'
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"

sha256sum "$APK" | tee "$DIST/SHA256.txt"
cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.4.1 SAFE

Este APK foi reconstruído com WebView restrito e biblioteca PeerJS incorporada.
Permissões esperadas: INTERNET e ACCESS_NETWORK_STATE, necessárias para o multiplayer online.
Não desative antivírus ou Play Protect para instalar. Se algum scanner continuar bloqueando, envie o nome exato da detecção para investigação antes da instalação.
TXT

(cd "$DIST" && zip -9 RumiMixArena-v0.4.1-SAFE.zip RumiMixArena-v0.4.1-SAFE.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.4.1-SAFE.zip"
echo 'RUMIX_V041_SAFE_BUILD_OK'
