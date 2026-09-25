package com.megakaraoke.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
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
        String asset,display,artist,title,search;
        Song(JSONObject o){asset=o.optString("asset");display=o.optString("display");artist=o.optString("artist","Acervo Nacional");title=o.optString("title",display);search=o.optString("search",normalize(display+" "+artist+" "+title));}
        @Override public String toString(){return display;}
    }

    private final List<Song> all=new ArrayList<>(),shown=new ArrayList<>();
    private final List<Button> modeButtons=new ArrayList<>();
    private ArrayAdapter<Song> adapter;
    private TextView playerAvatar,playerName,playerStats,modeInfo,status;
    private String mode="solo";

    @Override protected void onCreate(Bundle b){
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.rgb(11,8,24));
        getWindow().setNavigationBarColor(Color.rgb(11,8,24));
        mode=getSharedPreferences("mega_ui_v12",MODE_PRIVATE).getString("mode","solo");

        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(14),dp(10),dp(14),dp(8));root.setBackground(bg());

        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout titles=new LinearLayout(this);titles.setOrientation(LinearLayout.VERTICAL);
        titles.addView(text("🎤 MEGA KARAOKÊ",26,Color.WHITE,true));
        titles.addView(text("Escolha, cante e pontue",13,Color.rgb(198,190,219),false));
        header.addView(titles,new LinearLayout.LayoutParams(0,dp(58),1f));
        Button ranking=smallButton("🏆",20);ranking.setContentDescription("Ranking");ranking.setOnClickListener(v->startActivity(new Intent(this,RankingActivity.class)));header.addView(ranking,new LinearLayout.LayoutParams(dp(52),dp(48)));
        root.addView(header);

        LinearLayout playerCard=new LinearLayout(this);playerCard.setGravity(Gravity.CENTER_VERTICAL);playerCard.setPadding(dp(12),dp(10),dp(12),dp(10));playerCard.setBackground(card(Color.rgb(31,24,52),Color.rgb(101,76,148),18));
        playerAvatar=text("👤",42,Color.WHITE,false);playerAvatar.setGravity(Gravity.CENTER);playerCard.addView(playerAvatar,new LinearLayout.LayoutParams(dp(62),dp(62)));
        LinearLayout ptxt=new LinearLayout(this);ptxt.setOrientation(LinearLayout.VERTICAL);ptxt.setPadding(dp(8),0,dp(8),0);
        playerName=text("Escolha um jogador",18,Color.WHITE,true);playerStats=text("Crie ou selecione seu perfil",12,Color.rgb(200,191,221),false);ptxt.addView(playerName);ptxt.addView(playerStats);playerCard.addView(ptxt,new LinearLayout.LayoutParams(0,-2,1f));
        root.addView(playerCard,new LinearLayout.LayoutParams(-1,-2));

        LinearLayout profileActions=new LinearLayout(this);profileActions.setPadding(0,dp(6),0,0);
        Button players=button("👥 Trocar jogador",14);players.setOnClickListener(v->startActivity(new Intent(this,PlayersActivity.class)));
        Button avatar=button("🎨 Avatar",14);avatar.setOnClickListener(v->startActivity(new Intent(this,AvatarActivity.class)));
        profileActions.addView(players,new LinearLayout.LayoutParams(0,dp(46),1f));
        LinearLayout.LayoutParams avp=new LinearLayout.LayoutParams(0,dp(46),1f);avp.setMargins(dp(6),0,0,0);profileActions.addView(avatar,avp);root.addView(profileActions);

        TextView step1=text("1. COMO VOCÊ QUER CANTAR?",12,Color.rgb(255,218,93),true);step1.setPadding(0,dp(10),0,dp(6));root.addView(step1);
        LinearLayout modesA=new LinearLayout(this);LinearLayout modesB=new LinearLayout(this);
        addMode(modesA,"solo","🎤 SOLO\nCante e some pontos");addMode(modesA,"treino","🎯 TREINO\nPratique sem ranking");
        addMode(modesB,"duelo","⚔️ DUELO\nDispute com outro jogador");addMode(modesB,"dueto","👥 DUETO\nCantem juntos");
        root.addView(modesA,new LinearLayout.LayoutParams(-1,dp(80)));LinearLayout.LayoutParams mbp=new LinearLayout.LayoutParams(-1,dp(80));mbp.setMargins(0,dp(6),0,0);root.addView(modesB,mbp);
        modeInfo=text("",13,Color.WHITE,true);modeInfo.setGravity(Gravity.CENTER);modeInfo.setPadding(dp(8),dp(7),dp(8),dp(7));root.addView(modeInfo);
        refreshModeButtons();

        LinearLayout quick=new LinearLayout(this);quick.setPadding(0,0,0,dp(7));
        Button online=button("🌐 Modo online",13);online.setOnClickListener(v->startActivity(new Intent(this,MainActivity.class)));
        Button help=button("❓ Como usar",13);help.setOnClickListener(v->showHelp());
        quick.addView(online,new LinearLayout.LayoutParams(0,dp(42),1f));LinearLayout.LayoutParams hp=new LinearLayout.LayoutParams(0,dp(42),1f);hp.setMargins(dp(6),0,0,0);quick.addView(help,hp);root.addView(quick);

        TextView step2=text("2. ESCOLHA UMA MÚSICA",12,Color.rgb(255,218,93),true);step2.setPadding(0,0,0,dp(6));root.addView(step2);
        EditText search=new EditText(this);search.setHint("🔎 Digite música ou artista...");search.setHintTextColor(Color.rgb(165,157,184));search.setTextColor(Color.WHITE);search.setSingleLine(true);search.setTextSize(16);search.setPadding(dp(14),0,dp(14),0);search.setBackground(card(Color.rgb(29,24,46),Color.rgb(91,72,122),16));root.addView(search,new LinearLayout.LayoutParams(-1,dp(50)));
        status=text("Carregando músicas...",12,Color.rgb(190,183,207),false);status.setPadding(0,dp(6),0,dp(5));root.addView(status);

        ListView list=new ListView(this);list.setDivider(null);list.setDividerHeight(dp(6));list.setCacheColorHint(Color.TRANSPARENT);
        adapter=new ArrayAdapter<Song>(this,android.R.layout.simple_list_item_1,shown){
            @Override public View getView(int position,View convertView,ViewGroup parent){
                Song s=getItem(position);
                LinearLayout row=new LinearLayout(EmbeddedLibraryActivity.this);row.setGravity(Gravity.CENTER_VERTICAL);row.setPadding(dp(12),dp(9),dp(10),dp(9));row.setBackground(card(position%2==0?Color.rgb(26,21,43):Color.rgb(32,25,50),Color.rgb(67,55,88),14));
                TextView play=text("▶",20,Color.rgb(255,218,93),true);play.setGravity(Gravity.CENTER);row.addView(play,new LinearLayout.LayoutParams(dp(38),dp(54)));
                LinearLayout info=new LinearLayout(EmbeddedLibraryActivity.this);info.setOrientation(LinearLayout.VERTICAL);
                TextView t=text(s==null?"Música":s.title,16,Color.WHITE,true);t.setSingleLine(true);TextView a=text(s==null?"":s.artist,13,Color.rgb(190,182,210),false);a.setSingleLine(true);info.addView(t);info.addView(a);row.addView(info,new LinearLayout.LayoutParams(0,-2,1f));
                return row;
            }
        };list.setAdapter(adapter);root.addView(list,new LinearLayout.LayoutParams(-1,0,1f));
        setContentView(root);

        loadCatalog();refreshPlayer();
        search.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){filter(s==null?"":s.toString());}public void afterTextChanged(Editable e){}});
        list.setOnItemClickListener((p,v,pos,id)->openSong(shown.get(pos)));
    }

    private void addMode(LinearLayout row,String key,String label){Button b=button(label,14);b.setTag(key);b.setGravity(Gravity.CENTER);b.setOnClickListener(v->{mode=(String)v.getTag();getSharedPreferences("mega_ui_v12",MODE_PRIVATE).edit().putString("mode",mode).apply();refreshModeButtons();});LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(80),1f);if(!modeButtons.isEmpty()&&row.getChildCount()>0)lp.setMargins(dp(6),0,0,0);row.addView(b,lp);modeButtons.add(b);}

    private void refreshModeButtons(){
        for(Button b:modeButtons){boolean active=mode.equals(b.getTag());GradientDrawable g=card(active?Color.rgb(116,73,207):Color.rgb(34,28,53),active?Color.rgb(255,218,93):Color.rgb(77,63,104),16);g.setStroke(dp(active?2:1),active?Color.rgb(255,218,93):Color.rgb(77,63,104));b.setBackground(g);b.setTextColor(Color.WHITE);}
        String d="🎤 SOLO selecionado · sua pontuação entra no ranking";
        if("treino".equals(mode))d="🎯 TREINO selecionado · pratique sem mexer no ranking";
        else if("duelo".equals(mode))d="⚔️ DUELO selecionado · escolha um adversário ao abrir a música";
        else if("dueto".equals(mode))d="👥 DUETO selecionado · escolha um parceiro ao abrir a música";
        modeInfo.setText(d);
    }

    private void showHelp(){new AlertDialog.Builder(this).setTitle("Como usar").setMessage("1. Escolha ou crie um jogador.\n\n2. Escolha Solo, Treino, Duelo ou Dueto.\n\n3. Pesquise uma música e toque nela.\n\n4. Na tela de canto: verde = dentro do tom, vermelho = fora do tom.\n\n5. Se a letra estiver adiantada ou atrasada, use −0,1s / AUTO / +0,1s.").setPositiveButton("Entendi",null).show();}

    private void openSong(Song s){
        PlayerStore.Player active=PlayerStore.active(this);
        if(active==null){new AlertDialog.Builder(this).setTitle("Escolha um jogador").setMessage("Antes de cantar, crie ou selecione um jogador.").setNegativeButton("Cancelar",null).setPositiveButton("Abrir jogadores",(d,w)->startActivity(new Intent(this,PlayersActivity.class))).show();return;}
        if(mode.equals("duelo")||mode.equals("dueto")){
            List<PlayerStore.Player> choices=new ArrayList<>();for(PlayerStore.Player p:PlayerStore.all(this))if(!p.id.equals(active.id))choices.add(p);
            if(choices.isEmpty()){new AlertDialog.Builder(this).setTitle("Falta outro jogador").setMessage("Crie pelo menos dois jogadores para usar "+(mode.equals("duelo")?"Duelo":"Dueto")+".").setPositiveButton("Criar jogador",(d,w)->startActivity(new Intent(this,PlayersActivity.class))).setNegativeButton("Cancelar",null).show();return;}
            String[] names=new String[choices.size()];for(int i=0;i<choices.size();i++)names[i]=choices.get(i).avatar+"  "+choices.get(i).name;
            new AlertDialog.Builder(this).setTitle(mode.equals("duelo")?"Escolha o adversário":"Escolha o parceiro").setItems(names,(d,which)->launchSong(s,active.id,choices.get(which).id)).show();return;
        }
        launchSong(s,active.id,"");
    }

    private void launchSong(Song s,String playerId,String secondId){Intent i=new Intent(this,KaraokePlayerActivity.class);i.putExtra("asset",s.asset);i.putExtra("title",s.title);i.putExtra("artist",s.artist);i.putExtra("display",s.display);i.putExtra("playerId",playerId);i.putExtra("secondPlayerId",secondId);i.putExtra("mode",mode);startActivity(i);}

    @Override protected void onResume(){super.onResume();refreshPlayer();}
    private void refreshPlayer(){if(playerName==null)return;PlayerStore.Player p=PlayerStore.active(this);if(p==null){playerAvatar.setText("👤");playerName.setText("Escolha um jogador");playerStats.setText("Toque em “Trocar jogador” para criar ou selecionar");}else{playerAvatar.setText(p.avatar);playerName.setText(p.name);playerStats.setText(fmt(p.totalPoints)+" pontos  •  "+p.songs+" músicas  •  melhor "+fmt(p.bestScore));}}

    private void loadCatalog(){try(InputStream in=getAssets().open("catalog_v6.json")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[65536];int n;while((n=in.read(buf))>0)out.write(buf,0,n);JSONObject root=new JSONObject(out.toString("UTF-8"));JSONArray arr=root.getJSONArray("items");for(int i=0;i<arr.length();i++)all.add(new Song(arr.getJSONObject(i)));shown.addAll(all);adapter.notifyDataSetChanged();status.setText(all.size()+" músicas no aparelho · toque em uma para cantar");}catch(Exception e){status.setText("Não foi possível abrir o catálogo interno.");}}
    private void filter(String q){String n=normalize(q);shown.clear();if(n.isEmpty())shown.addAll(all);else for(Song s:all)if(s.search.contains(n))shown.add(s);adapter.notifyDataSetChanged();status.setText(shown.size()+" resultado(s) · "+all.size()+" músicas internas");}
    static String normalize(String s){if(s==null)return"";String x=Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}+","");return x.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").trim();}
    private String fmt(long n){return String.format(Locale.ROOT,"%,d",n).replace(',','.');}
    private GradientDrawable bg(){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(10,7,21),Color.rgb(28,14,50),Color.rgb(7,12,28)});}
    private GradientDrawable card(int fill,int stroke,int radius){GradientDrawable g=new GradientDrawable();g.setColor(fill);g.setCornerRadius(dp(radius));g.setStroke(dp(1),stroke);return g;}
    private TextView text(String s,int sp,int c,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(c);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private Button button(String s,int sp){Button b=new Button(this);b.setText(s);b.setTextSize(sp);b.setTextColor(Color.WHITE);b.setAllCaps(false);b.setPadding(dp(6),0,dp(6),0);b.setBackground(card(Color.rgb(73,49,119),Color.rgb(104,76,150),14));return b;}
    private Button smallButton(String s,int sp){Button b=button(s,sp);b.setPadding(0,0,0,0);return b;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
