# 📝 My Notes (Next Notes)

<p align="center">
  <strong>A modern, full-stack, Google Keep-inspired personal knowledge and note-taking platform.</strong><br>
  Built with Next.js 16, React 19, Tailwind CSS v4, Drizzle ORM, PostgreSQL, Better Auth, and an Expo companion mobile app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Better_Auth-1.6-purple?style=for-the-badge" alt="Better Auth" />
  <img src="https://img.shields.io/badge/Expo-56-000020?style=for-the-badge&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Playwright-E2E-45ba4b?style=for-the-badge&logo=playwright" alt="Playwright" />
  <img src="https://img.shields.io/badge/Vitest-Unit_Tests-729B1B?style=for-the-badge&logo=vitest" alt="Vitest" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture & Directory Structure](#-architecture--directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running the App](#running-the-app)
- [Environment Variables](#-environment-variables)
- [Docker Deployment](#-docker-deployment)
- [Companion Mobile App (Expo)](#-companion-mobile-app-expo)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [REST API Reference](#-rest-api-reference)
- [Testing](#-testing)
- [Security & Offline-First Design](#-security--offline-first-design)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**My Notes** is an open-source, self-hostable note-taking web application inspired by Google Keep, designed for speed, simplicity, and flexibility. It combines a distraction-free note editor, rich-text markdown formatting, interactive checklists, drawings, color-coded categorization, full offline synchronization, and multi-user collaboration into a cohesive, modern workspace.

Whether you're organizing daily thoughts, managing task lists, sketching ideas, or collaborating with others, **My Notes** provides a fast, resilient experience both on desktop and on mobile devices.

---

## ✨ Key Features

- **📝 Rich Notes & Interactive Checklists**
  - Plain text and rich-text markdown notes with live formatting.
  - Interactive to-do checklists with instant toggles and reordering.
  - Fast note title and body creation with autosave.

- **🎨 Visual Organization & Customization**
  - Color palettes and customizable card background themes.
  - Tagging and label system: filter notes by one or more labels.
  - Pin important notes to keep them front and center.
  - Drag-and-drop manual positioning and ordering.

- **✏️ Canvas Drawing & Sketch Notes**
  - Integrated drawing canvas to capture sketches, handwritten diagrams, and doodles directly inside your notes.

- **📸 Flexible Image Attachments**
  - Dual-mode image storage: seamlessly toggle between **Cloudinary** cloud hosting or **Local disk storage** with optimized image delivery via Sharp.

- **🔄 Version History & Snapshots**
  - Automatic note revision tracking with timestamped snapshots.
  - Side-by-side comparison and instant one-click rollback to any previous version.

- **👥 Collaboration & Note Sharing**
  - Share individual notes securely with other users via email address.
  - Manage share permissions and shared collaborators on demand.

- **⏰ Reminders, Archive & Auto-Purging Trash**
  - Set specific date and time reminders for urgent notes.
  - Archive notes to keep your main workspace clutter-free.
  - Soft-delete to Trash with quick restore or permanent deletion.
  - Automated 30-day retention cleanup for expired trashed items.

- **⚡ Offline-First Architecture & PWA**
  - Progressive Web App (PWA) with Service Worker caching and installability.
  - Client-side offline mutation queue that stores changes locally and auto-synchronizes when your internet connection is restored.
  - Optimistic UI updates via TanStack Query for instantaneous interactions.

- **🔍 Instant Debounced Search**
  - Real-time search across titles, contents, and labels with responsive loading skeletons.

- **📱 Cross-Platform Mobile Companion App**
  - Standalone mobile client built with **React Native** and **Expo 56**, powered by `@better-auth/expo` and SQLite offline caching.

- **🔐 Robust Authentication & Security**
  - Powered by **Better Auth**:
    - Email/password signup with verification tokens and password reset emails (via Nodemailer).
    - Google OAuth sign-in.
    - Rate limiting per IP and user session stored in PostgreSQL.
    - Strict session cookie hardening and CSRF protection.
    - HTML sanitization using DOMPurify to eliminate XSS risks.

- **🌓 Dark Mode & Accessibility**
  - Beautiful, accessible UI built with Radix UI primitives and Tailwind CSS v4.
  - System, light, and dark theme support via `next-themes`.

- **💾 Data Portability (Export & Import)**
  - Full backup and restore capabilities: export your notes, checklists, and labels to JSON and import them anytime.

---

## 🛠 Tech Stack

### Web & API
| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers) |
| **UI Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/), `@tailwindcss/postcss` |
| **Components** | [Radix UI](https://www.radix-ui.com/), [Lucide React Icons](https://lucide.dev/) |
| **State Management** | [TanStack Query v5](https://tanstack.com/query), [Jotai](https://jotai.org/), [TanStack Form](https://tanstack.com/form) |
| **Database** | [PostgreSQL 17](https://www.postgresql.org/) |
| **ORM & Migrations** | [Drizzle ORM](https://orm.drizzle.team/), [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) |
| **Authentication** | [Better Auth](https://better-auth.com/) (Email/Password, Google OAuth, Sessions) |
| **Email Service** | [Nodemailer](https://nodemailer.com/) |
| **Storage & Processing** | [Cloudinary SDK](https://cloudinary.com/) & [Sharp](https://sharp.pixelplumbing.com/) (local fallback) |
| **Sanitization & Validation** | [DOMPurify](https://github.com/cure53/DOMPurify), [Zod](https://zod.dev/) |
| **Error Monitoring** | [Sentry React SDK](https://sentry.io/) |

### Mobile (Companion App)
| Layer | Technology |
| :--- | :--- |
| **Framework** | [Expo 56](https://expo.dev/) (SDK 56, Expo Router) |
| **Runtime** | [React Native 0.85](https://reactnative.dev/) |
| **UI Kit** | [React Native Paper](https://callstack.github.io/react-native-paper/) |
| **Local DB & Auth** | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [`@better-auth/expo`](https://better-auth.com/docs/integrations/expo) |

### Testing & Tooling
| Tool | Purpose |
| :--- | :--- |
| **[Vitest](https://vitest.dev/)** | Fast unit and integration tests |
| **[Playwright](https://playwright.dev/)** | Cross-browser End-to-End (E2E) testing |
| **[Docker & Compose](https://www.docker.com/)** | Containerized database and production image |
| **[ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)** | Linting and code formatting |

---

## 📂 Architecture & Directory Structure

```text
next-notes/
├── app/                         # Next.js 16 App Router application
│   ├── (routes)/                # Route groups and pages
│   │   ├── api/v1/              # RESTful API endpoints & Better Auth catch-all
│   │   │   ├── notes/           # Note CRUD, reorder, share, copy, history
│   │   │   ├── labels/          # Label management endpoints
│   │   │   ├── search/          # Search endpoint
│   │   │   └── upload-image/    # Image upload handler
│   │   ├── auth/                # Signin, signup, forgot/reset password
│   │   ├── notes/               # Main dashboard, archive, reminders, trash
│   │   ├── uploads/             # Local static upload serving
│   │   └── user/profile/        # User profile & account settings
│   ├── components/              # React components & UI primitives
│   │   ├── pages-ui/            # View components (notes, archive, trash, etc.)
│   │   ├── ui/                  # Radix UI wrapper components
│   │   ├── drawing-canvas.tsx   # Freehand drawing & sketch canvas
│   │   ├── rich-text-editor.tsx # Rich text editor
│   │   ├── history-dialog.tsx   # Note version history modal
│   │   └── ShareDialog.tsx      # Note email-sharing dialog
│   ├── db/                      # Database schema and relations (Drizzle)
│   ├── hooks/                   # Custom hooks (optimistic notes, online status)
│   ├── utils/                   # Server & client utilities, auth, rate limiting
│   └── __tests__/               # Vitest unit test suites
├── mobile-app/                  # React Native / Expo companion mobile app
│   ├── src/                     # Mobile screens, hooks, and services
│   ├── app.json                 # Expo configuration
│   └── package.json             # Mobile app dependencies
├── drizzle/                     # Drizzle SQL migration files
├── e2e/                         # Playwright end-to-end test suites
├── public/                      # Static assets, PWA manifest, service worker
├── scripts/                     # Seeding & database utility scripts
├── docker-compose.yml           # Multi-container Docker deployment
├── Dockerfile                   # Multi-stage Next.js production build
└── package.json                 # Web project dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **npm**, **pnpm**, **yarn**, or **bun**
- **PostgreSQL 15+** (or use the included `docker-compose.yml`)

---

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/next-notes.git
   cd next-notes
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

   Generate a secure 32+ character authentication secret:
   ```bash
   openssl rand -base64 32
   ```
   Paste the generated string into `BETTER_AUTH_SECRET` in `.env`.

---

### Database Setup & Migrations

You can run PostgreSQL locally or start the included PostgreSQL container via Docker Compose:

```bash
# Start PostgreSQL via Docker Compose
docker compose up postgres -d
```

To use Neon instead, set `DATABASE_URL` in `.env` to your Neon PostgreSQL connection string. Keep the `sslmode=require` option from Neon, and use the pooled connection string for the application.

Once the database is running:

1. **Run Drizzle Schema Migrations:**
   ```bash
   npm run db:migrate
   ```

2. **Run Better Auth Migrations:**
   ```bash
   npm run better:migrate
   ```

3. **Seed Initial Note Statuses (`active`, `archived`, `trash`):**
   ```bash
   npm run db:seed
   ```

*(Optional)* You can open **Drizzle Studio** anytime to inspect and manage database tables visually:
```bash
npm run db:studio
```

---

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Here is a reference of the configuration options available in `.env`:

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgres://notes:pass@localhost:5432/notes` | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | **Yes** | — | Secret key used by Better Auth for signing and encryption (min. 32 chars). |
| `BETTER_AUTH_BASE_URL` | **Yes** | `http://localhost:3000` | Base URL where your backend server is hosted. |
| `BETTER_AUTH_BASE_PATH` | **Yes** | `v1/api` | API path for Better Auth endpoints. |
| `VITE_BETTER_AUTH_BASE_URL` | **Yes** | `http://localhost:3000` | Client-accessible auth base URL. |
| `VITE_BETTER_AUTH_BASE_PATH` | **Yes** | `v1/api` | Client-accessible auth base path. |
| `APP_URL` / `VITE_APP_URL` | **Yes** | `http://localhost:3000` | Public URL of the frontend application. |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID for social login. |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret. |
| `VITE_GOOGLE_CLIENT_ID` | No | — | Client-side Google OAuth client ID flag. |
| `SMTP_HOST` | No | — | SMTP host for sending emails (logs to console in dev if omitted). |
| `SMTP_PORT` | No | `587` | SMTP port (e.g. 587 or 465). |
| `SMTP_USER` | No | — | SMTP username. |
| `SMTP_PASS` | No | — | SMTP password. |
| `SMTP_FROM` | No | `noreply@example.com` | "From" email address. |
| `SMTP_FROM_NAME` | No | `My Notes` | "From" sender name. |
| `CLOUDINARY_CLOUD_NAME` | No | — | Cloudinary cloud name (falls back to local filesystem if unset). |
| `CLOUDINARY_API_KEY` | No | — | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | No | — | Cloudinary API secret. |
| `BETTER_AUTH_TRUSTED_ORIGINS`| No | `http://localhost:3000,http://localhost:8081` | Comma-separated list of origins trusted for auth cookies/CORS. |
| `BETTER_AUTH_SECURE_COOKIES` | No | `false` | Set to `true` in production to enforce HTTPS-only cookies. |
| `BETTER_AUTH_COOKIE_SAMESITE`| No | `lax` | SameSite cookie policy (`lax` or `strict`). |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000,http://localhost:8081` | Comma-separated CORS allowed origins. |
| `SENTRY_DSN` | No | — | Sentry DSN for frontend and backend error monitoring. |

---

## 🐳 Docker Deployment

To spin up the entire application stack (Next.js web app + PostgreSQL database) using Docker:

1. **Verify your `.env` settings**:
   Make sure `BETTER_AUTH_SECRET` is set in your `.env`.

2. **Launch the services:**
   ```bash
   docker compose up --build -d
   ```

3. **Run database migrations inside the container:**
   ```bash
   docker compose exec app npm run db:migrate
   docker compose exec app npm run better:migrate
   docker compose exec app npm run db:seed
   ```

4. Access the web app at [http://localhost:3000](http://localhost:3000).

---

## 📱 Companion Mobile App (Expo)

The project includes an Expo-based cross-platform mobile app in the `mobile-app/` directory.

### Quickstart for Mobile:

```bash
# Navigate to the mobile app directory
cd mobile-app

# Install dependencies
npm install

# Start the Expo development server
npm start
# or from root:
# npm run mobile:dev
```

You can then run the app on:
- **Android Emulator / Device**: Press `a` or run `npm run android`
- **iOS Simulator / Device**: Press `i` or run `npm run ios`
- **Web Preview**: Press `w` or run `npm run web`
- **Expo Go App**: Scan the QR code displayed in the terminal with the Expo Go app.

---

## ⌨️ Keyboard Shortcuts

Navigate and edit notes without taking your hands off the keyboard:

### Navigation
| Shortcut | Action |
| :--- | :--- |
| <kbd>N</kbd> | Create new note |
| <kbd>/</kbd> | Focus global search bar |
| <kbd>Esc</kbd> | Close active note dialog or editor |
| <kbd>?</kbd> | Open Keyboard Shortcuts help modal |

### Note Editor
| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Bold text |
| <kbd>Ctrl</kbd> + <kbd>I</kbd> | Italic text |
| <kbd>Ctrl</kbd> + <kbd>U</kbd> | Underline text |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |

### Note Actions
| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save current note |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Pin / unpin note |
| <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> | Delete note (move to trash) |

### List Navigation
| Shortcut | Action |
| :--- | :--- |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate notes list |
| <kbd>Enter</kbd> | Open selected note |
| <kbd>Space</kbd> | Select / deselect note |

---

## 📡 REST API Reference

All application endpoints are versioned under `/api/v1/`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `ALL` | `/api/v1/*` | Better Auth handlers (signup, signin, session, signout, OAuth, tokens) |
| `GET` | `/api/v1/notes` | List notes (filters: `status`, `labelId`, `page`, `limit`) |
| `POST` | `/api/v1/notes` | Create a new note (text, checklist, image, palette, labels) |
| `PUT` | `/api/v1/notes` | Update an existing note |
| `DELETE` | `/api/v1/notes` | Soft delete note to Trash (or permanently delete if already in Trash) |
| `POST` | `/api/v1/notes/reorder` | Update order positions of notes |
| `POST` | `/api/v1/notes/copy` | Clone an existing note |
| `GET` | `/api/v1/notes/history` | Retrieve revision history snapshots for a note |
| `POST` | `/api/v1/notes/history` | Restore/rollback a note to a specific revision snapshot |
| `POST` | `/api/v1/notes/share` | Share a note with another user by email address |
| `GET` | `/api/v1/notes/share` | List collaborators for a note |
| `DELETE`| `/api/v1/notes/share` | Remove collaborator access from a note |
| `GET` | `/api/v1/labels` | List all custom labels for the authenticated user |
| `POST` | `/api/v1/labels` | Create a new label |
| `DELETE`| `/api/v1/labels` | Delete a label |
| `GET` | `/api/v1/search?q=:query` | Full-text search across titles, contents, and labels |
| `POST` | `/api/v1/upload-image` | Upload image file (supports Cloudinary or local storage) |

---

## 🧪 Testing

The codebase includes comprehensive test suites across both unit and end-to-end layers.

### Unit Tests (Vitest)

Unit tests cover critical utility functions, authentication checks, HTML sanitization, offline queue logic, and note status management:

```bash
# Run tests once
npm test

# Run tests in interactive watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)

Full end-to-end browser tests run against the Next.js application:

```bash
# Run all Playwright tests
npm run test:e2e

# Run Playwright with interactive UI mode
npm run test:e2e:ui

# Run Playwright in debug mode
npm run test:e2e:debug
```

### Linting & Formatting

```bash
# Check code with ESLint
npm run lint

# Auto-fix lint issues
npm run fix

# Format code with Prettier
npm run format

# Run both formatting and linting
npm run check
```

---

## 🔒 Security & Offline-First Design

- **XSS Prevention**: User input and rich text content are sanitized on the server before rendering using [DOMPurify](https://github.com/cure53/DOMPurify).
- **Authentication & Authorization**: Route handlers enforce authentication via `requireApiAuth` session verification. Resource queries enforce user scoping (`userId` checks) so users can never access or modify another user's notes without explicit sharing.
- **Database Rate Limiting**: Built-in sliding rate limiters track requests per IP/user in the PostgreSQL `rate_limit` table to protect against brute-force and abuse.
- **Offline Sync Queue**: When disconnected from the internet, client mutations are safely persisted to local storage and replayed in sequence upon reconnection without data collisions.
- **Auto Trash Sweeping**: Expired trashed notes (older than 30 days) are automatically pruned on read operations without blocking user requests.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push to your branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

Please ensure tests pass (`npm test` and `npm run test:e2e`) and your code adheres to formatting rules (`npm run check`) prior to submitting your PR.

---

## 📄 License

This project is open-source and distributed under the [MIT License](LICENSE).
