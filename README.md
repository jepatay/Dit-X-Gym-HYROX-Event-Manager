# Dit X-Gym HYROX Event Manager

Internal event management system for [Dit X-Gym](https://ditxgym.dk) — a certified HYROX Training Club in Hornslet, Denmark.

---

## Stack

- **Frontend**: React + Vite
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (Email/Password)
- **Storage**: Firebase Storage
- **Hosting**: Render.com (static site)

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

1. Push project to GitHub
2. Render → New → Static Site → connect repo
3. **Build command**: `npm run build`
4. **Publish directory**: `dist`
5. Add all `VITE_` env vars from `.env.example` in Render → Environment
6. Deploy

---

## Local Development

```bash
cp .env.example .env
# Fill in your Firebase config values in .env

npm install
npm run dev
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

> Never commit `.env` — it is in `.gitignore`

---

## Routes

| Path | Description | Auth |
|---|---|---|
| `/login` | Coach login | Public |
| `/` | Event dashboard | Protected |
| `/event/new` | Create event | Protected |
| `/event/:id` | Edit event (tabs: Info, Waves, Teams, Checklist, Setup) | Protected |
| `/event/:id/checkin` | Check-in athletes on competition day | Protected |
| `/event/:id/qr` | QR code generator + print | Protected |
| `/event/:id/startlist` | Printable start list | Protected |
| `/event/:id/results` | Enter finish times | Protected |
| `/event/:id/leaderboard` | Live leaderboard (TV display) | **Public** |
| `/e/:slug` | Public athlete page (QR destination) | **Public** |
| `/settings` | Global config: categories, templates, checklist, weights | Protected |
