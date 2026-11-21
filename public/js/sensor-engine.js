/**
 * MotoLean Sensor Engine
 * Handles 3D IMU Sensor Fusion, Dynamic Calibration, Vibration Filtering,
 * and precise Lean Angle Calculation (+ve Right, -ve Left).
 */

class SensorEngine {
    constructor() {
        this.calibrated = false;
        this.mountMode = localStorage.getItem('motolean_mount_mode') || 'portrait';
        this.damping = localStorage.getItem('motolean_damping') || 'med'; // 'low', 'med', 'high', 'off'
        
        // Calibration vectors in device coordinates
        this.V0 = [0, 0, 1]; // Calibrated vertical upright axis
        this.F0 = [0, 1, 0]; // Calibrated bike forward travel axis
        this.R0 = [1, 0, 0]; // Calibrated bike rightward lateral axis
        
        // State
        this.rawLeanAngle = 0;
        this.filteredLeanAngle = 0;
        this.rawBeta = 0;
        this.rawGamma = 0;
        this.rawAlpha = 0;
        this.updateCount = 0;
        this.hz = 0;
        this.lastHzCheck = performance.now();
        this.isSimulated = false;
        this.simulatedAngle = 0;
        this.sensorSource = 'none'; // 'orientation', 'motion', 'simulated'
        
        // Listeners
        this.callbacks = [];
        
        // Load saved calibration if present
        this.loadCalibration();
        
        // Alpha values for low-pass filter (higher = more responsive, lower = smoother)
        this.dampingAlphas = {
            'off': 1.0,
            'low': 0.45,
            'med': 0.22,
            'high': 0.10
        };
    }
    
    // Convert degrees to radians
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    
    // Convert radians to degrees
    rad2deg(rad) {
        return rad * (180 / Math.PI);
    }
    
    // Dot product of two 3D vectors
    dot(a, b) {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }
    
    // Cross product of two 3D vectors
    cross(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    }
    
    // Normalize a 3D vector
    normalize(v) {
        const len = Math.hypot(v[0], v[1], v[2]);
        if (len < 1e-6) return [0, 0, 1];
        return [v[0] / len, v[1] / len, v[2] / len];
    }
    
    /**
     * Compute device unit Up vector (pointing opposite gravity in device coordinates)
     * From standard W3C DeviceOrientation angles beta (pitch) and gamma (roll)
     */
    getDeviceUpVector(beta, gamma) {
        const b = this.deg2rad(beta);
        const g = this.deg2rad(gamma);
        return [
            -Math.cos(b) * Math.sin(g),
            Math.sin(b),
            Math.cos(b) * Math.cos(g)
        ];
    }
    
    /**
     * CALIBRATE ZERO (Single Lateral Axis):
     * Records current lateral tilt angle as the 0° reference.
     */
    calibrate() {
        this.calibOffset = this.filteredLeanAngle;
        this.calibrated = true;
        this.rawLeanAngle = 0;
        this.filteredLeanAngle = 0;
        this.saveCalibration();
        this.notify();
        return { success: true, timestamp: Date.now() };
    }

    resetCalibration() {
        this.calibrated = false;
        this.calibOffset = 0;
        localStorage.removeItem('motolean_calib_data');
        this.notify();
    }

