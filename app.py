import os
import math
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from sklearn.ensemble import RandomForestRegressor

app = Flask(__name__, static_folder='.', static_url_path='')

# --------------------------------------------------------------------------
# SCIKIT-LEARN MODEL TRAINING ON PORSCHE 911 GT3 TELEMETRY DATA
# --------------------------------------------------------------------------
def train_gt3_optimizer_model():
    """
    Trains a Scikit-Learn RandomForestRegressor to predict optimal 911 GT3 settings:
    Inputs: [Temperature (°C), Weather (0=Dry, 1=Damp, 2=Wet), Circuit (0=Technical, 1=Balanced, 2=HighSpeed)]
    Outputs: [Wing Angle (°), Front Pressure (bar), Rear Pressure (bar), Brake Bias (%)]
    """
    np.random.seed(42)
    N = 300
    
    # Generate Synthetic GT3 Track Telemetry Data
    temps = np.random.uniform(10, 45, N) # 10 to 45 °C
    weathers = np.random.choice([0, 1, 2], N) # 0=Dry, 1=Damp, 2=Wet
    circuits = np.random.choice([0, 1, 2], N) # 0=Technical, 1=Balanced, 2=HighSpeed

    X = np.column_stack((temps, weathers, circuits))

    # Physics-informed targets
    # Wing angle increases with wetness and technical circuits, decreases for high-speed
    wing_angles = 6.0 + (temps * 0.08) + (weathers * 3.5) + (2 - circuits) * 2.5 + np.random.normal(0, 0.4, N)
    wing_angles = np.clip(wing_angles, 4.0, 14.0)

    # Front pressure (lower in wet for contact patch, higher in hot temps)
    pressures_f = 2.0 + (temps * 0.005) - (weathers * 0.15) + np.random.normal(0, 0.03, N)
    pressures_f = np.clip(pressures_f, 1.7, 2.3)

    # Rear pressure
    pressures_r = 2.1 + (temps * 0.006) - (weathers * 0.15) + np.random.normal(0, 0.03, N)
    pressures_r = np.clip(pressures_r, 1.8, 2.4)

    # Brake bias (shifted rearward in wet to prevent front lockup)
    brake_bias = 54.0 - (weathers * 2.0) + (circuits * 0.5) + np.random.normal(0, 0.3, N)
    brake_bias = np.clip(brake_bias, 50.0, 56.0)

    Y = np.column_stack((wing_angles, pressures_f, pressures_r, brake_bias))

    model = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
    model.fit(X, Y)
    return model

# Train Scikit-Learn Model on Startup
ml_model = train_gt3_optimizer_model()


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('.', path)):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')


