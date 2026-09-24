package com.megakaraoke.app;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import java.util.List;

public class RankingActivity extends Activity {
    @Override protected void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(10,7,20));getWindow().setNavigationBarColor(Color.rgb(10,7,20));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(16),dp(18),dp(16),dp(12));root.setBackground(bg());
        TextView back=text("‹  Voltar",18,Color.WHITE,true);back.setOnClickListener(v->finish());root.addView(back,new LinearLayout.LayoutParams(-1,dp(45)));
        root.addView(text("🏆 Ranking Geral",28,Color.WHITE,true));TextView sub=text("Soma de pontos de todos os jogadores neste aparelho",14,Color.rgb(197,188,220),false);sub.setPadding(0,dp(4),0,dp(12));root.addView(sub);
        List<PlayerStore.Player> rank=PlayerStore.ranking(this);if(rank.isEmpty()){TextView empty=text("Ainda não há jogadores no ranking.\nCrie um jogador e complete uma música.",17,Color.rgb(206,198,225),false);empty.setGravity(Gravity.CENTER);root.addView(empty,new LinearLayout.LayoutParams(-1,0,1f));setContentView(root);return;}
        ListView list=new ListView(this);list.setDividerHeight(0);list.setCacheColorHint(Color.TRANSPARENT);list.setAdapter(new ArrayAdapter<PlayerStore.Player>(this,android.R.layout.simple_list_item_1,rank){@Override public View getView(int pos,View cv,android.view.ViewGroup parent){TextView v=(TextView)super.getView(pos,cv,parent);PlayerStore.Player p=getItem(pos);String medal=pos==0?"🥇":pos==1?"🥈":pos==2?"🥉":"#"+(pos+1);v.setText(medal+"   "+p.avatar+"  "+p.name+"\n        "+fmt(p.totalPoints)+" PONTOS  •  "+p.songs+" músicas\n        média "+fmt(p.average())+"  •  melhor "+fmt(p.bestScore));v.setTextColor(Color.WHITE);v.setTextSize(pos<3?17:16);v.setTypeface(pos<3?Typeface.DEFAULT_BOLD:Typeface.DEFAULT);v.setGravity(Gravity.CENTER_VERTICAL);v.setPadding(dp(14),dp(12),dp(10),dp(12));GradientDrawable g=new GradientDrawable();g.setColor(pos==0?Color.rgb(74,52,31):(pos%2==0?Color.rgb(25,20,41):Color.rgb(31,24,48)));g.setCornerRadius(dp(14));if(pos==0)g.setStroke(dp(2),Color.rgb(255,216,78));v.setBackground(g);return v;}});root.addView(list,new LinearLayout.LayoutParams(-1,0,1f));setContentView(root);
    }
    private String fmt(long n){return String.format(java.util.Locale.ROOT,"%,d",n).replace(',','.');}
    private TextView text(String s,int sp,int c,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(c);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private GradientDrawable bg(){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(10,7,20),Color.rgb(27,14,48),Color.rgb(8,12,27)});}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
