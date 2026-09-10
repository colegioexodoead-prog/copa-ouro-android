#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"
rm -rf app "$DIST" aligned-v051.apk release-v051.jks

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaV051InstallFix'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
android.nonTransitiveRClass=true
GRADLE

mkdir -p app/src/main/java/com/rumix/arena/boardfix app/src/main/res/values app/src/main/res/drawable "$WWW" "$DIST"
sed 's/package com\.rumix\.arena\.online;/package com.rumix.arena.boardfix;/' rumix-v043/MainActivity.java > app/src/main/java/com/rumix/arena/boardfix/MainActivity.java

cp rumix-v04/index.html "$WWW/index.html"
cp rumix-v04/style.css "$WWW/style.css"
cp rumix-v050/style-v050.css "$WWW/style-v050.css"
cp rumix-v050/ux-v050.js "$WWW/ux-v050.js"
cat rumix-v04/app-chunk00.js rumix-v04/app-chunk01.js rumix-v04/app-chunk02.js rumix-v04/app-chunk03.js rumix-v04/app-chunk04.js rumix-v04/app-chunk05.js rumix-v04/app-chunk06.js rumix-v04/app-chunk07.js rumix-v04/app-chunk08.js rumix-v043/app-chunk09.js > "$WWW/app.js"

sed -i 's#<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>#<script src="peerjs.js"></script>#' "$WWW/index.html"
sed -i 's#</head>#  <link rel="stylesheet" href="style-v050.css">\n</head>#' "$WWW/index.html"
sed -i 's#</body>#  <script src="ux-v050.js"></script>\n</body>#' "$WWW/index.html"
curl --fail --location --retry 3 --silent --show-error 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.js' --output "$WWW/peerjs.js"

node --check "$WWW/app.js"
node --check "$WWW/ux-v050.js"
node --check "$WWW/peerjs.js"
test -s "$WWW/peerjs.js"
grep -q 'pointerdown' "$WWW/ux-v050.js"
grep -q 'MegaRumiX' "$WWW/index.html"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena.boardfix'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.board.v051'
    minSdk 21
    targetSdk 35
    versionCode 51
    versionName '0.5.1'
  }
  buildTypes {
    release {
      minifyEnabled false
      shrinkResources false
    }
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'EOF2'
<resources><string name="app_name">Rumi Mix Arena</string></resources>
EOF2

cat > app/src/main/res/values/styles.xml <<'EOF2'
<resources>
  <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">
    <item name="android:fontFamily">sans</item>
    <item name="android:statusBarColor">#061B3F</item>
    <item name="android:navigationBarColor">#061B3F</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:windowFullscreen">true</item>
  </style>
</resources>
EOF2

cat > app/src/main/res/drawable/app_icon.xml <<'EOF2'
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <corners android:radius="30dp"/>
  <gradient android:startColor="#061B3F" android:centerColor="#0B58AD" android:endColor="#FFC62E" android:angle="45"/>
</shape>
EOF2

cat > app/src/main/AndroidManifest.xml <<'EOF2'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET"/>
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Arena"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="false"
    android:hardwareAccelerated="true">
    <activity android:name="com.rumix.arena.boardfix.MainActivity" android:exported="true" android:screenOrientation="landscape">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="rumixarena" android:host="join"/>
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF2

gradle --no-daemon :app:assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
test -s "$UNSIGNED"
BTDIR=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -mindepth 1 -type d | sort -V | tail -n 1)
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v051.apk

PASS="RMA$(date +%s)$(openssl rand -hex 6)"
keytool -genkeypair -noprompt -keystore release-v051.jks -storepass "$PASS" -keypass "$PASS" -alias rumixarena -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Rumi Mix Arena, OU=Android, O=Rumi Mix Arena, L=Sao Paulo, ST=SP, C=BR'

APK="$DIST/RumiMixArena-v0.5.1-INSTALACAO-CORRIGIDA.apk"
"$BTDIR/apksigner" sign --ks release-v051.jks --ks-key-alias rumixarena --ks-pass "pass:$PASS" --key-pass "pass:$PASS" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$APK" aligned-v051.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style-v050.css'
unzip -l "$APK" | grep -q 'assets/www/ux-v050.js'
unzip -l "$APK" | grep -q 'assets/www/peerjs.js'
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"
grep -q "package: name='com.rumix.arena.board.v051'" "$DIST/APK-INFO.txt"
grep -q "sdkVersion:'21'" "$DIST/APK-INFO.txt"
grep -q 'android.permission.INTERNET' "$DIST/PERMISSOES.txt"
! grep -q 'application-debuggable' "$DIST/APK-INFO.txt"
grep -q 'Verified using v1 scheme (JAR signing): true' "$DIST/ASSINATURA.txt"
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' "$DIST/ASSINATURA.txt"
sha256sum "$APK" | tee "$DIST/SHA256.txt"

cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.5.1 - instalação corrigida

Correções de compatibilidade:
- APK em modo RELEASE, não depurável.
- Novo pacote Android para evitar conflito com versões anteriores.
- Compatível a partir do Android 5.0 (API 21).
- Assinaturas APK v1 + v2 + v3 para ampliar compatibilidade.
- APK universal, sem bibliotecas nativas por arquitetura.
- Multiplayer online mantido.
- Mesa horizontal, rack de madeira, peças estreitas e gestos da v0.5 mantidos.
- Permissão solicitada: INTERNET.
TXT

(cd "$DIST" && zip -9 RumiMixArena-v0.5.1-INSTALACAO-CORRIGIDA.zip RumiMixArena-v0.5.1-INSTALACAO-CORRIGIDA.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.5.1-INSTALACAO-CORRIGIDA.zip"
echo 'RUMIX_V051_INSTALL_FIX_OK'
