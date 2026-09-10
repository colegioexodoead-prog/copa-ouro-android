package com.copaouro.app.v13;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final String HOST="app.local";
  private static final int CHOOSE=9001,SAVE=9002,DRIVE_OPEN=9003,DRIVE_CREATE=9004;
  private WebView web;
  private ValueCallback<Uri[]> chooser;
  private String pendingText;
  private boolean seeded=false;
  private SharedPreferences prefs;

  @Override public void onCreate(Bundle b){
    super.onCreate(b);
    prefs=getSharedPreferences("copa_drive_v150",MODE_PRIVATE);
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
    if(r==CHOOSE&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(c,data));chooser=null;return;}
    if(r==SAVE&&c==RESULT_OK&&data!=null&&pendingText!=null){
      try(OutputStream o=getContentResolver().openOutputStream(data.getData())){if(o!=null)o.write(pendingText.getBytes(StandardCharsets.UTF_8));}catch(Exception ignored){}
      pendingText=null;return;
    }
    if((r==DRIVE_OPEN||r==DRIVE_CREATE)){
      if(c!=RESULT_OK||data==null||data.getData()==null){emit("window.CopaDriveConnectResult&&window.CopaDriveConnectResult(false,'CANCELADO')");return;}
      Uri uri=data.getData();
      try{
        int flags=data.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if(flags!=0)getContentResolver().takePersistableUriPermission(uri,flags);
      }catch(Exception ignored){}
      prefs.edit().putString("drive_uri",uri.toString()).putString("drive_label",queryDisplayName(uri)).apply();
      emit("window.CopaDriveConnectResult&&window.CopaDriveConnectResult(true,"+q(queryDisplayName(uri))+","+(r==DRIVE_CREATE?"true":"false")+")");
      if(r==DRIVE_CREATE)driveWriteAsync(""); else driveReadAsync();
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
    String js="(function(){try{const M='copaOuroSeedPedroV13';if(localStorage.getItem(M)==='1')return '0';const p="+json+";const src=p.local||p.remote||{};let known=[];try{known=JSON.parse(localStorage.getItem('copaKnownDataKeysV13')||'[]')}catch(e){};for(const [k,val] of Object.entries(src)){if(val!=null){localStorage.setItem('copaProfile:pedro:'+k,val);if(!known.includes(k))known.push(k);}}localStorage.setItem('copaKnownDataKeysV13',JSON.stringify(known));localStorage.setItem('copaProfileUpdatedAt:pedro',String(Date.parse(p.createdAt||'')||Date.now()));localStorage.setItem(M,'1');localStorage.setItem('copaOuroAppVersion','1.5.0');return String(Object.keys(src).length);}catch(e){return '-1';}})();";
    v.evaluateJavascript(js,null);
  }

  private Uri driveUri(){try{String s=prefs.getString("drive_uri","");return s.isEmpty()?null:Uri.parse(s);}catch(Exception e){return null;}}
  private String queryDisplayName(Uri uri){
    if(uri==null)return "Copa-Ouro-Nuvem.json";
    try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
      if(c!=null&&c.moveToFirst()){int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(i>=0){String n=c.getString(i);if(n!=null&&!n.trim().isEmpty())return n;}}
    }catch(Exception ignored){}
    return "Copa-Ouro-Nuvem.json";
  }
  private boolean canOpenDrive(){Uri u=driveUri();if(u==null)return false;try(InputStream in=getContentResolver().openInputStream(u)){return in!=null;}catch(Exception e){return false;}}

  private void driveReadAsync(){new Thread(()->{
    Uri u=driveUri();if(u==null){emit("window.CopaDriveGetResult&&window.CopaDriveGetResult(false,'SEM_ARQUIVO','')");return;}
    try(InputStream in=getContentResolver().openInputStream(u)){
      if(in==null)throw new IOException("open");ByteArrayOutputStream b=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=in.read(buf))>0)b.write(buf,0,n);
      String raw=new String(b.toByteArray(),StandardCharsets.UTF_8);String b64=Base64.encodeToString(raw.getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP);
      emit("window.CopaDriveGetResult&&window.CopaDriveGetResult(true,"+q(b64)+","+q(queryDisplayName(u))+ ")");
    }catch(Exception e){emit("window.CopaDriveGetResult&&window.CopaDriveGetResult(false,'LEITURA','')");}
  }).start();}

  private void driveWriteAsync(String raw){new Thread(()->{
    Uri u=driveUri();if(u==null){emit("window.CopaDrivePutResult&&window.CopaDrivePutResult(false,'SEM_ARQUIVO')");return;}
    try{
      OutputStream out=null;
      try{out=getContentResolver().openOutputStream(u,"wt");}catch(Exception ignored){}
      if(out==null)out=getContentResolver().openOutputStream(u);
      if(out==null)throw new IOException("open");
      try(OutputStream o=out){o.write((raw==null?"":raw).getBytes(StandardCharsets.UTF_8));o.flush();}
      prefs.edit().putString("drive_label",queryDisplayName(u)).apply();
      emit("window.CopaDrivePutResult&&window.CopaDrivePutResult(true,'')");
    }catch(Exception e){emit("window.CopaDrivePutResult&&window.CopaDrivePutResult(false,'GRAVACAO')");}
  }).start();}

  private void launchDrive(boolean create){
    Intent i=new Intent(create?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);
    i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
    if(create)i.putExtra(Intent.EXTRA_TITLE,"Copa-Ouro-Nuvem.json");
    try{startActivityForResult(i,create?DRIVE_CREATE:DRIVE_OPEN);}catch(Exception e){emit("window.CopaDriveConnectResult&&window.CopaDriveConnectResult(false,'INDISPONIVEL')");}
  }

  private class LocalClient extends WebViewClient{
    @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme())&&HOST.equals(u.getHost())){String p=u.getPath();if(p==null||p.isEmpty()||"/".equals(p))p="/index.html";if(p.endsWith("/"))p+="index.html";if(p.startsWith("/api/")||p.startsWith("/.netlify/"))return text(404,"{\"local\":true}");try{InputStream in=getAssets().open("www"+p);return new WebResourceResponse(mime(p),"UTF-8",in);}catch(Exception e){return text(404,"{\"missing\":true}");}}return super.shouldInterceptRequest(v,req);}
    @Override public void onPageFinished(WebView v,String url){super.onPageFinished(v,url);if(url!=null&&url.startsWith("https://"+HOST+"/"))seedPedro(v);}
    @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){Uri u=req.getUrl();if(HOST.equals(u.getHost()))return false;if("http".equals(u.getScheme())||"https".equals(u.getScheme())){startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}return false;}
  }

  public class Bridge{
    @JavascriptInterface public void saveTextFile(String name,String text){pendingText=text;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(i,SAVE);}
    @JavascriptInterface public boolean driveHasFile(){return driveUri()!=null;}
    @JavascriptInterface public boolean driveCanRead(){return canOpenDrive();}
    @JavascriptInterface public String driveLabel(){return prefs.getString("drive_label","Copa-Ouro-Nuvem.json");}
    @JavascriptInterface public void driveCreate(){runOnUiThread(()->launchDrive(true));}
    @JavascriptInterface public void driveOpen(){runOnUiThread(()->launchDrive(false));}
    @JavascriptInterface public void driveGet(){driveReadAsync();}
    @JavascriptInterface public void drivePut(String value){driveWriteAsync(value);}
    @JavascriptInterface public void driveDisconnect(){prefs.edit().remove("drive_uri").remove("drive_label").apply();emit("window.CopaDriveDisconnected&&window.CopaDriveDisconnected()");}
  }
}
