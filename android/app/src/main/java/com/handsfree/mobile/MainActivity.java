package com.handsfree.mobile;

import android.annotation.SuppressLint;
import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String APP_URL = BuildConfig.APP_URL;
    private static final int AUDIO_PERMISSION_REQUEST = 4102;
    private WebView webView;
    private PermissionRequest pendingAudioRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(23,105,86));
        getWindow().setNavigationBarColor(Color.WHITE);
        webView = new WebView(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            webView.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                Insets ime = windowInsets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return windowInsets;
            });
        } else webView.setFitsSystemWindows(true);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMediaPlaybackRequiresUserGesture(false);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (request == pendingAudioRequest) pendingAudioRequest = null;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyUiPatch(view);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    showLoadError("NETWORK " + error.getErrorCode());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request != null && request.isForMainFrame() && response.getStatusCode() >= 400) {
                    showLoadError("HTTP " + response.getStatusCode());
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void applyUiPatch(WebView view) {
        String js =
            "(()=>{"
          + "const place=()=>{"
          + "const demo=document.querySelector('.demo'),nav=document.querySelector('.bottom');if(!demo||!nav)return;"
          + "let status=document.querySelector('.hf-native-connection');if(!status){status=document.createElement('div');status.className='hf-native-connection';}"
          + "const span=demo.querySelector('span');if(span)status.replaceChildren(span);"
          + "demo.after(nav);nav.after(status);"
          + "document.querySelector('.top > button[aria-label=\\\"처리함 열기\\\"]')?.remove();"
          + "const p=[...document.querySelectorAll('.top > button.icon')].find(b=>b.getAttribute('aria-label')!=='처리함 열기');"
          + "if(p){p.textContent='로그인';p.setAttribute('aria-label','로그인');p.onclick=()=>location.href='./login.html';}"
          + "const brand=document.querySelector('.kmt-brand small');if(brand)brand.style.whiteSpace='nowrap';"
          + "};"
          + "let s=document.getElementById('hfNativeUiPatch');"
          + "if(!s){s=document.createElement('style');s.id='hfNativeUiPatch';"
          + "s.textContent='.demo{display:block!important;margin:0 17px!important;padding:8px 0 6px!important;border-bottom:0!important}.demo>b{display:block!important}.hf-native-connection{margin:0 17px 8px;padding:2px 0 8px;border-bottom:1px solid #d9dfe2;color:#66737c;font-size:10px;line-height:1.35}.bottom{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;width:calc(100% - 28px)!important;min-height:68px!important;margin:0 14px 6px!important;z-index:4!important}.app{padding-bottom:100px!important}main{padding-bottom:84px!important}.hybrid-voice-fab{bottom:18px!important;right:16px!important}.kmt-brand small{white-space:nowrap!important;letter-spacing:0!important}.top>button.icon{min-width:58px!important;width:auto!important;padding:0 10px!important;font-size:11px!important;font-weight:800!important}';"
          + "document.head.appendChild(s);}"
          + "const demo=document.querySelector('.demo');"
          + "if(demo&&!window.__hfTopNavObserver){window.__hfTopNavObserver=new MutationObserver(()=>place());window.__hfTopNavObserver.observe(demo,{childList:true});}"
          + "place();setTimeout(place,350);setTimeout(place,1000);"
          + "})();";
        view.evaluateJavascript(js, null);
    }

    private boolean isTrustedOrigin(Uri origin) {
        Uri app = Uri.parse(APP_URL);
        return origin != null && "https".equalsIgnoreCase(origin.getScheme())
            && app.getHost() != null && app.getHost().equalsIgnoreCase(origin.getHost());
    }

    private void handleWebPermission(PermissionRequest request) {
        if (!isTrustedOrigin(request.getOrigin())) { request.deny(); return; }
        boolean audioOnly = request.getResources().length == 1
            && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(request.getResources()[0]);
        if (!audioOnly) { request.deny(); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingAudioRequest = request;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != AUDIO_PERMISSION_REQUEST || pendingAudioRequest == null) return;
        PermissionRequest request = pendingAudioRequest;
        pendingAudioRequest = null;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else request.deny();
    }

    private void showLoadError(String code) {
        String html = "<html><body style='font-family:sans-serif;padding:28px'>"
            + "<h2>HandsFree 연결 오류</h2>"
            + "<p>" + code + "</p>"
            + "<button style='font-size:18px;padding:12px 18px' onclick=\"location.href='" + APP_URL + "'\">다시 연결</button>"
            + "</body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true}return false})()", value -> {
                if (!"true".equals(value)) navigateBackOrFinish();
            });
            return;
        }
        super.onBackPressed();
    }

    private void navigateBackOrFinish() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
