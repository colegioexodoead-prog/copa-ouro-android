package com.megakaraoke.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class EmbeddedLibraryActivity extends Activity {
    static class Song {
        String asset, display, artist, title, search;
        Song(JSONObject o){asset=o.optString("asset");display=o.optString("display");artist=o.optString("artist","Acervo Nacional");title=o.optString("title",display);search=o.optString("search",normalize(display+" "+artist+" "+title));}
        @Override public String toString(){return display;}
    }
    private final List<Song> all=new ArrayList<>(), shown=new ArrayList<>();
    private ArrayAdapter<Song> adapter; private TextView status, playerName, playerStats; private LinearLayout playerCard;

    @Override protected void onCreate(Bundle savedInstanceState){super.onCreate(savedInstanceState);getWindow().setStatusBarColor(Color.rgb(10,7,20));getWindow().setNavigationBarColor(Color.rgb(10,7,20));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(16),dp(16),dp(16),dp(10));root.setBackground(gradient());
        TextView back=text("‹  Voltar",18,Color.WHITE,true);back.setPadding(0,dp(4),0,dp(8));back.setOnClickListener(v->finish());root.addView(back,new LinearLayout.LayoutParams(-1,-2));
        root.addView(text("🎤 Biblioteca Interna",28,Color.WHITE,true));TextView sub=text("Escolha seu jogador, cante, pontue e suba no ranking",14,Color.rgb(198,190,220),false);sub.setPadding(0,dp(3),0,dp(10));root.addView(sub);

        playerCard=new LinearLayout(this);playerCard.setOrientation(LinearLayout.VERTICAL);playerCard.setPadding(dp(14),dp(12),dp(14),dp(12));GradientDrawable pc=new GradientDrawable();pc.setColor(Color.rgb(31,24,50));pc.setCornerRadius(dp(18));pc.setStroke(dp(1),Color.rgb(91,66,135));playerCard.setBackground(pc);
        playerName=text("Nenhum jogador selecionado",18,Color.WHITE,true);playerStats=text("Crie um jogador para começar a pontuar",13,Color.rgb(196,187,216),false);playerCard.addView(playerName);playerCard.addView(playerStats);root.addView(playerCard,new LinearLayout.LayoutParams(-1,-2));
        LinearLayout gameBtns=new LinearLayout(this);gameBtns.setGravity(Gravity.CENTER);gameBtns.setPadding(0,dp(8),0,dp(10));Button players=button("👥 Jogadores");players.setOnClickListener(v->startActivity(new Intent(this,PlayersActivity.class)));Button ranking=button("🏆 Ranking Geral");ranking.setOnClickListener(v->startActivity(new Intent(this,RankingActivity.class)));gameBtns.addView(players,new LinearLayout.LayoutParams(0,dp(48),1f));LinearLayout.LayoutParams rb=new LinearLayout.LayoutParams(0,dp(48),1f);rb.setMargins(dp(8),0,0,0);gameBtns.addView(ranking,rb);root.addView(gameBtns);

        EditText search=new EditText(this);search.setHint("Pesquisar: Zezé Di Camargo, É o Amor...");search.setHintTextColor(Color.rgb(150,143,170));search.setTextColor(Color.WHITE);search.setSingleLine(true);search.setPadding(dp(14),0,dp(14),0);GradientDrawable sbg=new GradientDrawable();sbg.setColor(Color.rgb(31,25,49));sbg.setCornerRadius(dp(14));sbg.setStroke(dp(1),Color.rgb(80,67,105));search.setBackground(sbg);root.addView(search,new LinearLayout.LayoutParams(-1,dp(50)));
        status=text("Carregando catálogo...",13,Color.rgb(180,172,201),false);status.setPadding(0,dp(8),0,dp(7));root.addView(status);
        ListView list=new ListView(this);list.setDividerHeight(0);list.setCacheColorHint(Color.TRANSPARENT);adapter=new ArrayAdapter<Song>(this,android.R.layout.simple_list_item_1,shown){@Override public View getView(int position,View convertView,android.view.ViewGroup parent){TextView v=(TextView)super.getView(position,convertView,parent);Song s=getItem(position);v.setText("🎵  "+(s==null?"":s.display));v.setTextColor(Color.WHITE);v.setTextSize(16);v.setGravity(Gravity.CENTER_VERTICAL);v.setPadding(dp(12),dp(11),dp(8),dp(11));GradientDrawable bg=new GradientDrawable();bg.setColor(position%2==0?Color.rgb(25,20,41):Color.rgb(30,24,47));bg.setCornerRadius(dp(12));v.setBackground(bg);return v;}};list.setAdapter(adapter);root.addView(list,new LinearLayout.LayoutParams(-1,0,1f));setContentView(root);
        loadCatalog();refreshPlayer();
        search.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){filter(s==null?"":s.toString());}public void afterTextChanged(Editable e){}});
        list.setOnItemClickListener((p,v,pos,id)->{PlayerStore.Player active=PlayerStore.active(this);if(active==null){Toast.makeText(this,"Crie ou escolha um jogador antes de cantar.",Toast.LENGTH_LONG).show();startActivity(new Intent(this,PlayersActivity.class));return;}Song s=shown.get(pos);Intent i=new Intent(this,KaraokePlayerActivity.class);i.putExtra("asset",s.asset);i.putExtra("title",s.title);i.putExtra("artist",s.artist);i.putExtra("display",s.display);i.putExtra("playerId",active.id);startActivity(i);});
    }
    @Override protected void onResume(){super.onResume();refreshPlayer();}
    private void refreshPlayer(){if(playerName==null)return;PlayerStore.Player p=PlayerStore.active(this);if(p==null){playerName.setText("👤 Nenhum jogador selecionado");playerStats.setText("Toque em Jogadores para criar ou escolher um perfil");}else{playerName.setText(p.avatar+"  "+p.name);playerStats.setText(fmt(p.totalPoints)+" pontos totais  •  "+p.songs+" músicas  •  recorde "+fmt(p.bestScore));}}
    private void loadCatalog(){try(InputStream in=getAssets().open("catalog_v6.json")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[65536];int n;while((n=in.read(buf))>0)out.write(buf,0,n);JSONObject root=new JSONObject(out.toString("UTF-8"));JSONArray arr=root.getJSONArray("items");for(int i=0;i<arr.length();i++)all.add(new Song(arr.getJSONObject(i)));shown.addAll(all);adapter.notifyDataSetChanged();status.setText(all.size()+" karaokês prontos · escolha uma música para cantar");}catch(Exception e){status.setText("Não foi possível abrir o catálogo interno: "+e.getClass().getSimpleName());}}
    private void filter(String q){String n=normalize(q);shown.clear();if(n.isEmpty())shown.addAll(all);else for(Song s:all)if(s.search.contains(n))shown.add(s);adapter.notifyDataSetChanged();status.setText(shown.size()+" resultado(s) · "+all.size()+" karaokês no APK");}
    static String normalize(String s){if(s==null)return"";String x=Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}+","");return x.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").trim();}
    private String fmt(long n){return String.format(Locale.ROOT,"%,d",n).replace(',','.');}
    private GradientDrawable gradient(){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(10,7,20),Color.rgb(25,13,45),Color.rgb(8,12,27)});}
    private TextView text(String s,int sp,int color,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(color);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private Button button(String s){Button b=new Button(this);b.setText(s);b.setTextSize(14);b.setTextColor(Color.WHITE);b.setAllCaps(false);GradientDrawable g=new GradientDrawable();g.setColor(Color.rgb(77,49,125));g.setCornerRadius(dp(14));b.setBackground(g);return b;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
