# 🔗 URL Shortener

A full-stack URL shortener that converts long links into clean, shareable short URLs with instant redirects.

## 🛠 Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (Mongoose)
- **Monorepo**: Single unified repository

---

## ✨ Features

- Shorten any valid URL into a short ID (e.g., `/abc123`)
- Copy short URL to clipboard with one click
- Instant redirect via Express backend
- Input validation and error handling
- Clean, responsive UI
- Built entirely with TypeScript (frontend + backend)

---

## 📁 Project Structure

```
urlShortener/
├── client/         # React frontend (Vite + TypeScript)
│   └── src/
│       ├── App.tsx
│       └── App.css
├── server/         # Express backend (TypeScript)
│   └── src/
│       ├── index.ts
│       ├── models/Url.ts
│       └── routes/url.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### Install dependencies

```bash
# Root
npm install

# Client
cd client && npm install

# Server
cd server && npm install
```

### Run locally

```bash
# Start backend
cd server && npm run dev

# Start frontend (in a new terminal)
cd client && npm run dev
```

Frontend runs at `http://localhost:5173`  
Backend runs at `http://localhost:5000`

---

## 🌐 Deployment

- **Frontend**: Vercel
- **Backend**: Render or Vercel Functions

---

## 📄 License

MIT
