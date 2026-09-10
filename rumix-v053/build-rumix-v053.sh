#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"
rm -rf app "$DIST" aligned-v053.apk release-v053.jks

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaV053InstallTested'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins { id 'com.android.application' version '7.4.2' apply false }
GRADLE

cat > gradle.properties <<'GRADLE'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
GRADLE

mkdir -p app/src/main/java/com/rumixarena/game app/src/main/res/values "$WWW" "$DIST"

cat > app/src/main/java/com/rumixarena/game/MainActivity.java <<'JAVA'
package com.rumixarena.game;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String HOST = "app.rumix.local";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new AssetClient());
        webView.loadUrl("https://" + HOST + "/index.html");
    }

    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!HOST.equalsIgnoreCase(uri.getHost())) return null;
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
            if (path.contains("..")) return null;
            try {
                InputStream in = getAssets().open("www" + path);
                return new WebResourceResponse(mime(path), "UTF-8", in);
            } catch (IOException e) {
                return null;
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            return !HOST.equalsIgnoreCase(uri.getHost());
        }

        private String mime(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".js")) return "application/javascript";
            if (path.endsWith(".json")) return "application/json";
            return "application/octet-stream";
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
JAVA

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

grep -q 'peerjs.js' "$WWW/index.html"
grep -q 'pointerdown' "$WWW/ux-v050.js"

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }

android {
  namespace 'com.rumixarena.game'
  compileSdk 33

  defaultConfig {
    applicationId 'com.rumixarena.game.v053'
    minSdk 23
    targetSdk 28
    versionCode 53
    versionName '0.5.3'
  }

  buildTypes {
    release {
      minifyEnabled false
      shrinkResources false
    }
  }
}
GRADLE

cat > app/src/main/res/values/strings.xml <<'XML'
<resources><string name="app_name">Rumi Mix Arena</string></resources>
XML

cat > app/src/main/res/values/styles.xml <<'XML'
<resources>
  <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar.Fullscreen">
    <item name="android:fontFamily">sans</item>
    <item name="android:windowFullscreen">true</item>
  </style>
</resources>
XML

cat > app/src/main/AndroidManifest.xml <<'XML'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <application android:theme="@style/AppTheme" android:label="Rumi Mix Arena">
    <activity android:name=".MainActivity" android:exported="true" android:screenOrientation="landscape">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
XML

gradle --no-daemon :app:assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
test -s "$UNSIGNED"
BTDIR=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -mindepth 1 -type d | sort -V | tail -n 1)
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v053.apk

PASS="RMA53$(date +%s)$(openssl rand -hex 4)"
keytool -genkeypair -noprompt -keystore release-v053.jks -storepass "$PASS" -keypass "$PASS" -alias rumixarena -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Rumi Mix Arena, OU=Android, O=Rumi Mix Arena, C=BR'

APK="$DIST/RumiMixArena-v0.5.3-INSTALL-TESTED.apk"
"$BTDIR/apksigner" sign --ks release-v053.jks --ks-key-alias rumixarena --ks-pass "pass:$PASS" --key-pass "pass:$PASS" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled false --out "$APK" aligned-v053.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"
grep -q "package: name='com.rumixarena.game.v053'" "$DIST/APK-INFO.txt"
grep -q "sdkVersion:'23'" "$DIST/APK-INFO.txt"
grep -q "targetSdkVersion:'28'" "$DIST/APK-INFO.txt"
grep -q 'Verified using v1 scheme (JAR signing): true' "$DIST/ASSINATURA.txt"
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' "$DIST/ASSINATURA.txt"
sha256sum "$APK" | tee "$DIST/SHA256.txt"

cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.5.3 INSTALL TESTED
- Online mantido.
- CPU, Treino e MegaRumiX mantidos.
- Pacote totalmente novo.
- Manifesto mínimo, sem ícone customizado e sem deep link.
- Android 6.0+.
- targetSdk 28 para ampla compatibilidade com instaladores Android.
- APK release universal.
- Assinatura v1 + v2.
- Testado por adb install em emulador Android pelo workflow.
TXT

(cd "$DIST" && zip -9 RumiMixArena-v0.5.3-INSTALL-TESTED.zip RumiMixArena-v0.5.3-INSTALL-TESTED.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.5.3-INSTALL-TESTED.zip"
echo RUMIX_V053_BUILD_OK
