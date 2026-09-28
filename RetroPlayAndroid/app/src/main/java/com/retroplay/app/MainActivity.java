package com.retroplay.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends Activity {
    private WebView webView;
    private FrameLayout root;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    private static final Set<String> BLOCKED_HOST_PARTS = new HashSet<>(Arrays.asList(
        "doubleclick.net", "googlesyndication.com", "googleadservices.com",
        "adservice.google.com", "pagead2.googlesyndication.com",
        "securepubads.g.doubleclick.net", "adnxs.com", "adsrvr.org",
        "taboola.com", "outbrain.com", "popads.net", "popcash.net",
        "propellerads.com", "onclicka.com", "exoclick.com",
        "trafficjunky.net", "revcontent.com", "mgid.com"
    ));

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        root = findViewById(R.id.root);
        webView = findViewById(R.id.web);
        GameControlsView controls = findViewById(R.id.controls);

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && shouldBlock(request.getUrl())) return emptyResponse();
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null && shouldBlock(Uri.parse(url))) return emptyResponse();
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectAdCleanup(view);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                return false;
            }

            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view;
                customViewCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ));
                webView.setVisibility(View.GONE);
                controls.bringToFront();
            }

            @Override public void onHideCustomView() {
                if (customView == null) return;
                root.removeView(customView);
                customView = null;
                webView.setVisibility(View.VISIBLE);
                if (customViewCallback != null) customViewCallback.onCustomViewHidden();
            }
        });

        controls.setKeySink(new GameControlsView.KeySink() {
            @Override public void keyDown(int keyCode) {
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
            }
            @Override public void keyUp(int keyCode) {
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
            }
        });

        webView.loadUrl("https://www.retrogames.onl/");
    }

    private boolean shouldBlock(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost();
        if (host == null) return false;
        host = host.toLowerCase();
        for (String blocked : BLOCKED_HOST_PARTS) {
            if (host.equals(blocked) || host.endsWith("." + blocked) || host.contains(blocked)) return true;
        }
        return false;
    }

    private WebResourceResponse emptyResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
    }

    private void injectAdCleanup(WebView view) {
        String js = "(function(){" +
            "if(document.getElementById('retroplay-ad-clean'))return;" +
            "var s=document.createElement('style');" +
            "s.id='retroplay-ad-clean';" +
            "s.textContent='" +
            "iframe[src*=\\\"doubleclick\\\"]," +
            "iframe[src*=\\\"googlesyndication\\\"]," +
            "iframe[src*=\\\"adservice\\\"]," +
            "[id^=\\\"google_ads\\\"]," +
            ".adsbygoogle,.advertisement,.advertising,.ad-banner,.ad-container,.ad-wrapper,[class~=\\\"ads\\\"]{" +
            "display:none!important;visibility:hidden!important;width:0!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}';" +
            "document.documentElement.appendChild(s);" +
            "try{window.open=function(){return null;};}catch(e){}" +
            "})();";
        view.evaluateJavascript(js, null);
    }

    @Override public void onBackPressed() {
        if (customView != null) {
            ((WebChromeClient) webView.getWebChromeClient()).onHideCustomView();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
