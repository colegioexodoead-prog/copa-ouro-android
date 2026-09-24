package com.megakaraoke.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class LauncherActivity extends Activity {
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8,5,17));
        getWindow().setNavigationBarColor(Color.rgb(8,5,17));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(38), dp(24), dp(24));
        root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{Color.rgb(8,5,17),Color.rgb(35,15,61),Color.rgb(6,13,31)}));

        TextView logo = label("🎤", 58, Color.WHITE, false); logo.setGravity(Gravity.CENTER); root.addView(logo);
        TextView name = label("MEGA KARAOKÊ V6", 29, Color.WHITE, true); name.setGravity(Gravity.CENTER); root.addView(name);
        TextView sub = label("Escolha como você quer cantar", 15, Color.rgb(201,191,222), false);
        sub.setGravity(Gravity.CENTER); sub.setPadding(0,dp(5),0,dp(32)); root.addView(sub);

        Button internal = bigButton("🎵  Biblioteca Interna\n1.325 karaokês nacionais no APK", Color.rgb(104,66,190));
        internal.setOnClickListener(v -> startActivity(new Intent(this, EmbeddedLibraryActivity.class)));
        root.addView(internal,new LinearLayout.LayoutParams(-1,dp(92)));

        Button online = bigButton("🌐  Mega Karaokê Online\nSolo · treino · duelo · ranking", Color.rgb(44,83,150));
        LinearLayout.LayoutParams op = new LinearLayout.LayoutParams(-1,dp(92)); op.setMargins(0,dp(14),0,0);
        online.setOnClickListener(v -> startActivity(new Intent(this, MainActivity.class)));
        root.addView(online,op);

        TextView info = label("As músicas internas funcionam sem internet. Ao selecionar um KAR, a letra sincronizada aparece automaticamente em tela cheia.", 13, Color.rgb(171,162,192), false);
        info.setGravity(Gravity.CENTER); info.setPadding(dp(5),dp(28),dp(5),0); root.addView(info);

        setContentView(root);
    }

    private Button bigButton(String txt,int color){
        Button b=new Button(this); b.setText(txt); b.setTextColor(Color.WHITE); b.setTextSize(17); b.setAllCaps(false); b.setGravity(Gravity.CENTER);
        GradientDrawable g=new GradientDrawable(); g.setColor(color); g.setCornerRadius(dp(20)); g.setStroke(dp(1),Color.argb(100,255,255,255)); b.setBackground(g); return b;
    }
    private TextView label(String s,int sp,int color,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(color);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}    
}
