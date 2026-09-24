package com.megakaraoke.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;

public class PlayersActivity extends Activity {
    private final List<PlayerStore.Player> players=new ArrayList<>();
    private ArrayAdapter<PlayerStore.Player> adapter; private TextView status;
    @Override protected void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(10,7,20));getWindow().setNavigationBarColor(Color.rgb(10,7,20));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(16),dp(18),dp(16),dp(12));root.setBackground(bg());
        TextView back=text("‹  Voltar",18,Color.WHITE,true);back.setOnClickListener(v->finish());root.addView(back,new LinearLayout.LayoutParams(-1,dp(45)));
        root.addView(text("👥 Jogadores",28,Color.WHITE,true)); TextView sub=text("Crie perfis, escolha avatar e selecione quem vai cantar",14,Color.rgb(197,188,220),false);sub.setPadding(0,dp(4),0,dp(12));root.addView(sub);
        Button add=button("＋ Criar novo jogador");add.setOnClickListener(v->createDialog());root.addView(add,new LinearLayout.LayoutParams(-1,dp(52)));
        status=text("",13,Color.rgb(190,182,211),false);status.setPadding(0,dp(10),0,dp(6));root.addView(status);
        ListView list=new ListView(this);list.setDividerHeight(0);list.setCacheColorHint(Color.TRANSPARENT);
        adapter=new ArrayAdapter<PlayerStore.Player>(this,android.R.layout.simple_list_item_1,players){@Override public View getView(int pos,View cv,android.view.ViewGroup parent){TextView v=(TextView)super.getView(pos,cv,parent);PlayerStore.Player p=getItem(pos);boolean active=p!=null&&p.id.equals(PlayerStore.activeId(PlayersActivity.this));v.setText((active?"✓  ":"")+p.avatar+"  "+p.name+"\n     "+fmt(p.totalPoints)+" pts  •  "+p.songs+" músicas  •  recorde "+fmt(p.bestScore));v.setTextColor(Color.WHITE);v.setTextSize(16);v.setGravity(Gravity.CENTER_VERTICAL);v.setPadding(dp(14),dp(11),dp(10),dp(11));GradientDrawable g=new GradientDrawable();g.setColor(active?Color.rgb(71,46,112):(pos%2==0?Color.rgb(25,20,41):Color.rgb(31,24,48)));g.setCornerRadius(dp(14));if(active)g.setStroke(dp(2),Color.rgb(255,216,78));v.setBackground(g);return v;}};
        list.setAdapter(adapter);root.addView(list,new LinearLayout.LayoutParams(-1,0,1f));
        list.setOnItemClickListener((p,v,pos,id)->{PlayerStore.setActive(this,players.get(pos).id);refresh();Toast.makeText(this,players.get(pos).name+" selecionado",Toast.LENGTH_SHORT).show();});
        list.setOnItemLongClickListener((p,v,pos,id)->{PlayerStore.Player who=players.get(pos);new AlertDialog.Builder(this).setTitle("Excluir jogador?").setMessage(who.avatar+" "+who.name+" e seus pontos serão removidos.").setNegativeButton("Cancelar",null).setPositiveButton("Excluir",(d,w)->{PlayerStore.delete(this,who.id);refresh();}).show();return true;});
        setContentView(root);refresh();
    }
    @Override protected void onResume(){super.onResume();refresh();}
    private void createDialog(){LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(20),dp(6),dp(20),0);EditText name=new EditText(this);name.setHint("Nome do jogador");box.addView(name,new LinearLayout.LayoutParams(-1,dp(55)));Spinner avatar=new Spinner(this);String[] opts=new String[PlayerStore.AVATARS.length];for(int i=0;i<opts.length;i++)opts[i]=PlayerStore.AVATARS[i]+"  Avatar "+(i+1);avatar.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,opts));box.addView(avatar,new LinearLayout.LayoutParams(-1,dp(55)));new AlertDialog.Builder(this).setTitle("Novo jogador").setView(box).setNegativeButton("Cancelar",null).setPositiveButton("Criar",(d,w)->{String n=name.getText().toString().trim();if(n.isEmpty())n="Jogador "+(PlayerStore.all(this).size()+1);PlayerStore.create(this,n,PlayerStore.AVATARS[avatar.getSelectedItemPosition()]);refresh();}).show();}
    private void refresh(){if(adapter==null)return;players.clear();players.addAll(PlayerStore.all(this));adapter.notifyDataSetChanged();PlayerStore.Player a=PlayerStore.active(this);status.setText(players.size()+" jogador(es)"+(a==null?" · nenhum selecionado":" · ativo: "+a.avatar+" "+a.name));}
    private String fmt(long n){return String.format(java.util.Locale.ROOT,"%,d",n).replace(',','.');}
    private TextView text(String s,int sp,int c,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(c);if(bold)v.setTypeface(Typeface.DEFAULT_BOLD);return v;}
    private Button button(String s){Button b=new Button(this);b.setText(s);b.setTextSize(16);b.setTextColor(Color.WHITE);b.setAllCaps(false);GradientDrawable g=new GradientDrawable();g.setColor(Color.rgb(87,55,139));g.setCornerRadius(dp(15));b.setBackground(g);return b;}
    private GradientDrawable bg(){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(10,7,20),Color.rgb(27,14,48),Color.rgb(8,12,27)});}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
