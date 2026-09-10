#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixOnline'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

mkdir -p app/src/main/java/com/rumix/online app/src/main/res/values app/src/main/res/drawable "$WWW"
cp rumix/MainActivity.java app/src/main/java/com/rumix/online/MainActivity.java
cp rumix/index.html "$WWW/index.html"
cp rumix/style.css "$WWW/style.css"
cp rumix/app.js "$WWW/app.js"

node --check "$WWW/app.js"
grep -q 'Rumi Mix Online' "$WWW/index.html"
grep -q 'new Peer' "$WWW/app.js"
grep -q 'Sala cheia (8 jogadores)' "$WWW/app.js"
grep -q "classic" "$WWW/app.js"
grep -q "words" "$WWW/app.js"
grep -q "mixed" "$WWW/app.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.online'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.online'
    minSdk 24
    targetSdk 35
    versionCode 1
    versionName '0.1.0'
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'EOF2'
<resources><string name="app_name">Rumi Mix Online</string></resources>
EOF2

cat > app/src/main/res/values/styles.xml <<'EOF2'
<resources>
  <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">
    <item name="android:fontFamily">sans</item>
    <item name="android:windowActionModeOverlay">true</item>
    <item name="android:statusBarColor">#07111F</item>
    <item name="android:navigationBarColor">#07111F</item>
    <item name="android:windowLightStatusBar">false</item>
  </style>
</resources>
EOF2

cat > app/src/main/res/drawable/app_icon.xml <<'EOF2'
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <corners android:radius="28dp"/>
  <gradient android:startColor="#F5C451" android:endColor="#E48A2B" android:angle="45"/>
  <padding android:left="12dp" android:top="12dp" android:right="12dp" android:bottom="12dp"/>
</shape>
EOF2

cat > app/src/main/AndroidManifest.xml <<'EOF2'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <application
    android:theme="@style/AppTheme"
    android:label="Rumi Mix Online"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="true">
    <activity android:name="com.rumix.online.MainActivity" android:exported="true" android:screenOrientation="unspecified">
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
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'
mkdir -p "$DIST"
cp "$APK" "$DIST/Rumi-Mix-Online-v0.1.0.apk"
sha256sum "$DIST/Rumi-Mix-Online-v0.1.0.apk" | tee "$DIST/Rumi-Mix-Online-v0.1.0-SHA256.txt"
echo 'RUMIX_V01_BUILD_OK'
