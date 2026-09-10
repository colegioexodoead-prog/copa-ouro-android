#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
SRC="$ROOT/rumixv02"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist-rumix-v02"

rm -rf "$ROOT/app" "$DIST" "$ROOT/settings.gradle" "$ROOT/build.gradle" "$ROOT/gradle.properties"
mkdir -p "$ROOT/app/src/main/java/com/rumix/arena/v02" "$ROOT/app/src/main/res/values" "$ROOT/app/src/main/res/drawable" "$WWW" "$DIST"

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaV02'
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

cp "$SRC/MainActivity.java" "$ROOT/app/src/main/java/com/rumix/arena/v02/MainActivity.java"
cp "$SRC/index.html" "$WWW/index.html"
cp "$SRC/style.css" "$WWW/style.css"
cp "$SRC/app.js" "$WWW/app.js"

curl -fL --retry 3 --retry-delay 2 "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js" -o "$WWW/peerjs.min.js"
test -s "$WWW/peerjs.min.js"

node --check "$WWW/app.js"
grep -q 'Modo Treino' "$WWW/index.html"
grep -q 'Single Player' "$WWW/index.html"
grep -q 'MegaRumiX' "$WWW/index.html"
grep -q "pendingPower" "$WWW/app.js"
grep -q "Carta Pular" "$WWW/app.js"
grep -q "PULA!" "$WWW/app.js"
grep -q "CPU" "$WWW/app.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena.v02'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.v02'
    minSdk 23
    targetSdk 35
    versionCode 2
    versionName '0.2.0'
  }
  compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
  }
  buildTypes {
    debug {
      debuggable false
      minifyEnabled false
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
    <item name="android:windowActionModeOverlay">true</item>
    <item name="android:statusBarColor">#07111F</item>
    <item name="android:navigationBarColor">#07111F</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:windowBackground">#07111F</item>
  </style>
</resources>
EOF2

cat > app/src/main/res/drawable/app_icon.xml <<'EOF2'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#0B2138" android:pathData="M0,0h108v108h-108z"/>
  <path android:fillColor="#F5C451" android:pathData="M18,18h72v72h-72z"/>
  <path android:fillColor="#10243A" android:pathData="M30,30h48v48h-48z"/>
  <path android:fillColor="#F5C451" android:pathData="M39,39h8v8h-8zM61,39h8v8h-8zM50,50h8v8h-8zM39,61h8v8h-8zM61,61h8v8h-8z"/>
</vector>
EOF2

cat > app/src/main/AndroidManifest.xml <<'EOF2'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Arena"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:hardwareAccelerated="true"
    android:usesCleartextTraffic="false"
    android:allowBackup="true"
    android:supportsRtl="true">
    <activity android:name="com.rumix.arena.v02.MainActivity" android:exported="true" android:screenOrientation="unspecified">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="rumix" android:host="join" />
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF2

gradle --no-daemon :app:assembleDebug
APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

BUILD_TOOLS="${ANDROID_HOME:-$ANDROID_SDK_ROOT}/build-tools/35.0.0"
"$BUILD_TOOLS/apksigner" verify --verbose --print-certs "$APK"
"$BUILD_TOOLS/zipalign" -c -v 4 "$APK"
"$BUILD_TOOLS/aapt" dump badging "$APK" | grep -q "package: name='com.rumix.arena.v02'"
unzip -t "$APK" >/dev/null
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'
unzip -l "$APK" | grep -q 'assets/www/peerjs.min.js'

cp "$APK" "$DIST/Rumi-Mix-Arena-v0.2.0-INSTALAVEL.apk"
sha256sum "$DIST/Rumi-Mix-Arena-v0.2.0-INSTALAVEL.apk" | tee "$DIST/SHA256.txt"
"$BUILD_TOOLS/aapt" dump badging "$APK" > "$DIST/APK-INFO.txt"
echo 'RUMIX_V02_INSTALLER_OK'
