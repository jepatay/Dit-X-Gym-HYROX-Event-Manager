# Dit X-Gym HYROX Event Manager

Internal event management system for [Dit X-Gym](https://ditxgym.dk) — a certified HYROX Training Club in Hornslet, Denmark.

---

## Stack

- **Frontend**: React + Vite
- **Backend**: Node/Express (`server/index.js`) — serves the built frontend and proxies the Overlap Risk chat to OpenAI (keeps the API key off the client)
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (Email/Password)
- **Storage**: Firebase Storage
- **Hosting**: Render.com (Web Service)

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project → name it `ditxgym-hyrox`
2. **Firestore**: Build → Firestore Database → Create → Production mode → region: `europe-west1`
3. **Auth**: Build → Authentication → Sign-in method → Enable Email/Password
4. **Auth Users**: Authentication → Users → Add individual admin accounts per coach
5. **Storage**: Build → Storage → Get started → Production mode → region: `europe-west1`
6. **Web App**: Project Settings → Your apps → Add Web app → Copy `firebaseConfig`
7. Create a `.env` file (see `.env.example`)

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;
    }
    match /teams/{teamId} {
      allow read: if true;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Render Deploy

The app is a Node **Web Service** on Render (not a static site) — it needs a running server to proxy the
Overlap Risk chat to OpenAI without exposing the API key to the browser.

1. Push project to GitHub
2. Render → New → Web Service → connect repo
3. **Build command**: `npm install && npm run build`
4. **Start command**: `npm start`
5. Add all `VITE_` env vars from `.env.example` in Render → Environment
6. Add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`) — server-side only, no `VITE_` prefix
7. Deploy

> If your service was previously a Static Site, switch it to a Web Service (or create a new one) —
> Static Sites can't run the Express server this app now needs.

---

## Local Development

```bash
cp .env.example .env
# Fill in your Firebase config values in .env, and OPENAI_API_KEY if you want the
# Overlap Risk chat to work locally

npm install
npm run dev      # Vite dev server (proxies /api/* to the server below)
npm run server   # in a second terminal — Express server for the chat API
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_PUBLIC_BASE_URL` | Full URL of your Render deployment (e.g. `https://ditxgym-hyrox.onrender.com`) |
| `OPENAI_API_KEY` | Server-side only. Powers the Overlap Risk chat tab. Without it, that tab still shows the schedule/notes, chat just returns an error. |
| `OPENAI_MODEL` | Server-side only. Optional, defaults to `gpt-4o-mini`. |

> Never commit `.env` — it is in `.gitignore`

---

## Routes

| Path | Description | Auth |
|---|---|---|
| `/login` | Coach login | Public |
| `/` | Event dashboard | Protected |
| `/event/new` | Create event | Protected |
| `/event/:id` | Edit event (tabs: Info, Teams, Checklist, Event Setup, Overlap Risk) | Protected |
| `/event/:id/checkin` | Check-in athletes on competition day | Protected |
| `/event/:id/qr` | QR code generator + print | Protected |
| `/event/:id/startlist` | Printable start list | Protected |
| `/event/:id/results` | Enter finish times | Protected |
| `/event/:id/leaderboard` | Live leaderboard (TV display) | **Public** |
| `/e/:slug` | Public athlete page (QR destination) | **Public** |
| `/settings` | Global config: categories, templates, checklist, weights | Protected |
