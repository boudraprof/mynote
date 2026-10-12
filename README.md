# 📱 My Notes — Mobile App

<p align="center">
  <strong>The cross-platform companion app for My Notes, built with Expo and React Native.</strong><br>
  Offline-first note taking with local SQLite caching, background sync, and native reminders.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-56-000020?style=for-the-badge&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React_Native-0.85-61DAFB?style=for-the-badge&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle-C5F74F?style=for-the-badge&logo=sqlite" alt="Drizzle SQLite" />
  <img src="https://img.shields.io/badge/Better_Auth-1.7-purple?style=for-the-badge" alt="Better Auth" />
  <img src="https://img.shields.io/badge/Vitest-Unit_Tests-729B1B?style=for-the-badge&logo=vitest" alt="Vitest" />
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Offline-First & Sync](#-offline-first--sync)
- [Authentication](#-authentication)
- [Reminders & Notifications](#-reminders--notifications)
- [Building with EAS](#-building-with-eas)
- [Testing & Linting](#-testing--linting)
- [Related Projects](#-related-projects)
- [License](#-license)

---

## 🌟 Overview

This is the standalone mobile client for **My Notes**, a Google Keep-inspired note-taking platform. It talks to the web app's REST API (`/api/v1`) and keeps a full local copy of your notes in SQLite, so the app stays fast and usable even without a connection.

Changes made offline are queued locally and pushed to the server automatically when connectivity returns, with exponential-backoff retries and a live sync status banner.

---

## ✨ Features

- **📝 Notes & Checklists** — text notes, interactive checklists, pinning, and a compact grid/list view toggle.
- **🏷️ Labels & Filtering** — create and delete labels, then filter the note list by label.
- **🎨 Color Palettes** — Google Keep-style background colors per note.
- **✏️ Drawings & Image Attachments** — attach photos from the library and sketch on a canvas.
- **🕘 Version History** — browse and restore previous revisions of a note.
- **⏰ Native Reminders** — schedule local notifications for notes; tapping a reminder deep-links straight to the note.
- **🗂️ Archive & Trash** — archive notes or move them to Trash, with restore, undo snackbars, and a one-tap "Empty Trash".
- **🔍 Search** — fast client-side filtering by title and content.
- **📤 Export & Share** — share one or more notes through the OS share sheet as Markdown.
- **🌓 Theming** — system, light, and dark modes via React Native Paper.
- **⚡ Offline-First** — SQLite cache + a durable mutation queue that survives app restarts.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) (Expo Router, file-based routing) |
| **Runtime** | [React Native 0.85](https://reactnative.dev/) · [React 19](https://react.dev/) |
| **UI Kit** | [React Native Paper](https://callstack.github.io/react-native-paper/) · [`@expo/ui`](https://docs.expo.dev/versions/v56.0.0/sdk/ui/) · `@expo/vector-icons` |
| **Navigation** | [Expo Router](https://docs.expo.dev/router/introduction/) (drawer + stack) |
| **Local Database** | [Expo SQLite](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/) with [Drizzle ORM](https://orm.drizzle.team/) |
| **Authentication** | [Better Auth](https://better-auth.com/) via [`@better-auth/expo`](https://better-auth.com/docs/integrations/expo) (token stored in SecureStore) |
| **Data Fetching** | [TanStack Query v5](https://tanstack.com/query) · [Axios](https://axios-http.com/) |
| **Forms** | [TanStack Form](https://tanstack.com/form) |
| **Notifications** | [Expo Notifications](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/) |
| **Animations** | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) · [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| **Testing** | [Vitest](https://vitest.dev/) |
| **Builds** | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## 📂 Project Structure

```text
mobile-app/
├── src/
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── (drawer)/           # Home screen with the drawer layout
│   │   ├── auth/               # login.tsx · signup.tsx (modal)
│   │   ├── note/               # create.tsx · [id].tsx (editor)
│   │   ├── profile/            # Account settings
│   │   ├── labels/             # Label management
│   │   ├── search.tsx          # Full search screen
│   │   └── _layout.tsx         # Root providers + navigation stack
│   ├── api/                    # REST client wrappers (notes, labels, search, share, upload)
│   ├── components/             # NoteCard, ChecklistEditor, DrawingEditor, ReminderSheet…
│   ├── constants/              # Theme colors, spacing, palette backgrounds
│   ├── db/                     # SQLite schema + Drizzle client
│   ├── hooks/                  # use-notes, use-sync, use-search, use-draft, use-undo…
│   ├── lib/                    # API client, auth, offline queue, sync, notifications, export
│   └── providers/              # Auth, Query, and Theme providers
├── assets/                     # Icons, splash, backgrounds
├── drizzle/                    # Generated SQLite migrations
├── app.json                    # Expo configuration
├── eas.json                    # EAS build profiles
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `v20.x` or `v24.x` (LTS recommended)
- **npm**
- A running instance of the [My Notes web app](../README.md) to talk to (local or hosted)
- For native runs: **Android Studio** (emulator/SDK) and/or **Xcode** (iOS simulator, macOS only)
- The [Expo Go](https://expo.dev/go) app for quick testing on a physical device

> **Note:** Reminders use `expo-notifications`, which is not available in Expo Go on Android (removed in SDK 53). Use a development build (`npm run android`) for full reminder support. Earlier versions of the Expo docs are versioned — see the [SDK 56 docs](https://docs.expo.dev/versions/v56.0.0/).

### Installation

```bash
# From the repository root
cd mobile-app

# Install dependencies
npm install
```

### Environment Variables

The app reads its API endpoint from `EXPO_PUBLIC_*` variables at build time.

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | No | `https://mynote-demo.vercel.app` | Base URL of the My Notes backend. |
| `EXPO_PUBLIC_API_BASE_PATH` | No | `api/v1` | API path prefix. |

`.env` holds the production defaults used by EAS builds. For local development, override them in `.env.local` (gitignored), pointing at your machine's LAN IP so a physical device can reach the backend:

```bash
# mobile-app/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.130:3000
EXPO_PUBLIC_API_BASE_PATH=api/v1
```

### Running the App

```bash
# Start the Expo dev server
npm start
# or from the repository root:
# npm run mobile:dev
```

Then choose a target from the terminal output:

- **Android emulator/device** — press `a` or run `npm run android` (development build)
- **iOS simulator/device** — press `i` or run `npm run ios` (macOS only)
- **Web preview** — press `w` or run `npm run web`
- **Expo Go** — scan the QR code (reminders unavailable on Android in Expo Go)

You can start developing by editing files under `src/app/`. Routes are defined by the file system.

---

## 🔄 Offline-First & Sync

- **Local cache:** every note is stored in SQLite (`src/db/schema.ts`) so the UI works without a connection.
- **Mutation queue:** create/update/delete operations are written to a `sync_queue` table and replayed in order on reconnect.
- **Conflict handling:** when a local note is created, the server assigns its own id; the local record is re-keyed so later updates/deletes target the correct server id. Ops that 404 are dropped and the local copy is kept.
- **Retries:** failed sync passes schedule an exponential-backoff retry (`src/lib/sync-retry.ts`), paused while offline or logged out, and resumed on app foreground.
- **Status UI:** a banner on the home screen reports pending changes and lets you trigger a manual "Sync now".

Relevant files: `src/hooks/use-sync.ts`, `src/lib/offline-notes.ts`, `src/lib/sync.ts`.

---

## 🔐 Authentication

Auth is handled by [Better Auth](https://better-auth.com/) through `@better-auth/expo`:

- Email/password sign-in and sign-up.
- Session tokens are persisted in the device keychain via **Expo SecureStore**.
- The API client (`src/lib/api.ts`) attaches the auth cookie to every request and signs the user out on a `401`.
- Profile screen supports updating name/avatar, changing email/password, and deleting the account.

See `src/lib/auth.ts` and `src/providers/auth-provider.tsx`.

---

## ⏰ Reminders & Notifications

- Setting a reminder stores `reminderAt` on the note and schedules a local notification (`src/lib/notifications.ts`).
- Tapping a notification deep-links to the note (`/note/:id`), even from a cold start.
- A dedicated Android channel (`reminders`) is created on startup; the app prompts for permission the first time a reminder is set.
- Trashing a note cancels its reminder; restoring it re-schedules one if the time is still in the future.

---

## 📦 Building with EAS

Build profiles are defined in [`eas.json`](./eas.json):

| Profile | Distribution | API URL |
| :--- | :--- | :--- |
| `development` | Internal (dev client) | `http://192.168.1.130:3000` |
| `preview` | Internal | `https://mynote-demo.vercel.app` |
| `production` | Store | `https://mynote-demo.vercel.app` |

```bash
# Install the EAS CLI once
npm install -g eas-cli

# Development build
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
```

Native `android/` and `ios/` folders are generated and gitignored — they are regenerated from `app.json` on each build (Continuous Native Generation).

---

## 🧪 Testing & Linting

Unit tests live alongside the source as `*.test.ts` files and are run with Vitest:

```bash
# Run the unit test suite once
npm test

# Lint the project
npm run lint
```

The pure logic (`sync-retry`, `reminders`, `network`, `image-url`, `html`, `api`) is covered without needing a device.

---

## 🔗 Related Projects

- **[My Notes web app](../README.md)** — the Next.js backend and desktop client this app syncs with.

---

## 📄 License

Distributed under the [MIT License](./LICENSE).
