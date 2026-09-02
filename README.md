# 🏎️ Porsche 911 GT3 (992) — 3D WebGL Configurator & Cinematic Launch Experience

An ultra-luxury, high-performance web experience and photorealistic 3D configurator for the **Porsche 911 GT3 (992)**. Built with modern WebGL technologies, GSAP motion engineering, real-time computational fluid dynamics (CFD) airflow shaders, and a Scikit-Learn machine learning telemetry backend.

---

## 🌟 Key Highlights & Features

- **Photorealistic Three.js 3D Viewport (`3d-view.html`)**:
  - Powered by Three.js r128 with `MeshPhysicalMaterial` rendering, studio rim lighting, `EffectComposer`, and `UnrealBloomPass` post-processing.
  - Interactive 3D-to-2D screen space projected hotspots displaying live Porsche technical dossiers.

- **Mechanical Exploded View Engine**:
  - Full chassis reveal toggle animating wheels, brakes, wing, carbon bucket seat cockpit, and engine cover outward in 3D space with synchronized cross-state auto-reassembly.

- **Volumetric 3D Scene Typography & Word Reveals**:
  - Physical 3D extruded scene text (`THREE.TextGeometry` + `THREE.FontLoader`) floating in 3D WebGL space with sweeping motorsport red rim lighting.
  - 3D perspective word-by-word text card stagger reveals (`perspective: 1000px; transform-style: preserve-3d`) driven by GSAP 3D spring physics (`back.out(1.4)`).

- **Scikit-Learn Machine Learning Track Setup Optimizer (`app.py`)**:
  - Backend Flask server running a trained `RandomForestRegressor` predicting optimal wing angles (°), tire pressures (bar), and brake bias (%) based on temperature, weather, and circuit layout with Explainable AI (XAI) feature attribution.

- **60FPS Zero-Loss Motion Performance**:
  - `IntersectionObserver` canvas render gating, stationary redraw throttling, background tab WebGL throttling (`visibilitychange`), and Lenis smooth scroll ticker integration.

- **Full Adaptive Responsiveness**:
  - 100% responsive across 4K Ultra-Wide monitors, standard laptops, tablets, and smartphones (320px–480px) with horizontal snap-scrolling camera preset bars.

- **Free-Tier Render.com Hosting Ready**:
  - Production-ready `Dockerfile`, `render.yaml`, and `requirements.txt` configured for 1-click deployment on **Render.com**.

---

## 🛠️ Technology Stack & Dependencies

### Frontend Architecture
- **3D Graphics Engine**: Three.js r128 (	hree.min.js, OrbitControls.js, GLTFLoader.js, DRACOLoader.js, FontLoader.js, TextGeometry.js)
- **Post-Processing Shaders**: Three.js EffectComposer, RenderPass, ShaderPass, CopyShader, LuminosityHighPassShader, UnrealBloomPass
- **Motion & Animation Engine**: GSAP 3.12.5 (gsap.min.js, ScrollTrigger.min.js)
- **Smooth Scroll Inertia**: Lenis v1.1.18 (lenis.min.js)
- **Typography & Styling**: Google Fonts (Barlow Condensed, Space Grotesk, Inter, IBM Plex Mono), Glassmorphic iOS CSS System

### Backend & Machine Learning
- **Web Framework**: Python 3.11 / Flask 3.0.3
- **Machine Learning Engine**: Scikit-Learn 1.4.2 (RandomForestRegressor), NumPy 1.26.4
- **Production WSGI Server**: Gunicorn 22.0.0
- **Hosting & Deployment**: Render.com, GitHub, Docker

---

## 🚀 Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Fasee9831/porsche-gt3.git
cd porsche-gt3
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Flask Backend & Web Application
```bash
python app.py
```
Open your browser and navigate to http://localhost:5000.

---

## 🌐 Deploying to Render.com (GitHub Integration)

Deploy your application live for **free** on Render in 3 easy steps:

### Option A: 1-Click Render Blueprint (Recommended)
1. Push this repository to your GitHub account (`https://github.com/Fasee9831/porsche-gt3`).
2. Log into [Render.com Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your `porsche-gt3` repository. Render will automatically detect `render.yaml` and deploy your Web Service live!

### Option B: Manual Render Web Service Setup
1. On [Render.com](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository `Fasee9831/porsche-gt3`.
3. Configure the settings:
   - **Environment**: `Docker` (or `Python 3`)
   - **Build Command**: `pip install -r requirements.txt` (if using Python)
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 app:app`
4. Click **Create Web Service**. Render will issue your live HTTPS URL (e.g., `https://porsche-gt3.onrender.com`).

---

## 📁 Repository Structure

```
porsche/
├── index.html              # Main German Automotive Launch Experience
├── 3d-view.html            # Photorealistic Three.js 3D Configurator Stage
├── drift.html              # Interactive Drift Experience Stage
├── main.js                 # Global Motion, Lenis Scroll, & Interactivity Engine
├── styles.css              # Glassmorphic Styling & Adaptive Responsive System
├── app.py                  # Flask Backend & Scikit-Learn Setup Optimizer Model
├── requirements.txt        # Pinned Python Dependencies
├── render.yaml             # Render.com 1-Click Blueprint Configuration
├── Dockerfile              # Production Docker Container Configuration
├── bgmain.mp4              # Background Hero Video Asset
├── porsche.mp4             # High-Definition Cinematic Video Asset
├── drift.mp4               # Drift Mode Video Asset
├── porschelogo.png         # Porsche Crest Emblem Logo Asset
├── frames/                 # Pre-rendered 240 Frame Sequence
└── models/                 # High-Fidelity Porsche 911 GT3 GLB 3D Model
```

---

## 📜 License & Credits

- **Developer**: Built by [Fasee9831](https://github.com/Fasee9831).
- **Engineering & Design**: Built for Porsche Enthusiasts & Motorsport Engineers.
- **Copyright**: © 2026 Dr. Ing. h.c. F. Porsche AG. All logos and product names belong to Porsche AG.
