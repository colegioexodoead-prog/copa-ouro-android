#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArena'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '8.7.3' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

mkdir -p app/src/main/java/com/rumix/arena app/src/main/res/values app/src/main/res/drawable "$WWW"
cp rumix-v04/MainActivity.java app/src/main/java/com/rumix/arena/MainActivity.java
cp rumix-v04/index.html "$WWW/index.html"
cp rumix-v04/style.css "$WWW/style.css"
cat rumix-v04/app-chunk00.js rumix-v04/app-chunk01.js rumix-v04/app-chunk02.js rumix-v04/app-chunk03.js rumix-v04/app-chunk04.js rumix-v04/app-chunk05.js rumix-v04/app-chunk06.js rumix-v04/app-chunk07.js rumix-v04/app-chunk08.js rumix-v04/app-chunk09.js > "$WWW/app.js"

node --check "$WWW/app.js"
grep -q 'Rumi Mix Arena' "$WWW/index.html"
grep -q 'MegaRumiX' "$WWW/index.html"
grep -q 'Single Player' "$WWW/index.html"
grep -q 'randomSpinEffect' "$WWW/app.js"
grep -q 'cpuAct' "$WWW/app.js"
grep -q 'createRoom' "$WWW/app.js"
grep -q 'pickTableGroup' "$WWW/app.js"
grep -q 'restoreTurn' "$WWW/app.js"
grep -q 'toggleHints' "$WWW/app.js"
grep -q "const COLORS = \['red','blue','orange','black'\]" "$WWW/app.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }
android {
  namespace 'com.rumix.arena'
  compileSdk 35
  defaultConfig {
    applicationId 'com.rumix.arena.v04'
    minSdk 24
    targetSdk 35
    versionCode 4
    versionName '0.4.0'
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
    android:label="Rumi Mix Arena"
    android:icon="@drawable/app_icon"
    android:roundIcon="@drawable/app_icon"
    android:usesCleartextTraffic="false"
    android:allowBackup="true">
    <activity android:name="com.rumix.arena.MainActivity" android:exported="true" android:screenOrientation="unspecified">
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

gradle --no-daemon :app:assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
unzip -l "$APK" | grep -q 'assets/www/index.html'
unzip -l "$APK" | grep -q 'assets/www/app.js'
unzip -l "$APK" | grep -q 'assets/www/style.css'

BTDIR=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -mindepth 1 -type d | sort -V | tail -n 1)
"$BTDIR/apksigner" verify "$APK"
"$BTDIR/zipalign" -c -p 4 "$APK"

mkdir -p "$DIST"
cp "$APK" "$DIST/Rumi-Mix-Arena-v0.4.0.apk"
sha256sum "$DIST/Rumi-Mix-Arena-v0.4.0.apk" | tee "$DIST/Rumi-Mix-Arena-v0.4.0-SHA256.txt"
echo 'RUMIX_V04_BUILD_OK'
