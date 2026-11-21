package com.motolean.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Surface;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.util.Locale;

public class MainActivity extends Activity implements SensorEventListener {

    private static final float GRAVITY_EARTH = 9.80665f;

    private SensorManager sensorManager;
    private Sensor accelSensor;
    private Vibrator vibrator;

    private LeanGaugeView leanGaugeView;
    private TextView angleNumberText;
    private TextView signGlyph;
    private TextView directionBadge;
    private TextView lateralGText;
    private TextView maxLeftText;
    private TextView maxRightText;
    private TextView sensorStatusText;

    private Button btnCalibrate;
    private Button btnCalibrateLeft;
    private Button btnCalibrateRight;
    private Button btnResetMax;
    private Button btnResetMaxLeft;

    // Calibration & Single-Axis State
    private boolean isCalibrated = false;
    private float calibratedZeroOffset = 0f;

    private float rawLateralAcc = 0f;
    private float rawAngle = 0f;
    private float filteredAngle = 0f;
    private int currentLeanAngleInt = 0;

    // Peak holds (integers without decimal points)
    private int maxLeftInt = 0;   // Negative integer (e.g. -42)
    private int maxRightInt = 0;  // Positive integer (e.g. +45)

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake while riding
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        prefs = getSharedPreferences("motolean_prefs", MODE_PRIVATE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);

        // Load saved calibration offset
        isCalibrated = prefs.getBoolean("is_calibrated", false);
        calibratedZeroOffset = prefs.getFloat("calibrated_zero_offset", 0f);

        // Initialize view layout
        initViewBinding();

