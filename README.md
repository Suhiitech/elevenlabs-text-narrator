# 🎙️ ElevenLabs Voice Studio (Netlify Serverless Edition)

A modern, studio-grade Text-to-Speech web application built with **HTML5, CSS3, JavaScript**, and **Netlify Serverless Functions**. Powered by **ElevenLabs AI Voice Synthesis Models**.

---

## 🔒 Security Architecture

- **Zero Client-Side Secrets**: Your `ELEVENLABS_API_KEY` is never loaded into the browser or committed to GitHub.
- **Serverless API Proxy**: All calls to ElevenLabs TTS and Voices endpoints are handled exclusively through the Netlify serverless function at `netlify/functions/generate-speech.js`.
- **Environment Variables**: The function reads the secret from `process.env.ELEVENLABS_API_KEY`.
- **Git Safety**: Secrets, environment files (`.env`, `.env.*`), and `config.js` are excluded by `.gitignore`.

---

## ✨ Features

- **Model Selection Dropdown**:
  - `Eleven Multilingual v2` (`eleven_multilingual_v2`) — Lifelike and emotionally rich narration in 29+ languages.
  - `Eleven Flash v2.5` (`eleven_flash_v2_5`) — Ultra-low latency (~75ms) model.
  - `Eleven Turbo v2.5` (`eleven_turbo_v2_5`) — High quality and fast turnaround.
  - `Eleven English v1` (`eleven_monolingual_v1`) — Classic English narration.
  - `Eleven Multilingual v1` (`eleven_multilingual_v1`) — Legacy multilingual.
- **Voice Actor Library & Account Sync**:
  - Curated library of top ElevenLabs voices (*Rachel, Adam, Antoni, Bella, Josh, Arnold, Sarah, Daniel*, etc.).
  - **"Sync Voices"** button to dynamically load your personal cloned and account voices through the serverless backend.
- **Text & Prompt Tools**:
  - Fast sample prompts (*Story*, *Tech News*, *Audiobook*).
  - Live character counter, word counter, and estimated audio playback duration.
- **Fine-Tuning Controls**:
  - Stability slider (0% to 100%)
  - Clarity / Similarity Boost slider (0% to 100%)
  - Style Exaggeration slider (0% to 100%)
  - Speaker Boost toggle
- **Real-Time Audio Visualizer**:
  - Canvas-based frequency bars and soundwave analyzer powered by Web Audio API (`AudioContext` & `AnalyserNode`).
  - Ambient idle wave animation when paused.
- **Studio Audio Player**:
  - Scrubber timeline with duration readouts.
  - Play / Pause / Stop controls.
  - Playback speed multiplier (0.8x, 1.0x, 1.2x, 1.5x, 2.0x).
  - Volume slider and mute toggle.
  - **Download MP3** button with timestamped file naming.
- **Generation History**:
  - Automatically records generated narrations in browser storage for instant replay and MP3 downloading.
- **Keyboard Shortcuts**:
  - <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) to instantly start narration.

---

## 🛠️ Local Testing Guide

To test the frontend and the Netlify serverless function locally:

### Step 1: Set Up Local Environment Variable
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your ElevenLabs API key:
   ```env
   ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
   ```
   *(Note: `.env` is ignored by `.gitignore` and will never be pushed to Git.)*

### Step 2: Run Netlify Dev
If you have the Netlify CLI installed:
```bash
netlify dev
```
*(If you don't have it installed yet, run `npm install -g netlify-cli`)*

`netlify dev` will automatically:
- Spin up a local development server (typically at `http://localhost:8888`).
- Mount the serverless function at `/.netlify/functions/generate-speech` and `/api/generate-speech`.
- Inject `ELEVENLABS_API_KEY` from your local `.env` file into `process.env`.

---

## 🚀 Deployment to Netlify

### Method 1: Deploy via GitHub (Recommended)
1. Initialize your git repository and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for ElevenLabs Voice Studio"
   ```
2. Push your repository to GitHub.
3. In [Netlify](https://app.netlify.com):
   - Click **Add new site** > **Import an existing project**.
   - Select your GitHub repository.
   - Netlify will automatically detect `netlify.toml` with `publish = "."` and `functions = "netlify/functions"`.
4. Add your Environment Variable:
   - Go to **Site Configuration** > **Environment variables**.
   - Click **Add a variable** > **Add a single variable**.
   - Key: `ELEVENLABS_API_KEY`
   - Value: *(Paste your private ElevenLabs API key)*
   - Scope: All scopes (Builds & Functions).
5. Click **Deploy Site**.

### Method 2: Deploy via Netlify CLI
1. Log in to Netlify from your terminal:
   ```bash
   netlify login
   ```
2. Link or create a new site:
   ```bash
   netlify init
   ```
3. Set the remote environment variable:
   ```bash
   netlify env:set ELEVENLABS_API_KEY "your_actual_api_key"
   ```
4. Deploy to production:
   ```bash
   netlify deploy --prod
   ```

---

## 📁 File Structure

```text
├── .env.example                       # Template for local environment variables
├── .gitignore                         # Excludes .env, config.js, and local build artifacts
├── package.json                       # Scripts for running netlify dev locally
├── config.js                          # Client-side config (no secrets)
├── index.html                         # Semantic HTML5 UI layout, controls, audio player
├── style.css                          # Glassmorphism stylesheet & visualizer styles
├── app.js                             # Frontend logic calling /.netlify/functions/generate-speech
├── netlify.toml                       # Netlify configuration & [dev] server settings
├── netlify/
│   └── functions/
│       └── generate-speech.js         # Serverless function holding ELEVENLABS_API_KEY
└── README.md                          # Documentation and setup instructions
```