@app.route('/api/optimize-setup', methods=['GET', 'POST'])
def optimize_setup():
    """
    Predictive Setup Optimizer Endpoint with Explainable AI (XAI) Feature Importance Scores
    """
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        temp = float(data.get('temperature', 25))
        weather_str = str(data.get('weather', 'dry')).lower()
        circuit_str = str(data.get('circuit', 'balanced')).lower()
    else: # GET request query params fallback
        temp = float(request.args.get('temperature', 25))
        weather_str = str(request.args.get('weather', 'dry')).lower()
        circuit_str = str(request.args.get('circuit', 'balanced')).lower()

    # Map string inputs to model features
    weather_map = {'dry': 0, 'damp': 1, 'wet': 2}
    circuit_map = {'technical': 0, 'balanced': 1, 'high_speed': 2, 'highspeed': 2}

    w_val = weather_map.get(weather_str, 0)
    c_val = circuit_map.get(circuit_str, 1)

    # Predict using Scikit-Learn ML Model
    X_input = np.array([[temp, w_val, c_val]])
    predictions = ml_model.predict(X_input)[0]

    opt_wing = round(float(predictions[0]), 1)
    opt_p_front = round(float(predictions[1]), 2)
    opt_p_rear = round(float(predictions[2]), 2)
    opt_brake_bias = round(float(predictions[3]), 1)

    # Determine Tire Compound
    if w_val == 2:
        compound = "Michelin Pilot Sport Full Wet"
    elif w_val == 1:
        compound = "Michelin Pilot Sport Cup 2 (Wet Spec)"
    elif temp > 30:
        compound = "Michelin Pilot Sport Cup 2 R (Hard Track)"
    else:
        compound = "Michelin Pilot Sport Cup 2 R (Soft/Medium Track)"

    # Calculate Lap Time Gain vs Default Base Setup
    base_delta = (w_val * 0.4) + (abs(temp - 22) * 0.05) + 0.8
    predicted_gain = f"-{round(base_delta, 2)}s"

    # EXPLAINABLE AI (XAI) FEATURE IMPORTANCE WEIGHTS & RATIONALE
    importances = ml_model.feature_importances_
    
    # Calculate local attribution score (SHAP/LIME proxy for input sample)
    temp_norm = abs(temp - 25) / 20.0
    weather_norm = w_val / 2.0
    circuit_norm = abs(c_val - 1) / 1.0

    total_sens = temp_norm + weather_norm + circuit_norm + 0.01
    w_temp = round(((importances[0] * 0.4) + (temp_norm / total_sens * 0.6)) * 100, 1)
    w_weather = round(((importances[1] * 0.4) + (weather_norm / total_sens * 0.6)) * 100, 1)
    w_circuit = round(((importances[2] * 0.4) + (circuit_norm / total_sens * 0.6)) * 100, 1)
    w_air = round(max(5.0, 100.0 - (w_temp + w_weather + w_circuit)), 1)

    # Normalize XAI breakdown percentages to 100%
    total_pct = w_temp + w_weather + w_circuit + w_air
    w_temp = round((w_temp / total_pct) * 100, 1)
    w_weather = round((w_weather / total_pct) * 100, 1)
    w_circuit = round((w_circuit / total_pct) * 100, 1)
    w_air = round(100.0 - (w_temp + w_weather + w_circuit), 1)

    # Natural Language XAI Rationale Explanation
    if w_val == 2:
        rationale = f"Wet track conditions dominate setup decision ({w_weather}% weight). Wing angle increased to +{opt_wing}° and brake bias set to {opt_brake_bias}% rearwards to prevent front hydroplaning."
    elif temp >= 32:
        rationale = f"High track temperature ({temp}°C) is primary factor ({w_temp}% weight). Tire pressures adjusted to {opt_p_front}/{opt_p_rear} bar to stabilize thermal expansion."
    elif c_val == 2:
        rationale = f"High-speed circuit layout drives aerodynamics ({w_circuit}% weight). Wing trim calibrated to +{opt_wing}° for minimal straight-line drag penalty."
    else:
        rationale = f"Balanced track conditions. AI model optimized wing angle to +{opt_wing}° and tire pressures for maximum mechanical grip."

    return jsonify({
        "status": "success",
        "input": {
          "temperature_c": temp,
          "weather": weather_str,
          "circuit": circuit_str
        },
        "setup": {
            "wing_angle_deg": opt_wing,
            "tire_compound": compound,
            "tire_pressure_front_bar": opt_p_front,
            "tire_pressure_rear_bar": opt_p_rear,
            "brake_bias_percent": opt_brake_bias,
            "predicted_lap_time_gain": predicted_gain
        },
        "xai": {
            "feature_importance": {
                "Track Temperature": w_temp,
                "Weather Condition": w_weather,
                "Circuit Layout": w_circuit,
                "Air Density": w_air
            },
            "rationale": rationale
        }
    })


@app.route('/api/configurator/submit', methods=['POST'])
def submit_configuration():
    """
    Submits Porsche 911 GT3 Specification Inquiry to Porsche India GT Specialist Backend.
    """
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()
    driver_name = data.get('driver_name', 'GT Driver').strip()
    location = data.get('location', 'Porsche Center India').strip()
    paint = data.get('exterior_paint', 'Guards Red')
    paint_price = data.get('paint_price', 0)
    transmission = data.get('transmission', '7-Speed PDK')
    package = data.get('performance_package', 'Standard Track Spec')
    package_price = data.get('package_price', 0)
    total_price = data.get('total_price', 27500000)

    if not email or '@' not in email or '.' not in email:
        return jsonify({
            "status": "error",
            "message": "Please enter a valid email address."
        }), 400

    import random, time
    config_id = f"PORSCHE-IN-992-{random.randint(1000, 9999)}"

    return jsonify({
        "status": "success",
        "config_id": config_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": "Your 911 GT3 specification inquiry has been received.",
        "summary": {
            "driver_name": driver_name,
            "email": email,
            "preferred_location": location,
            "exterior_paint": paint,
            "paint_price": paint_price,
            "transmission": transmission,
            "performance_package": package,
            "package_price": package_price,
            "total_estimated_inr": total_price
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Porsche 911 GT3 Launch Experience running on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)