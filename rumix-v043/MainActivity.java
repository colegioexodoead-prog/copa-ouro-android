package com.rumix.arena.online;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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
        WebView.setWebContentsDebuggingEnabled(false);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setSaveFormData(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }

        webView.setWebViewClient(new SafeAssetClient());

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
            webView.evaluateJavascript("window.RumiMixArena&&window.RumiMixArena.openInvite(" + quote(room) + ");", null);
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
                try {
                    InputStream input = getAssets().open("www" + path);
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
            return !APP_HOST.equalsIgnoreCase(uri.getHost());
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

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
