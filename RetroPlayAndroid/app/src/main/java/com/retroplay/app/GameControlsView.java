package com.retroplay.app;

import android.content.Context;
import android.graphics.*;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

public class GameControlsView extends View {
    public interface KeySink { void keyDown(int keyCode); void keyUp(int keyCode); }
    private KeySink sink;

    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private float joyCx, joyCy, joyR, knobX, knobY;
    private boolean joyActive = false;
    private boolean up, down, left, right;

    private RectF aRect=new RectF(), bRect=new RectF(), xRect=new RectF(), yRect=new RectF();
    private RectF startRect=new RectF(), selectRect=new RectF();
    private int activeButton = 0;

    public GameControlsView(Context c, AttributeSet a){ super(c,a); setFocusable(true); }

    public void setKeySink(KeySink s){ sink=s; }

    @Override protected void onDraw(Canvas c){
        super.onDraw(c);
        float w=getWidth(), h=getHeight();
        float density=getResources().getDisplayMetrics().density;

        joyR=Math.min(58*density, h*0.16f);
        joyCx=joyR+18*density; joyCy=h-joyR-18*density;
        if(!joyActive){ knobX=joyCx; knobY=joyCy; }

        p.setStyle(Paint.Style.FILL);
        p.setColor(0x77303A46); c.drawCircle(joyCx,joyCy,joyR,p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(2*density); p.setColor(0x55FFFFFF); c.drawCircle(joyCx,joyCy,joyR,p);
        p.setStyle(Paint.Style.FILL); p.setColor(0xCC26303A); c.drawCircle(knobX,knobY,joyR*0.43f,p);

        float br=Math.min(22*density, h*0.06f), gap=br*2.1f;
        float bx=w-32*density-br, by=h-joyR-20*density;
        aRect.set(bx-br,by-br,bx+br,by+br);
        bRect.set(bx-gap-br,by+gap*0.55f-br,bx-gap+br,by+gap*0.55f+br);
        xRect.set(bx-gap-br,by-gap*0.55f-br,bx-gap+br,by-gap*0.55f+br);
        yRect.set(bx-gap*2-br,by-br,bx-gap*2+br,by+br);

        drawBtn(c,aRect,"A",br); drawBtn(c,bRect,"B",br);
        drawBtn(c,xRect,"X",br); drawBtn(c,yRect,"Y",br);

        float cw=w/2f, ch=h-26*density, sw=38*density, sh=14*density;
        selectRect.set(cw-sw-5*density,ch-sh,cw-5*density,ch+sh);
        startRect.set(cw+5*density,ch-sh,cw+sw+5*density,ch+sh);
        drawSmall(c,selectRect,"SELECT"); drawSmall(c,startRect,"START");
    }

    private void drawBtn(Canvas c, RectF r, String t, float br){
        p.setStyle(Paint.Style.FILL); p.setColor(0xBB18232F); c.drawOval(r,p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(1.5f); p.setColor(0x55FFFFFF); c.drawOval(r,p);
        p.setStyle(Paint.Style.FILL); p.setColor(Color.WHITE); p.setTextAlign(Paint.Align.CENTER);
        p.setTextSize(br*0.72f); p.setTypeface(Typeface.DEFAULT_BOLD);
        c.drawText(t,r.centerX(),r.centerY()-((p.ascent()+p.descent())/2),p);
    }
    private void drawSmall(Canvas c, RectF r, String t){
        p.setStyle(Paint.Style.FILL); p.setColor(0xAA16212C); c.drawRoundRect(r,12,12,p);
        p.setColor(Color.WHITE); p.setTextAlign(Paint.Align.CENTER); p.setTextSize(r.height()*0.38f);
        c.drawText(t,r.centerX(),r.centerY()-((p.ascent()+p.descent())/2),p);
    }

    @Override public boolean onTouchEvent(MotionEvent e){
        float x=e.getX(), y=e.getY();
        switch(e.getActionMasked()){
            case MotionEvent.ACTION_DOWN:
                if(distance(x,y,joyCx,joyCy)<=joyR*1.2f){ joyActive=true; updateJoy(x,y); return true; }
                activeButton=hitButton(x,y); if(activeButton!=0){ press(activeButton,true); return true; }
                break;
            case MotionEvent.ACTION_MOVE:
                if(joyActive){ updateJoy(x,y); return true; }
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if(joyActive){ joyActive=false; releaseDirs(); invalidate(); return true; }
                if(activeButton!=0){ press(activeButton,false); activeButton=0; return true; }
        }
        return true;
    }

    private void updateJoy(float x,float y){
        float dx=x-joyCx, dy=y-joyCy, d=(float)Math.hypot(dx,dy), max=joyR*0.55f;
        if(d>max){ dx=dx/d*max; dy=dy/d*max; }
        knobX=joyCx+dx; knobY=joyCy+dy;
        float threshold=joyR*0.18f;
        setDir(KeyEvent.KEYCODE_DPAD_LEFT, dx < -threshold, 0);
        setDir(KeyEvent.KEYCODE_DPAD_RIGHT, dx > threshold, 1);
        setDir(KeyEvent.KEYCODE_DPAD_UP, dy < -threshold, 2);
        setDir(KeyEvent.KEYCODE_DPAD_DOWN, dy > threshold, 3);
        invalidate();
    }
    private void setDir(int key, boolean value, int which){
        boolean old = which==0?left:which==1?right:which==2?up:down;
        if(old==value) return;
        if(value && sink!=null) sink.keyDown(key); else if(sink!=null) sink.keyUp(key);
        if(which==0) left=value; else if(which==1) right=value; else if(which==2) up=value; else down=value;
    }
    private void releaseDirs(){
        if(sink!=null){ if(left)sink.keyUp(KeyEvent.KEYCODE_DPAD_LEFT); if(right)sink.keyUp(KeyEvent.KEYCODE_DPAD_RIGHT);
            if(up)sink.keyUp(KeyEvent.KEYCODE_DPAD_UP); if(down)sink.keyUp(KeyEvent.KEYCODE_DPAD_DOWN); }
        left=right=up=down=false; knobX=joyCx; knobY=joyCy;
    }
    private int hitButton(float x,float y){
        if(aRect.contains(x,y))return 1; if(bRect.contains(x,y))return 2; if(xRect.contains(x,y))return 3;
        if(yRect.contains(x,y))return 4; if(startRect.contains(x,y))return 5; if(selectRect.contains(x,y))return 6; return 0;
    }
    private void press(int btn, boolean down){
        if(sink==null)return;
        int key;
        switch(btn){
            case 1: key=KeyEvent.KEYCODE_X; break;
            case 2: key=KeyEvent.KEYCODE_Z; break;
            case 3: key=KeyEvent.KEYCODE_S; break;
            case 4: key=KeyEvent.KEYCODE_A; break;
            case 5: key=KeyEvent.KEYCODE_ENTER; break;
            default:key=KeyEvent.KEYCODE_SHIFT_LEFT;
        }
        if(down)sink.keyDown(key); else sink.keyUp(key);
    }
    private float distance(float x1,float y1,float x2,float y2){ return (float)Math.hypot(x1-x2,y1-y2); }
}
