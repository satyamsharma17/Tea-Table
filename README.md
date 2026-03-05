# ☕ Tea Table — House of Katha Body-Double App

A lightweight desktop presence app that recreates the feeling of working together in a physical studio. See who's working, what they're doing, and maintain a floating co-working window while you work.

## Quick Start

### Prerequisites
- Node.js 18+
- Rust (installed via [rustup](https://rustup.rs))
- A Firebase project with **Authentication** (Email + Google) and **Realtime Database** enabled

### 1. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in methods: Email/Password and Google
3. Create a **Realtime Database** (Start in test mode, then apply rules)
4. Copy the security rules from `firebase-rules.json` into your Firebase Realtime Database Rules
5. Copy your Firebase config values

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

Edit `.env` with your actual Firebase project values.

### 3. Install & Run

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server and opens the Tauri desktop app.

### 4. Build for Production

```bash
npm run tauri build
```

Outputs:
- macOS: `.dmg` in `src-tauri/target/release/bundle/dmg/`
- Windows: `.exe` in `src-tauri/target/release/bundle/nsis/`

## Architecture

```
src/                    # React frontend
├── components/         # Reusable UI components
│   ├── Avatar          # User avatar with status indicator
│   ├── Login           # Auth screen (email + Google)
│   ├── MemberCard      # Studio member display card
│   └── StatusSelector  # Status toggle buttons
├── contexts/           # React context providers
│   └── AuthContext     # Firebase auth state
├── hooks/              # Custom hooks
│   └── usePresence     # Realtime presence sync
├── lib/                # Config & utilities
│   └── firebase        # Firebase initialization
├── pages/              # Route pages
│   ├── StudioRoom      # Main studio view
│   └── FloatingStudio  # Compact floating overlay
├── styles/             # Global styles
└── types.ts            # TypeScript types

src-tauri/              # Rust backend (Tauri)
└── src/lib.rs          # Window management commands
```

## Features

- **Studio Room**: See all team members, their status, and online state
- **Floating Window**: Frameless, always-on-top, resizable mini-panel
- **Status Selector**: Working / Designing / Reviewing / Break
- **Realtime Presence**: Heartbeat sync, auto offline detection
- **Auth**: Email/password or Google sign-in

## Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Desktop   | Tauri v2               |
| Frontend  | React + TypeScript     |
| Backend   | Firebase Realtime DB   |
| Auth      | Firebase Authentication|
| Build     | Vite                   |
