package com.copaouro.app.v13;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final String HOST="app.local";
  private static final String API="https://ourocopa.netlify.app";
  private WebView web;
  private ValueCallback<Uri[]> chooser;
  private String pendingText;
  private static final int CHOOSE=9001,SAVE=9002;
  private boolean seeded=false;
  private SharedPreferences prefs;

  @Override public void onCreate(Bundle b){
    super.onCreate(b);
    prefs=getSharedPreferences("copa_cloud_v13",MODE_PRIVATE);
    web=new WebView(this);setContentView(web);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);
    web.addJavascriptInterface(new Bridge(),"AndroidBridge");
    web.setWebViewClient(new LocalClient());
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){
        if(chooser!=null)chooser.onReceiveValue(null);chooser=cb;
        try{startActivityForResult(p.createIntent(),CHOOSE);}catch(Exception e){chooser=null;return false;}return true;
      }
    });
    if(b==null)web.loadUrl("https://"+HOST+"/index.html");else web.restoreState(b);
  }

  @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onActivityResult(int r,int c,Intent data){
    super.onActivityResult(r,c,data);
    if(r==CHOOSE&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(c,data));chooser=null;}
    if(r==SAVE&&c==RESULT_OK&&data!=null&&pendingText!=null){
      try(OutputStream o=getContentResolver().openOutputStream(data.getData())){o.write(pendingText.getBytes(StandardCharsets.UTF_8));}catch(Exception ignored){}
      pendingText=null;
    }
  }

  private String mime(String p){String e=MimeTypeMap.getFileExtensionFromUrl(p);String m=MimeTypeMap.getSingleton().getMimeTypeFromExtension(e);return m==null?"application/octet-stream":m;}
  private WebResourceResponse text(int code,String body){return new WebResourceResponse("application/json","UTF-8",code,"Offline",null,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));}
  private void emit(String js){web.post(()->web.evaluateJavascript(js,null));}
  private String q(String s){return JSONObject.quote(s==null?"":s);}

  private String readSeed(){
    try(InputStream in=getAssets().open("seed-v13.json.gz.b64")){
      BufferedReader br=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();String line;
      while((line=br.readLine())!=null)b.append(line.trim());
      byte[] zipped=Base64.decode(b.toString(),Base64.DEFAULT);
      try(GZIPInputStream gz=new GZIPInputStream(new ByteArrayInputStream(zipped));BufferedReader jr=new BufferedReader(new InputStreamReader(gz,StandardCharsets.UTF_8))){StringBuilder j=new StringBuilder();while((line=jr.readLine())!=null)j.append(line);return j.toString();}
    }catch(Exception e){return null;}
  }

  private void seedPedro(WebView v){
    if(seeded)return;seeded=true;String json=readSeed();if(json==null)return;
    String js="(function(){try{const M='copaOuroSeedPedroV13';if(localStorage.getItem(M)==='1')return '0';const p="+json+";const src=p.local||p.remote||{};let known=[];try{known=JSON.parse(localStorage.getItem('copaKnownDataKeysV13')||'[]')}catch(e){};for(const [k,val] of Object.entries(src)){if(val!=null){localStorage.setItem('copaProfile:pedro:'+k,val);if(!known.includes(k))known.push(k);}}localStorage.setItem('copaKnownDataKeysV13',JSON.stringify(known));localStorage.setItem('copaProfileUpdatedAt:pedro',String(Date.parse(p.createdAt||'')||Date.now()));localStorage.setItem(M,'1');localStorage.setItem('copaOuroAppVersion','1.3.0');return String(Object.keys(src).length);}catch(e){return '-1';}})();";
    v.evaluateJavascript(js,null);
  }

  private HttpURLConnection conn(String path,String method)throws Exception{
    HttpURLConnection c=(HttpURLConnection)new URL(API+path).openConnection();c.setConnectTimeout(12000);c.setReadTimeout(12000);c.setRequestMethod(method);c.setRequestProperty("Accept","application/json");
    String cookie=prefs.getString("cookie","");if(!cookie.isEmpty())c.setRequestProperty("Cookie",cookie);return c;
  }
  private String readBody(HttpURLConnection c)throws Exception{InputStream in=(c.getResponseCode()>=400?c.getErrorStream():c.getInputStream());if(in==null)return "";try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String l;while((l=r.readLine())!=null)b.append(l);return b.toString();}}
  private boolean loginCloud(String pass){
    try{HttpURLConnection c=conn("/api/auth/login","POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");byte[] body=new JSONObject().put("password",pass).toString().getBytes(StandardCharsets.UTF_8);try(OutputStream o=c.getOutputStream()){o.write(body);}if(c.getResponseCode()!=200)return false;String set=c.getHeaderField("Set-Cookie");if(set==null)return false;prefs.edit().putString("cookie",set.split(";",2)[0]).apply();return true;}catch(Exception e){return false;}
  }
  private void cloudGetAsync(){new Thread(()->{try{HttpURLConnection c=conn("/api/state","GET");int code=c.getResponseCode();String body=readBody(c);if(code==401){prefs.edit().remove("cookie").apply();emit("window.CopaCloudGetResult&&window.CopaCloudGetResult(false,'AUTH')");return;}if(code!=200){emit("window.CopaCloudGetResult&&window.CopaCloudGetResult(false,'NET')");return;}String b64=Base64.encodeToString(body.getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP);emit("window.CopaCloudGetResult&&window.CopaCloudGetResult(true,"+q(b64)+")");}catch(Exception e){emit("window.CopaCloudGetResult&&window.CopaCloudGetResult(false,'NET')");}}).start();}
  private void cloudPutAsync(String key,String value){new Thread(()->{try{HttpURLConnection c=conn("/api/state","PUT");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");byte[] body=new JSONObject().put("key",key).put("value",value).toString().getBytes(StandardCharsets.UTF_8);try(OutputStream o=c.getOutputStream()){o.write(body);}int code=c.getResponseCode();readBody(c);if(code==401){prefs.edit().remove("cookie").apply();emit("window.CopaCloudPutResult&&window.CopaCloudPutResult("+q(key)+",false,'AUTH')");return;}emit("window.CopaCloudPutResult&&window.CopaCloudPutResult("+q(key)+","+(code==200?"true":"false")+")");}catch(Exception e){emit("window.CopaCloudPutResult&&window.CopaCloudPutResult("+q(key)+",false,'NET')");}}).start();}

  private class LocalClient extends WebViewClient{
    @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme())&&HOST.equals(u.getHost())){String p=u.getPath();if(p==null||p.isEmpty()||"/".equals(p))p="/index.html";if(p.endsWith("/"))p+="index.html";if(p.startsWith("/api/")||p.startsWith("/.netlify/"))return text(404,"{\"local\":true}");try{InputStream in=getAssets().open("www"+p);return new WebResourceResponse(mime(p),"UTF-8",in);}catch(Exception e){return text(404,"{\"missing\":true}");}}return super.shouldInterceptRequest(v,req);}
    @Override public void onPageFinished(WebView v,String url){super.onPageFinished(v,url);if(url!=null&&url.startsWith("https://"+HOST+"/"))seedPedro(v);}
    @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){Uri u=req.getUrl();if(HOST.equals(u.getHost()))return false;if("http".equals(u.getScheme())||"https".equals(u.getScheme())){startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}return false;}
  }

  public class Bridge{
    @JavascriptInterface public void saveTextFile(String name,String text){pendingText=text;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(i,SAVE);}
    @JavascriptInterface public boolean cloudHasSession(){return !prefs.getString("cookie","").isEmpty();}
    @JavascriptInterface public void cloudLogin(String password){new Thread(()->{boolean ok=loginCloud(password);emit("window.CopaCloudLoginResult&&window.CopaCloudLoginResult("+(ok?"true":"false")+")");}).start();}
    @JavascriptInterface public void cloudGet(){cloudGetAsync();}
    @JavascriptInterface public void cloudPut(String key,String value){cloudPutAsync(key,value);}
    @JavascriptInterface public void cloudLogout(){prefs.edit().remove("cookie").apply();}
  }
}
