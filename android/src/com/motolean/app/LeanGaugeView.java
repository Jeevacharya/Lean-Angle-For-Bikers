package com.motolean.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

public class LeanGaugeView extends View {

    private float currentLean = 0f;
    private float maxLeft = 0f;
    private float maxRight = 0f;
    private boolean isLightMode = false;

    private Paint trackPaint;
    private Paint arcPaint;
    private Paint tickPaint;
    private Paint labelPaint;
    private Paint horizonPaint;
    private Paint bikePaint;
    private Paint peakLeftPaint;
    private Paint peakRightPaint;

    private RectF arcBounds = new RectF();
    private Path arcPath = new Path();

    public LeanGaugeView(Context context) {
        super(context);
        init();
    }

    public LeanGaugeView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public LeanGaugeView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setColor(Color.parseColor("#162030"));
        trackPaint.setStrokeCap(Paint.Cap.ROUND);

        arcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        arcPaint.setStyle(Paint.Style.STROKE);
        arcPaint.setColor(Color.parseColor("#00F0FF"));
        arcPaint.setStrokeCap(Paint.Cap.ROUND);

        tickPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        tickPaint.setStyle(Paint.Style.STROKE);
        tickPaint.setColor(Color.parseColor("#4A5A72"));
        tickPaint.setStrokeCap(Paint.Cap.ROUND);

        labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setTextSize(26f);
        labelPaint.setColor(Color.parseColor("#8DA2C0"));

        horizonPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        horizonPaint.setStyle(Paint.Style.STROKE);
        horizonPaint.setColor(Color.parseColor("#2A3A50"));
        horizonPaint.setStrokeWidth(2.5f);

        bikePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bikePaint.setColor(Color.parseColor("#00F0FF"));
        bikePaint.setStyle(Paint.Style.FILL_AND_STROKE);

        peakLeftPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        peakLeftPaint.setColor(Color.parseColor("#FF2A5F"));
        peakLeftPaint.setStyle(Paint.Style.STROKE);
        peakLeftPaint.setStrokeCap(Paint.Cap.ROUND);

        peakRightPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        peakRightPaint.setColor(Color.parseColor("#00F0FF"));
        peakRightPaint.setStyle(Paint.Style.STROKE);
        peakRightPaint.setStrokeCap(Paint.Cap.ROUND);
    }

    public void setLightMode(boolean isLight) {
        this.isLightMode = isLight;
        if (isLight) {
            trackPaint.setColor(Color.parseColor("#CBD5E1"));
            horizonPaint.setColor(Color.parseColor("#94A3B8"));
            labelPaint.setColor(Color.parseColor("#475569"));
        } else {
            trackPaint.setColor(Color.parseColor("#162030"));
            horizonPaint.setColor(Color.parseColor("#2A3A50"));
            labelPaint.setColor(Color.parseColor("#8DA2C0"));
        }
        invalidate();
    }

    public void setLeanAngle(float angle, float maxL, float maxR) {
        this.currentLean = angle;
        this.maxLeft = maxL;
        this.maxRight = maxR;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        float w = getWidth();
        float h = getHeight();
        if (w <= 0 || h <= 0) return;

        float cx = w / 2f;
        // Place center lower down so upper arc (-60 to +60) fits comfortably
        float cy = h * 0.78f;
        float radius = Math.min(w * 0.42f, h * 0.68f);

        trackPaint.setStrokeWidth(radius * 0.08f);
        arcPaint.setStrokeWidth(radius * 0.09f);
        tickPaint.setStrokeWidth(radius * 0.02f);
        peakLeftPaint.setStrokeWidth(radius * 0.035f);
        peakRightPaint.setStrokeWidth(radius * 0.035f);

        arcBounds.set(cx - radius, cy - radius, cx + radius, cy + radius);

        // 1. Draw Background Track Arc from -60 to +60 degrees
        // 0 degrees is straight up: 270 in standard android degrees
        // Start angle for -60 is 210, sweep is 120
        canvas.drawArc(arcBounds, 210, 120, false, trackPaint);

        // 2. Draw Dynamic Active Lean Arc
        float clamped = Math.max(-60f, Math.min(60f, currentLean));
        if (Math.abs(clamped) > 0.3f) {
            if (clamped > 0) {
                // Leaning Right (+ve)
                arcPaint.setColor(clamped > 42 ? Color.parseColor("#FFAA00") : Color.parseColor("#00F0FF"));
                // Sweep from 270 clockwise
                canvas.drawArc(arcBounds, 270, clamped, false, arcPaint);
            } else {
                // Leaning Left (-ve)
                arcPaint.setColor(clamped < -42 ? Color.parseColor("#FFAA00") : Color.parseColor("#FF2A5F"));
                // Sweep from 270 counter-clockwise
                canvas.drawArc(arcBounds, 270, clamped, false, arcPaint);
            }
        }

        // 3. Draw Scale Ticks and Degree Labels
        int[] ticks = {-60, -45, -30, -15, 0, 15, 30, 45, 60};
        for (int deg : ticks) {
            float rad = (float) Math.toRadians(270 + deg);
            float inner = (deg % 30 == 0) ? radius * 0.88f : radius * 0.93f;
            float outer = radius * 1.05f;

            float x1 = cx + (float) Math.cos(rad) * inner;
            float y1 = cy + (float) Math.sin(rad) * inner;
            float x2 = cx + (float) Math.cos(rad) * outer;
            float y2 = cy + (float) Math.sin(rad) * outer;

            if (deg == 0) {
                tickPaint.setColor(Color.parseColor("#00FF88"));
                tickPaint.setStrokeWidth(radius * 0.035f);
            } else if (deg > 0) {
                tickPaint.setColor(Color.parseColor("#00F0FF"));
                tickPaint.setStrokeWidth(radius * 0.022f);
            } else {
                tickPaint.setColor(Color.parseColor("#FF2A5F"));
                tickPaint.setStrokeWidth(radius * 0.022f);
            }
            canvas.drawLine(x1, y1, x2, y2, tickPaint);

            // Labels for -45, 0, +45
            if (deg == 0 || Math.abs(deg) == 45) {
                float labelDist = radius * 1.18f;
                float lx = cx + (float) Math.cos(rad) * labelDist;
                float ly = cy + (float) Math.sin(rad) * labelDist + 8f;
                String text = deg == 0 ? "0°" : (deg > 0 ? "+" + deg + "°" : deg + "°");
                labelPaint.setColor(deg == 0 ? Color.parseColor("#00FF88") : (deg > 0 ? Color.parseColor("#00F0FF") : Color.parseColor("#FF2A5F")));
                canvas.drawText(text, lx, ly, labelPaint);
            }
        }

        // 4. Draw Max Peak Hold Ticks
        if (maxRight > 1f) {
            float radR = (float) Math.toRadians(270 + Math.min(60f, maxRight));
            float px1 = cx + (float) Math.cos(radR) * (radius * 0.86f);
            float py1 = cy + (float) Math.sin(radR) * (radius * 0.86f);
            float px2 = cx + (float) Math.cos(radR) * (radius * 1.07f);
            float py2 = cy + (float) Math.sin(radR) * (radius * 1.07f);
            canvas.drawLine(px1, py1, px2, py2, peakRightPaint);
        }
        if (maxLeft < -1f) {
            float radL = (float) Math.toRadians(270 + Math.max(-60f, maxLeft));
            float px1 = cx + (float) Math.cos(radL) * (radius * 0.86f);
            float py1 = cy + (float) Math.sin(radL) * (radius * 0.86f);
            float px2 = cx + (float) Math.cos(radL) * (radius * 1.07f);
            float py2 = cy + (float) Math.sin(radL) * (radius * 1.07f);
            canvas.drawLine(px1, py1, px2, py2, peakLeftPaint);
        }

        // 5. Draw Tilting Motorcycle Silhouette Group
        canvas.save();
        canvas.translate(cx, cy);
        // Rotate by current lean angle
        canvas.rotate(currentLean);

        // Horizon line
        canvas.drawLine(-radius * 0.7f, 0, radius * 0.7f, 0, horizonPaint);

        // Bike scale factor
        float bs = radius * 0.007f;

        // Front tire contact patch
        bikePaint.setColor(Color.parseColor("#1B2434"));
        bikePaint.setStrokeWidth(2f * bs);
        canvas.drawOval(-10f * bs, -15f * bs, 10f * bs, 10f * bs, bikePaint);

        // Front forks
        bikePaint.setColor(Color.parseColor("#6B829E"));
        bikePaint.setStrokeWidth(4.5f * bs);
        canvas.drawLine(-14f * bs, -15f * bs, -18f * bs, -50f * bs, bikePaint);
        canvas.drawLine(14f * bs, -15f * bs, 18f * bs, -50f * bs, bikePaint);

        // Triple clamp & Handlebars
        bikePaint.setColor(Color.parseColor("#A0B5CE"));
        bikePaint.setStrokeWidth(5.5f * bs);
        canvas.drawLine(-38f * bs, -50f * bs, 38f * bs, -50f * bs, bikePaint);

        // Bar ends
        bikePaint.setColor(Color.parseColor("#00F0FF"));
        canvas.drawCircle(-38f * bs, -50f * bs, 3.5f * bs, bikePaint);
        canvas.drawCircle(38f * bs, -50f * bs, 3.5f * bs, bikePaint);

        // Fairing & Headlight
        bikePaint.setColor(Color.parseColor("#141C2B"));
        bikePaint.setStrokeWidth(2.5f * bs);
        Path fairing = new Path();
        fairing.moveTo(-22f * bs, -50f * bs);
        fairing.lineTo(-14f * bs, -72f * bs);
        fairing.lineTo(0, -80f * bs);
        fairing.lineTo(14f * bs, -72f * bs);
        fairing.lineTo(22f * bs, -50f * bs);
        fairing.close();
        canvas.drawPath(fairing, bikePaint);

        // Headlight glow
        bikePaint.setColor(Color.parseColor("#00F0FF"));
        Path headlight = new Path();
        headlight.moveTo(0, -76f * bs);
        headlight.lineTo(-8f * bs, -60f * bs);
        headlight.lineTo(8f * bs, -60f * bs);
        headlight.close();
        canvas.drawPath(headlight, bikePaint);

        // Rider helmet
        bikePaint.setColor(Color.parseColor("#1B263B"));
        canvas.drawCircle(0, -100f * bs, 10f * bs, bikePaint);
        bikePaint.setColor(Color.parseColor("#FFAA00"));
        bikePaint.setStrokeWidth(3f * bs);
        canvas.drawLine(-7f * bs, -100f * bs, 7f * bs, -100f * bs, bikePaint);

        // Apex top pointer
        bikePaint.setColor(Color.parseColor("#00F0FF"));
        Path pointer = new Path();
        pointer.moveTo(0, -radius * 0.96f);
        pointer.lineTo(-5f * bs, -radius * 0.88f);
        pointer.lineTo(5f * bs, -radius * 0.88f);
        pointer.close();
        canvas.drawPath(pointer, bikePaint);

        canvas.restore();
    }
}
