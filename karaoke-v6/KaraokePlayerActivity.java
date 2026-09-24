package com.megakaraoke.app;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class KaraokePlayerActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private TextView previousLine, currentLine, nextLine, countdown, timeView;
    private ProgressBar progress;
    private Button pauseButton;
    private List<LyricLine> lines = new ArrayList<>();
    private boolean started = false;
    private String assetPath;
    private File tempMidi;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK); getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        assetPath = getIntent().getStringExtra("asset");
        String title = getIntent().getStringExtra("title");
        String artist = getIntent().getStringExtra("artist");
        String display = getIntent().getStringExtra("display");
        if (title == null || title.trim().isEmpty()) title = display == null ? "Karaokê" : display;
        if (artist == null || artist.trim().isEmpty()) artist = "Acervo Nacional";

        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(16)); root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackground(karaokeBg());

        LinearLayout top = new LinearLayout(this); top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.CENTER_VERTICAL);
        Button back = button("‹", 25); back.setOnClickListener(v -> finish()); top.addView(back, new LinearLayout.LayoutParams(dp(54), dp(48)));
        LinearLayout names = new LinearLayout(this); names.setOrientation(LinearLayout.VERTICAL); names.setPadding(dp(8),0,0,0);
        TextView tvTitle = text(title, 21, Color.WHITE, true); tvTitle.setSingleLine(true); names.addView(tvTitle);
        TextView tvArtist = text(artist, 13, Color.rgb(194,185,218), false); tvArtist.setSingleLine(true); names.addView(tvArtist);
        top.addView(names, new LinearLayout.LayoutParams(0,-2,1f)); root.addView(top,new LinearLayout.LayoutParams(-1,-2));

        countdown = text("PREPARE-SE", 20, Color.rgb(211,190,255), true); countdown.setGravity(Gravity.CENTER);
        countdown.setPadding(0, dp(18), 0, dp(6)); root.addView(countdown,new LinearLayout.LayoutParams(-1,-2));

        LinearLayout lyricBox = new LinearLayout(this); lyricBox.setOrientation(LinearLayout.VERTICAL); lyricBox.setGravity(Gravity.CENTER);
        lyricBox.setPadding(dp(8), dp(18), dp(8), dp(18));
        GradientDrawable box = new GradientDrawable(); box.setColor(Color.argb(155, 8, 5, 17)); box.setCornerRadius(dp(22)); box.setStroke(dp(1), Color.rgb(79,60,111)); lyricBox.setBackground(box);
        previousLine = lyricText(24, Color.rgb(123,116,145), false);
        currentLine = lyricText(34, Color.WHITE, true);
        nextLine = lyricText(25, Color.rgb(166,157,185), false);
        lyricBox.addView(previousLine,new LinearLayout.LayoutParams(-1,-2));
        lyricBox.addView(currentLine,new LinearLayout.LayoutParams(-1,-2));
        lyricBox.addView(nextLine,new LinearLayout.LayoutParams(-1,-2));
        root.addView(lyricBox,new LinearLayout.LayoutParams(-1,0,1f));

        timeView = text("00:00 / --:--", 13, Color.rgb(203,196,221), false); timeView.setGravity(Gravity.CENTER);
        timeView.setPadding(0,dp(10),0,dp(5)); root.addView(timeView);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal); progress.setMax(1000); root.addView(progress,new LinearLayout.LayoutParams(-1,dp(8)));

        LinearLayout controls = new LinearLayout(this); controls.setGravity(Gravity.CENTER); controls.setPadding(0,dp(12),0,0);
        pauseButton = button("⏸ Pausar", 16); pauseButton.setOnClickListener(v -> togglePause()); controls.addView(pauseButton,new LinearLayout.LayoutParams(dp(150),dp(50)));
        Button restart = button("↻ Reiniciar", 16); restart.setOnClickListener(v -> restart()); LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(dp(150),dp(50)); rp.setMargins(dp(10),0,0,0); controls.addView(restart,rp);
        root.addView(controls);

        setContentView(root);
        prepareSong();
    }

    private void prepareSong() {
        try {
            byte[] midi = readAsset(assetPath);
            lines = MidiKaraokeParser.parse(midi);
            tempMidi = new File(getCacheDir(), "mega_karaoke_selected.mid");
            try (FileOutputStream f = new FileOutputStream(tempMidi)) { f.write(midi); }
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).setUsage(AudioAttributes.USAGE_MEDIA).build());
            player.setDataSource(tempMidi.getAbsolutePath());
            player.setOnCompletionListener(mp -> onFinished());
            player.prepare();
            if (lines.isEmpty()) {
                currentLine.setText("♪ Karaoke MIDI ♪"); nextLine.setText("A letra sincronizada não foi encontrada nesta versão da faixa.");
            } else {
                renderLyrics(0);
            }
            startCountdown(3);
        } catch (Exception e) {
            countdown.setText("NÃO FOI POSSÍVEL ABRIR");
            currentLine.setText("Esta faixa não pôde ser carregada.");
            nextLine.setText(e.getClass().getSimpleName());
            pauseButton.setEnabled(false);
        }
    }

    private void startCountdown(int n) {
        if (player == null) return;
        if (n > 0) {
            countdown.setText(String.valueOf(n));
            handler.postDelayed(() -> startCountdown(n-1), 700);
        } else {
            countdown.setText("🎤 CANTE!");
            player.seekTo(0); player.start(); started=true;
            pauseButton.setText("⏸ Pausar");
            handler.postDelayed(() -> countdown.setText(""), 900);
            handler.post(updateLoop);
        }
    }

    private final Runnable updateLoop = new Runnable() {
        @Override public void run() {
            if (player == null || !started) return;
            try {
                int pos=player.getCurrentPosition(), dur=Math.max(1,player.getDuration());
                progress.setProgress((int)(1000L*pos/dur)); timeView.setText(fmt(pos)+" / "+fmt(dur));
                renderLyrics(pos);
            } catch (Exception ignored) {}
            handler.postDelayed(this, 55);
        }
    };

    private void renderLyrics(long ms) {
        if (lines.isEmpty()) return;
        int li=0;
        for (int i=0;i<lines.size();i++) { if (lines.get(i).startMs <= ms) li=i; else break; }
        LyricLine line=lines.get(li);
        previousLine.setText(li>0 ? lines.get(li-1).plain : "");
        nextLine.setText(li+1<lines.size()?lines.get(li+1).plain:"");
        SpannableStringBuilder sb=new SpannableStringBuilder();
        int active=-1;
        for (int i=0;i<line.tokens.size();i++) if (line.tokens.get(i).ms<=ms) active=i;
        for (int i=0;i<line.tokens.size();i++) {
            int st=sb.length(); sb.append(line.tokens.get(i).text); int en=sb.length();
            int c = i < active ? Color.rgb(132,86,255) : (i==active ? Color.rgb(255,216,78) : Color.WHITE);
            sb.setSpan(new ForegroundColorSpan(c),st,en,Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        currentLine.setText(sb);
    }

    private void togglePause() {
        if (player==null || !started) return;
        try {
            if (player.isPlaying()) { player.pause(); pauseButton.setText("▶ Continuar"); countdown.setText("PAUSADO"); }
            else { player.start(); pauseButton.setText("⏸ Pausar"); countdown.setText(""); }
        } catch (Exception ignored) {}
    }
    private void restart() { if (player==null) return; try { player.seekTo(0); if (!player.isPlaying()) player.start(); started=true; pauseButton.setText("⏸ Pausar"); countdown.setText("🎤 CANTE!"); } catch(Exception ignored){} }
    private void onFinished() { started=false; countdown.setText("⭐ MÚSICA CONCLUÍDA"); progress.setProgress(1000); pauseButton.setText("▶ Cantar novamente"); pauseButton.setOnClickListener(v -> { pauseButton.setOnClickListener(x -> togglePause()); restart(); }); }

    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); if(player!=null){try{player.stop();}catch(Exception ignored){} try{player.release();}catch(Exception ignored){}} if(tempMidi!=null) tempMidi.delete(); super.onDestroy(); }

    private byte[] readAsset(String path) throws Exception {
        if (path == null || path.isEmpty()) throw new IllegalArgumentException("asset");
        try(InputStream in=getAssets().open(path); ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[32768]; int n; while((n=in.read(b))>0) out.write(b,0,n); return out.toByteArray();
        }
    }
    private String fmt(int ms){int s=Math.max(0,ms/1000);return String.format(java.util.Locale.ROOT,"%02d:%02d",s/60,s%60);}    
    private TextView lyricText(int sp,int color,boolean bold){TextView v=text("",sp,color,bold);v.setGravity(Gravity.CENTER);v.setPadding(dp(4),dp(12),dp(4),dp(12));v.setLineSpacing(0,1.08f);return v;}
    private TextView text(String s,int sp,int color,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(color);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private Button button(String s,int sp){Button b=new Button(this);b.setText(s);b.setTextSize(sp);b.setTextColor(Color.WHITE);b.setAllCaps(false);GradientDrawable g=new GradientDrawable();g.setColor(Color.rgb(63,42,103));g.setCornerRadius(dp(14));b.setBackground(g);return b;}
    private GradientDrawable karaokeBg(){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(4,3,10),Color.rgb(23,10,43),Color.rgb(4,10,24)});}    
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}    

    static class Token { long ms; String text; Token(long m,String t){ms=m;text=t;} }
    static class LyricLine { long startMs; String plain; List<Token> tokens=new ArrayList<>(); }
    static class TextEvent { long tick; String text; int type; TextEvent(long t,String s,int ty){tick=t;text=s;type=ty;} }
    static class Tempo { long tick; int usq; Tempo(long t,int u){tick=t;usq=u;} }

    static class MidiKaraokeParser {
        static List<LyricLine> parse(byte[] b) throws Exception {
            if (b.length<14 || readInt(b,0)!=0x4D546864) return Collections.emptyList();
            int hlen=readInt(b,4), division=readU16(b,12); int pos=8+hlen;
            List<List<TextEvent>> tracks=new ArrayList<>(); List<Tempo> tempos=new ArrayList<>(); tempos.add(new Tempo(0,500000));
            while(pos+8<=b.length){int tag=readInt(b,pos),len=readInt(b,pos+4);pos+=8;if(len<0||pos+len>b.length)break;if(tag==0x4D54726B){List<TextEvent> ev=new ArrayList<>();parseTrack(b,pos,pos+len,ev,tempos);tracks.add(ev);}pos+=len;}
            Collections.sort(tempos,Comparator.comparingLong(t->t.tick));
            List<TextEvent> best=null;int bestScore=-1;
            for(List<TextEvent> tr:tracks){int score=0;for(TextEvent e:tr)if(isLyricText(e.text))score+=(e.type==5?3:1);if(score>bestScore){bestScore=score;best=tr;}}
            if(best==null)return Collections.emptyList();
            List<Token> stream=new ArrayList<>();
            for(TextEvent e:best){if(!isLyricText(e.text))continue;stream.add(new Token(tickToMs(e.tick,tempos,division),cleanText(e.text)));}
            Collections.sort(stream,Comparator.comparingLong(t->t.ms));
            return buildLines(stream);
        }
        static void parseTrack(byte[] b,int p,int end,List<TextEvent> out,List<Tempo> tempos) throws Exception {
            long tick=0;int running=0;
            while(p<end){Vlq d=vlq(b,p,end);p=d.next;tick+=d.value;if(p>=end)break;int status=b[p]&255;boolean runningUsed=false;int first=-1;
                if(status<0x80){if(running==0)break;status=running;runningUsed=true;first=b[p++]&255;}else{p++;if(status<0xF0)running=status;}
                if(status==0xFF){if(p>=end)break;int type=b[p++]&255;Vlq l=vlq(b,p,end);p=l.next;int len=(int)Math.min(l.value,end-p);if(type==0x51&&len>=3){int us=((b[p]&255)<<16)|((b[p+1]&255)<<8)|(b[p+2]&255);tempos.add(new Tempo(tick,us));}else if((type==0x01||type==0x05)&&len>0){String s=decode(b,p,len);out.add(new TextEvent(tick,s,type));}p+=len;continue;}
                if(status==0xF0||status==0xF7){Vlq l=vlq(b,p,end);p=l.next+(int)l.value;if(p>end)p=end;continue;}
                int hi=status&0xF0;int need=(hi==0xC0||hi==0xD0)?1:2;if(runningUsed)need--;p+=need;if(p>end)p=end;
            }
        }
        static boolean isLyricText(String s){if(s==null)return false;String x=s.trim();if(x.isEmpty())return false;if(x.startsWith("@")||x.startsWith("%"))return false;String low=x.toLowerCase(java.util.Locale.ROOT);if(low.contains("soft karaoke")||low.startsWith("track ")||low.startsWith("midi made")||low.startsWith("kar made"))return false;return true;}
        static String cleanText(String s){return s.replace('\u0000',' ').replace("\r","/").replace("\n","\\");}
        static List<LyricLine> buildLines(List<Token> stream){List<LyricLine> lines=new ArrayList<>();LyricLine cur=new LyricLine();for(Token src:stream){String x=src.text;if(x==null)continue;boolean newLine=false;while(!x.isEmpty()&&(x.charAt(0)=='/'||x.charAt(0)=='\\')){newLine=true;x=x.substring(1);}if(newLine&&!cur.tokens.isEmpty()){finish(cur);lines.add(cur);cur=new LyricLine();}if(!x.isEmpty()){cur.tokens.add(new Token(src.ms,x));}}if(!cur.tokens.isEmpty()){finish(cur);lines.add(cur);}return lines;}
        static void finish(LyricLine l){l.startMs=l.tokens.get(0).ms;StringBuilder s=new StringBuilder();for(Token t:l.tokens)s.append(t.text);l.plain=s.toString().trim();}
        static long tickToMs(long tick,List<Tempo> tempos,int div){if((div&0x8000)!=0){int fps=256-((div>>8)&255),sub=div&255;return (long)(1000.0*tick/(Math.max(1,fps)*Math.max(1,sub)));}long us=0,last=0;int tempo=500000;for(Tempo t:tempos){if(t.tick>tick)break;if(t.tick>last){us+=(t.tick-last)*(long)tempo/Math.max(1,div);last=t.tick;}tempo=t.usq;}us+=(tick-last)*(long)tempo/Math.max(1,div);return us/1000;}
        static String decode(byte[] b,int p,int len){try{return new String(b,p,len,Charset.forName("windows-1252"));}catch(Exception e){return new String(b,p,len);}}
        static class Vlq{long value;int next;Vlq(long v,int n){value=v;next=n;}}
        static Vlq vlq(byte[] b,int p,int end){long v=0;int c=0;while(p<end&&c<4){int x=b[p++]&255;v=(v<<7)|(x&127);c++;if((x&128)==0)break;}return new Vlq(v,p);}
        static int readInt(byte[] b,int p){return ((b[p]&255)<<24)|((b[p+1]&255)<<16)|((b[p+2]&255)<<8)|(b[p+3]&255);}static int readU16(byte[] b,int p){return ((b[p]&255)<<8)|(b[p+1]&255);}    
    }
}
