package com.rumix.arena.safe;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String APP_HOST = "app.rumix.local";
    private static final String APP_ORIGIN = "https://" + APP_HOST + "/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        webView.setWebViewClient(new SafeAssetClient());
        webView.addJavascriptInterface(new Bridge(), "AndroidApp");

        String room = roomFromIntent(getIntent());
        String url = APP_ORIGIN + "index.html";
        if (room != null) url += "?room=" + Uri.encode(room);
        webView.loadUrl(url);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String room = roomFromIntent(intent);
        if (room != null && webView != null) {
            webView.evaluateJavascript("window.RumiMixArena && window.RumiMixArena.openInvite(" + quote(room) + ");", null);
        }
    }

    private String roomFromIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return null;
        Uri data = intent.getData();
        if ("rumixarena".equalsIgnoreCase(data.getScheme()) && "join".equalsIgnoreCase(data.getHost())) {
            String segment = data.getLastPathSegment();
            if (segment != null && segment.matches("[A-Za-z0-9]{4,10}")) return segment.toUpperCase();
        }
        return null;
    }

    private String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    private class SafeAssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (APP_HOST.equalsIgnoreCase(uri.getHost())) {
                String path = uri.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                if (path.contains("..")) return null;
                String assetPath = "www" + path;
                try {
                    InputStream input = getAssets().open(assetPath);
                    return new WebResourceResponse(mimeFor(path), "UTF-8", input);
                } catch (IOException ignored) {
                    return null;
                }
            }
            return null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (APP_HOST.equalsIgnoreCase(uri.getHost())) return false;
            try {
                Intent browser = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(browser);
            } catch (Exception ignored) {
                Toast.makeText(MainActivity.this, "Não foi possível abrir o link.", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        private String mimeFor(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".js")) return "application/javascript";
            if (path.endsWith(".json")) return "application/json";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
            if (path.endsWith(".svg")) return "image/svg+xml";
            return "application/octet-stream";
        }
    }

    public class Bridge {
        @JavascriptInterface
        public void shareInvite(String roomCode) {
            String code = roomCode == null ? "" : roomCode.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
            if (code.isEmpty()) return;
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, "Convite Rumi Mix Arena");
            send.putExtra(Intent.EXTRA_TEXT,
                "🎲 Convite para jogar Rumi Mix Arena\n" +
                "Sala: " + code + "\n" +
                "Abra no app: rumixarena://join/" + code + "\n" +
                "Se o link não abrir, digite o código " + code + " no aplicativo.");
            startActivity(Intent.createChooser(send, "Compartilhar convite"));
        }

        @JavascriptInterface
        public void toast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidApp");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
