package com.rumix.online;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private String pendingRoom = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new Bridge(), "AndroidApp");

        pendingRoom = roomFromIntent(getIntent());
        String url = "file:///android_asset/www/index.html";
        if (pendingRoom != null) url += "?room=" + Uri.encode(pendingRoom);
        webView.loadUrl(url);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String room = roomFromIntent(intent);
        if (room != null && webView != null) {
            webView.evaluateJavascript("window.RumiMix && window.RumiMix.openInvite(" + quote(room) + ");", null);
        }
    }

    private String roomFromIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return null;
        Uri data = intent.getData();
        if ("rumix".equalsIgnoreCase(data.getScheme()) && "join".equalsIgnoreCase(data.getHost())) {
            String p = data.getLastPathSegment();
            if (p != null && p.matches("[A-Za-z0-9]{4,10}")) return p.toUpperCase();
        }
        return null;
    }

    private String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public class Bridge {
        @JavascriptInterface
        public void shareInvite(String roomCode) {
            String code = roomCode == null ? "" : roomCode.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
            if (code.isEmpty()) return;
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, "Convite Rumi Mix Online");
            send.putExtra(Intent.EXTRA_TEXT,
                    "🎲 Convite para jogar Rumi Mix Online\n" +
                    "Sala: " + code + "\n" +
                    "Abra pelo APK usando este convite: rumix://join/" + code + "\n" +
                    "Se o link não abrir, entre no app e digite o código " + code + ".");
            startActivity(Intent.createChooser(send, "Compartilhar convite"));
        }

        @JavascriptInterface
        public void toast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }
    }
}
