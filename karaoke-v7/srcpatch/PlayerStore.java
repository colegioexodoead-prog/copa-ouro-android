package com.megakaraoke.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public final class PlayerStore {
    public static final String[] AVATARS = {"🎤","🎸","⭐","🔥","👑","🎧","🎼","🕺","💃","🚀","😎","🦁","🐯","🦊","🐼","🦄"};
    private static final String PREF = "mega_karaoke_players_v1";
    private static final String KEY_PLAYERS = "players";
    private static final String KEY_ACTIVE = "active_player";

    public static class Player {
        public String id, name, avatar;
        public long totalPoints;
        public int songs, bestScore, lastScore;
        public Player(String id, String name, String avatar, long totalPoints, int songs, int bestScore, int lastScore) {
            this.id=id; this.name=name; this.avatar=avatar; this.totalPoints=totalPoints; this.songs=songs; this.bestScore=bestScore; this.lastScore=lastScore;
        }
        public int average() { return songs <= 0 ? 0 : (int)Math.round((double)totalPoints / songs); }
    }

    private PlayerStore() {}
    private static SharedPreferences prefs(Context c){ return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

    public static synchronized List<Player> all(Context c) {
        List<Player> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(prefs(c).getString(KEY_PLAYERS, "[]"));
            for(int i=0;i<a.length();i++){
                JSONObject o=a.getJSONObject(i);
                out.add(new Player(o.optString("id"),o.optString("name","Jogador"),o.optString("avatar","🎤"),o.optLong("totalPoints"),o.optInt("songs"),o.optInt("bestScore"),o.optInt("lastScore")));
            }
        } catch(Exception ignored) {}
        return out;
    }

    private static synchronized void save(Context c, List<Player> players){
        JSONArray a=new JSONArray();
        try {
            for(Player p:players){
                JSONObject o=new JSONObject();
                o.put("id",p.id);o.put("name",p.name);o.put("avatar",p.avatar);o.put("totalPoints",p.totalPoints);o.put("songs",p.songs);o.put("bestScore",p.bestScore);o.put("lastScore",p.lastScore);a.put(o);
            }
        } catch(Exception ignored) {}
        prefs(c).edit().putString(KEY_PLAYERS,a.toString()).apply();
    }

    public static synchronized Player create(Context c,String name,String avatar){
        String n=name==null?"":name.trim(); if(n.isEmpty()) n="Jogador";
        Player p=new Player(UUID.randomUUID().toString(),n,(avatar==null||avatar.isEmpty())?"🎤":avatar,0,0,0,0);
        List<Player> list=all(c); list.add(p); save(c,list); setActive(c,p.id); return p;
    }

    public static synchronized void delete(Context c,String id){
        List<Player> list=all(c); for(int i=list.size()-1;i>=0;i--) if(list.get(i).id.equals(id)) list.remove(i); save(c,list);
        if(id!=null && id.equals(activeId(c))) prefs(c).edit().remove(KEY_ACTIVE).apply();
    }

    public static String activeId(Context c){ return prefs(c).getString(KEY_ACTIVE,""); }
    public static void setActive(Context c,String id){ prefs(c).edit().putString(KEY_ACTIVE,id==null?"":id).apply(); }
    public static Player active(Context c){ String id=activeId(c); for(Player p:all(c)) if(p.id.equals(id)) return p; return null; }
    public static Player byId(Context c,String id){ for(Player p:all(c)) if(p.id.equals(id)) return p; return null; }

    public static synchronized Player addScore(Context c,String id,int score){
        score=Math.max(0,Math.min(10000,score)); List<Player> list=all(c); Player found=null;
        for(Player p:list) if(p.id.equals(id)){ p.lastScore=score;p.totalPoints+=score;p.songs++;p.bestScore=Math.max(p.bestScore,score);found=p;break; }
        save(c,list); return found;
    }

    public static List<Player> ranking(Context c){
        List<Player> list=all(c);
        Collections.sort(list,new Comparator<Player>(){ public int compare(Player a,Player b){ int x=Long.compare(b.totalPoints,a.totalPoints); if(x!=0)return x; x=Integer.compare(b.bestScore,a.bestScore); if(x!=0)return x; return a.name.compareToIgnoreCase(b.name);} });
        return list;
    }
}