    saveCalibration() {
        try {
            localStorage.setItem('motolean_calib_data', JSON.stringify({
                calibrated: this.calibrated,
                calibOffset: this.calibOffset,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    loadCalibration() {
        try {
            const raw = localStorage.getItem('motolean_calib_data');
            if (raw) {
                const data = JSON.parse(raw);
                this.calibrated = data.calibrated;
                this.calibOffset = data.calibOffset || 0;
            }
        } catch (e) {}
    }

    /**
     * Compute instantaneous lean angle using ONLY ONE lateral tilt axis.
     */
    computeLeanAngle(beta, gamma) {
        // Single axis: gamma represents lateral roll
        // Inverted so leaning right is positive (+ve) and leaning left is negative (-ve)
        let rawRoll = -(gamma || 0);
        if (this.mountMode === 'landscape_left') {
            rawRoll = (beta || 0);
        } else if (this.mountMode === 'landscape_right') {
            rawRoll = -(beta || 0);
        }
        return this.calibrated ? (rawRoll - this.calibOffset) : rawRoll;
    }
    
    // Process a new sensor sample
    processSample(beta, gamma, alpha = 0, source = 'orientation') {
        this.sensorSource = source;
        this.rawBeta = beta;
        this.rawGamma = gamma;
        this.rawAlpha = alpha;
        
        this.updateCount++;
        const now = performance.now();
        if (now - this.lastHzCheck >= 1000) {
            this.hz = Math.round((this.updateCount * 1000) / (now - this.lastHzCheck));
            this.updateCount = 0;
            this.lastHzCheck = now;
        }
        
        const rawAngle = this.computeLeanAngle(beta, gamma);
        this.rawLeanAngle = rawAngle;
        
        // Apply low-pass exponential moving average filter for vibration damping
        const alphaFilter = this.dampingAlphas[this.damping] || 0.22;
        if (Math.abs(this.filteredLeanAngle) < 0.001 && Math.abs(rawAngle) < 0.001) {
            this.filteredLeanAngle = 0;
        } else {
            this.filteredLeanAngle = (alphaFilter * rawAngle) + ((1 - alphaFilter) * this.filteredLeanAngle);
        }
        
        this.notify();
    }
    
    // Process raw accelerometer if orientation is unavailable
    processAccelerometer(ax, ay, az) {
        // Apparent gravity in device frame is opposite to acceleration
        const V = this.normalize([-ax, -ay, -az]);
        this.sensorSource = 'motion';
        
        this.updateCount++;
        const now = performance.now();
        if (now - this.lastHzCheck >= 1000) {
            this.hz = Math.round((this.updateCount * 1000) / (now - this.lastHzCheck));
            this.updateCount = 0;
            this.lastHzCheck = now;
        }
        
        let rawAngle = 0;
        if (!this.calibrated) {
            // Rough estimate: lateral angle
            rawAngle = this.rad2deg(Math.atan2(ax, Math.hypot(ay, az)));
        } else {
            const V_lat = this.dot(V, this.R0);
            const V_vert = this.dot(V, this.V0);
            rawAngle = -this.rad2deg(Math.atan2(V_lat, V_vert));
        }
        
        this.rawLeanAngle = rawAngle;
        const alphaFilter = this.dampingAlphas[this.damping] || 0.22;
        this.filteredLeanAngle = (alphaFilter * rawAngle) + ((1 - alphaFilter) * this.filteredLeanAngle);
        this.notify();
    }
    
    // Simulation mode for testing on desktop or in-hand
    setSimulatedAngle(angle) {
        this.isSimulated = true;
        this.sensorSource = 'simulated';
        this.simulatedAngle = angle;
        this.rawLeanAngle = angle;
        
        const alphaFilter = this.dampingAlphas[this.damping] || 0.35;
        this.filteredLeanAngle = (alphaFilter * angle) + ((1 - alphaFilter) * this.filteredLeanAngle);
        this.hz = 60;
        this.notify();
    }
    
    onUpdate(callback) {
        this.callbacks.push(callback);
    }
    
    notify() {
        const payload = {
            leanAngle: this.filteredLeanAngle,
            rawLeanAngle: this.rawLeanAngle,
            isRight: this.filteredLeanAngle > 0.1,
            isLeft: this.filteredLeanAngle < -0.1,
            isUpright: Math.abs(this.filteredLeanAngle) <= 0.1,
            calibrated: this.calibrated,
            mountMode: this.mountMode,
            damping: this.damping,
            hz: this.hz,
            sensorSource: this.sensorSource,
            rawBeta: this.rawBeta,
            rawGamma: this.rawGamma
        };
        for (let i = 0; i < this.callbacks.length; i++) {
            this.callbacks[i](payload);
        }
    }
}

// Global sensor instance
window.sensorEngine = new SensorEngine();
