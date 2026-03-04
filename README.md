# Custom Background Sound (CBS)

A web application for creating personalized ambient soundscapes to help you focus, relax, or sleep.

**Live Demo:** [https://ziqizhu-lan.github.io/CBS](https://ziqizhu-lan.github.io/CBS)

---

## About

**Custom Background Sound** lets you mix and combine ambient sounds — like rain, wind, campfire, birds, and ocean waves — to create your perfect audio environment. No installation needed; it runs directly in your browser.

Built with **React + TypeScript**, **Howler.js** for audio, and **Zustand** for state management. All audio files are sourced from open-licensed (CC0 / CC-BY) libraries.

---

## Features

- **Multi-track mixing** — Play multiple ambient sounds simultaneously
- **Independent volume control** — Adjust each sound individually
- **Timer** — Auto-stop all sounds after 1–60 minutes
- **Preset modes** — Study, Relaxation, Sleep
- **User accounts** — Register and log in to save your personal preferences
- **Secure storage** — Passwords hashed with SHA256; data stored in localStorage
- **Offline support** — Works after the first load, even without internet

---

## Getting Started

### Prerequisites
- Node.js
- npm

### Installation
```bash
git clone https://github.com/ZiqiZhu-Lan/CBS.git
cd CBS
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Build & Deploy
```bash
npm run build
cd build
git init
git checkout -b gh-pages
git add -f .
git commit -m "Deploy"
git remote add origin https://github.com/ZiqiZhu-Lan/CBS.git
git push -f origin gh-pages
```

---

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Audio | Howler.js 2.2.4 |
| State | Zustand 5.0.9 |
| Styles | CSS Modules |
| Icons | React Icons |
| Storage | localStorage + SHA256 (Crypto-JS) |
| Hosting | GitHub Pages |

---

## Sound Sources

All audio files are sourced from [Freesound.org](https://freesound.org) under CC0 or CC-BY licenses.

---

## Authors

**Yuhan Zhu · Ziqi Zhu** — CFGM Sistemes Microinformàtics i Xarxes (SMX), Institut Puig Castellar

---

## License

This project is licensed under [CC BY-NC-ND 3.0 ES](https://creativecommons.org/licenses/by-nc-nd/3.0/es/).