        // 1-Axis Accelerometer sensor
        if (sensorManager != null) {
            accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        }
    }

    private void initViewBinding() {
        setContentView(R.layout.activity_main);

        leanGaugeView = findViewById(R.id.leanGaugeView);
        angleNumberText = findViewById(R.id.angleNumberText);
        signGlyph = findViewById(R.id.signGlyph);
        directionBadge = findViewById(R.id.directionBadge);
        lateralGText = findViewById(R.id.lateralGText);
        maxLeftText = findViewById(R.id.maxLeftText);
        maxRightText = findViewById(R.id.maxRightText);
        sensorStatusText = findViewById(R.id.sensorStatusText);

        btnCalibrate = findViewById(R.id.btnCalibrate);
        btnCalibrateLeft = findViewById(R.id.btnCalibrateLeft);
        btnCalibrateRight = findViewById(R.id.btnCalibrateRight);
        btnResetMax = findViewById(R.id.btnResetMax);
        btnResetMaxLeft = findViewById(R.id.btnResetMaxLeft);

        View.OnClickListener calibListener = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                performCalibration();
            }
        };

        if (btnCalibrate != null) btnCalibrate.setOnClickListener(calibListener);
        if (btnCalibrateLeft != null) btnCalibrateLeft.setOnClickListener(calibListener);
        if (btnCalibrateRight != null) btnCalibrateRight.setOnClickListener(calibListener);

        View.OnClickListener resetMaxListener = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                maxLeftInt = 0;
                maxRightInt = 0;
                if (maxLeftText != null) maxLeftText.setText("0°");
                if (maxRightText != null) maxRightText.setText("0°");
                if (leanGaugeView != null) leanGaugeView.setLeanAngle(currentLeanAngleInt, 0, 0);
                triggerVibrate(30);
            }
        };

        if (btnResetMax != null) btnResetMax.setOnClickListener(resetMaxListener);
        if (btnResetMaxLeft != null) btnResetMaxLeft.setOnClickListener(resetMaxListener);

        updateUI();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Automatically rebind views when switching between portrait and landscape
        initViewBinding();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (sensorManager != null && accelSensor != null) {
            sensorManager.registerListener(this, accelSensor, SensorManager.SENSOR_DELAY_GAME);
            if (sensorStatusText != null) {
                sensorStatusText.setText("1-AXIS LATERAL SENSOR");
                sensorStatusText.setTextColor(Color.parseColor("#00FF88"));
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    private void triggerVibrate(int ms) {
        if (vibrator != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }
    }

    /**
     * CALIBRATE ZERO:
     * Records the 1-axis lateral angle at this moment as the 0° reference.
     */
    private void performCalibration() {
        triggerVibrate(60);

        // Set zero offset to the current filtered raw angle
        calibratedZeroOffset = filteredAngle;
        isCalibrated = true;
        currentLeanAngleInt = 0;

        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean("is_calibrated", true);
        editor.putFloat("calibrated_zero_offset", calibratedZeroOffset);
        editor.apply();

        updateUI();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        float ax = event.values[0];
        float ay = event.values[1];

        // Read single lateral axis based on current screen orientation
        // Inverted so leaning right shows +ve and leaning left shows -ve
        int rotation = getWindowManager().getDefaultDisplay().getRotation();
        float lateralAcc;

        switch (rotation) {
            case Surface.ROTATION_0: // Portrait
                // Negated so leaning right yields positive angle (+ve)
                lateralAcc = -ax;
                break;
            case Surface.ROTATION_90: // Landscape (Top facing Left)
                lateralAcc = ay;
                break;
            case Surface.ROTATION_180: // Reverse Portrait
                lateralAcc = ax;
                break;
            case Surface.ROTATION_270: // Landscape (Top facing Right)
                lateralAcc = -ay;
                break;
            default:
                lateralAcc = -ax;
                break;
        }

        rawLateralAcc = lateralAcc;

        // Pure 1-Axis Lateral Tilt Angle using arcsin of lateral G component:
        // When tilted right: lateralAcc > 0 -> angle > 0 (Positive)
        // When tilted left:  lateralAcc < 0 -> angle < 0 (Negative)
        float clampedG = Math.max(-1.0f, Math.min(1.0f, lateralAcc / GRAVITY_EARTH));
        rawAngle = (float) Math.toDegrees(Math.asin(clampedG));

        // Low-pass filter to dampen engine vibration and pavement bumps
        filteredAngle = 0.22f * rawAngle + 0.78f * filteredAngle;

        // Compute lean angle relative to calibrated zero
        float calibratedAngle = isCalibrated ? (filteredAngle - calibratedZeroOffset) : filteredAngle;

        // Convert to whole integer without any decimal point
        currentLeanAngleInt = Math.round(calibratedAngle);

        updateUI();
    }

    private void updateUI() {
        if (angleNumberText == null) return;

        int absAngle = Math.abs(currentLeanAngleInt);

        // Sign convention (Whole integers without decimal point!):
        // Right side: positive (+ve) e.g. +35°
        // Left side: negative (-ve) e.g. -28°
        // Upright: 0°
        if (absAngle == 0) {
            signGlyph.setText("");
            signGlyph.setTextColor(Color.parseColor("#00FF88"));
            angleNumberText.setText("0");
            directionBadge.setText(R.string.upright);
            directionBadge.setTextColor(Color.parseColor("#00FF88"));
        } else if (currentLeanAngleInt > 0) {
            // RIGHT LEAN (+ve)
            signGlyph.setText("+");
            signGlyph.setTextColor(Color.parseColor("#00F0FF"));
            angleNumberText.setText(String.valueOf(absAngle));
            directionBadge.setText(String.format(Locale.US, "RIGHT LEAN (+%d°)", absAngle));
            directionBadge.setTextColor(Color.parseColor("#00F0FF"));
        } else {
            // LEFT LEAN (-ve)
            signGlyph.setText("-");
            signGlyph.setTextColor(Color.parseColor("#FF2A5F"));
            angleNumberText.setText(String.valueOf(absAngle));
            directionBadge.setText(String.format(Locale.US, "LEFT LEAN (-%d°)", absAngle));
            directionBadge.setTextColor(Color.parseColor("#FF2A5F"));
        }

        // Peak Hold (No decimal points)
        if (currentLeanAngleInt > 0 && currentLeanAngleInt > maxRightInt) {
            maxRightInt = currentLeanAngleInt;
            if (maxRightText != null) {
                maxRightText.setText(String.format(Locale.US, "+%d°", maxRightInt));
            }
        } else if (currentLeanAngleInt < 0 && currentLeanAngleInt < maxLeftInt) {
            maxLeftInt = currentLeanAngleInt; // Negative integer
            if (maxLeftText != null) {
                maxLeftText.setText(String.format(Locale.US, "%d°", maxLeftInt));
            }
        }

        // Estimated lateral G
        if (lateralGText != null && lateralGText.getVisibility() == View.VISIBLE) {
            float latG = (float) Math.tan(Math.toRadians(absAngle));
            lateralGText.setText(String.format(Locale.US, "EST. LATERAL G: %.2f G", latG));
        }

        // Update custom canvas gauge
        if (leanGaugeView != null) {
            leanGaugeView.setLeanAngle(currentLeanAngleInt, maxLeftInt, maxRightInt);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
