#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
WWW="$ROOT/app/src/main/assets/www"
DIST="$ROOT/dist"
rm -rf app "$DIST" aligned-v060.apk release-v060.jks

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='RumiMixArenaV060ProfileBank'
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
cp rumix-v060/MainActivity.java app/src/main/java/com/rumixarena/game/MainActivity.java
cp rumix-v04/index.html "$WWW/index.html"
cp rumix-v04/style.css "$WWW/style.css"
cp rumix-v050/style-v050.css "$WWW/style-v050.css"
cp rumix-v050/ux-v050.js "$WWW/ux-v050.js"
cp rumix-v060/style-v060.css "$WWW/style-v060.css"

cat rumix-v04/app-chunk00.js rumix-v04/app-chunk01.js rumix-v04/app-chunk02.js rumix-v04/app-chunk03.js rumix-v04/app-chunk04.js rumix-v04/app-chunk05.js rumix-v04/app-chunk06.js rumix-v04/app-chunk07.js rumix-v04/app-chunk08.js > "$WWW/app.js"
head -n -2 rumix-v043/app-chunk09.js >> "$WWW/app.js"
cat rumix-v060/app-v060-part-aa.js rumix-v060/app-v060-part-ab.js rumix-v060/app-v060-part-ac.js >> "$WWW/app.js"
printf '\ninit();\n})();\n' >> "$WWW/app.js"

sed -i 's#<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>#<script src="peerjs.js"></script>#' "$WWW/index.html"
sed -i 's#</head>#  <link rel="stylesheet" href="style-v050.css">\n  <link rel="stylesheet" href="style-v060.css">\n</head>#' "$WWW/index.html"
sed -i 's#</body>#  <script src="ux-v050.js"></script>\n</body>#' "$WWW/index.html"
sed -i 's/Layout novo e jogabilidade melhorada/Perfil, moedas e tela adaptável/' "$WWW/index.html"
sed -i 's/Tabuleiro digital com peças grandes, rack de madeira, mesa azul e controles rápidos para jogar com fluidez./Agora com perfil persistente, moedas virtuais, Banco da Maju, saída segura e jogo vertical ou horizontal./' "$WWW/index.html"
curl --fail --location --retry 3 --silent --show-error 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.js' --output "$WWW/peerjs.js"

node --check "$WWW/app.js"
node --check "$WWW/ux-v050.js"
node --check "$WWW/peerjs.js"
grep -q 'V060_START_COINS=50000' "$WWW/app.js"
grep -q 'V060_MIN_STAKE=1000' "$WWW/app.js"
grep -q 'V060_MAX_STAKE=500000' "$WWW/app.js"
grep -q 'Banco da Maju' "$WWW/app.js"
grep -q 'SCREEN_ORIENTATION_SENSOR_PORTRAIT' app/src/main/java/com/rumixarena/game/MainActivity.java
grep -q 'SCREEN_ORIENTATION_SENSOR_LANDSCAPE' app/src/main/java/com/rumixarena/game/MainActivity.java

cat > app/build.gradle <<'GRADLE'
plugins { id 'com.android.application' }

android {
  namespace 'com.rumixarena.game'
  compileSdk 33

  defaultConfig {
    applicationId 'com.rumixarena.game.v060'
    minSdk 23
    targetSdk 33
    versionCode 60
    versionName '0.6.0'
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
  <application android:theme="@style/AppTheme" android:label="Rumi Mix Arena" android:allowBackup="true">
    <activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden">
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
"$BTDIR/zipalign" -p -f 4 "$UNSIGNED" aligned-v060.apk

PASS="RMA60$(date +%s)$(openssl rand -hex 4)"
keytool -genkeypair -noprompt -keystore release-v060.jks -storepass "$PASS" -keypass "$PASS" -alias rumixarena -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Rumi Mix Arena, OU=Android, O=Rumi Mix Arena, C=BR'

APK="$DIST/RumiMixArena-v0.6.0-PERFIL-MOEDAS.apk"
"$BTDIR/apksigner" sign --ks release-v060.jks --ks-key-alias rumixarena --ks-pass "pass:$PASS" --key-pass "pass:$PASS" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled false --out "$APK" aligned-v060.apk

"$BTDIR/apksigner" verify --verbose --print-certs "$APK" | tee "$DIST/ASSINATURA.txt"
"$BTDIR/zipalign" -c -p 4 "$APK"
unzip -t "$APK"
"$BTDIR/aapt" dump badging "$APK" | tee "$DIST/APK-INFO.txt"
"$BTDIR/aapt" dump permissions "$APK" | tee "$DIST/PERMISSOES.txt"
grep -q "package: name='com.rumixarena.game.v060'" "$DIST/APK-INFO.txt"
grep -q "sdkVersion:'23'" "$DIST/APK-INFO.txt"
grep -q "targetSdkVersion:'33'" "$DIST/APK-INFO.txt"
grep -q 'Verified using v1 scheme (JAR signing): true' "$DIST/ASSINATURA.txt"
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' "$DIST/ASSINATURA.txt"
sha256sum "$APK" | tee "$DIST/SHA256.txt"

cat > "$DIST/LEIA-ME.txt" <<'TXT'
Rumi Mix Arena v0.6.0
- Perfil persistente no aparelho: nome, moedas, divida, vitorias e partidas.
- Todos os novos perfis iniciam com 50.000 moedas virtuais.
- Apostas de brincadeira entre 1.000 e 500.000 moedas.
- Moedas sem valor real: sem compra e sem saque.
- Banco da Maju: emprestimos virtuais mesmo com saldo negativo; 150 emprestadas = 500 de divida.
- Divida e descontada automaticamente do premio quando o jogador vence.
- Saida segura de sala/partida e passagem automatica para o proximo jogador.
- Comprar ja compra + finaliza a vez.
- Suporte a tela automatica, vertical e horizontal.
- Partidas locais possuem salvamento para continuar de onde parou.
- Online, CPU, Treino e MegaRumiX mantidos.
- Perfil local persiste ao fechar/reabrir o app. Desinstalar/limpar dados ainda remove dados locais; nuvem exige backend separado.
TXT

(cd "$DIST" && zip -9 RumiMixArena-v0.6.0-PERFIL-MOEDAS.zip RumiMixArena-v0.6.0-PERFIL-MOEDAS.apk SHA256.txt ASSINATURA.txt APK-INFO.txt PERMISSOES.txt LEIA-ME.txt)
unzip -t "$DIST/RumiMixArena-v0.6.0-PERFIL-MOEDAS.zip"
echo RUMIX_V060_BUILD_OK
