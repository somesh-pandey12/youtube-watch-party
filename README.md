# 🎬 YouTube Watch Party

Real-time synchronized YouTube watching with room-based access and role-based
permissions (Host / Moderator / Participant). Built with the MERN stack
(MongoDB, Express, React, Node.js) + Socket.IO for real-time sync.

**🔗 Live URL:** https://youtube-watch-party-alpha.vercel.app

> Note: the backend is hosted on Render's free tier, which sleeps after
> inactivity. The first request after idle time may take 30–50 seconds to
> wake up — this is expected and not a bug.

---

## 1. Overview

This project lets multiple users watch a YouTube video together in sync.
When the Host or a Moderator plays, pauses, seeks, or changes the video,
every participant in the room sees the same action in real time, over
WebSockets (Socket.IO).

## 2. Tech Stack

| Layer     | Technology                                    |
|-----------|------------------------------------------------|
| Frontend  | React 18 + Vite + React Router                 |
| Backend   | Node.js + Express                               |
| Real-time | Socket.IO (WebSockets)                          |
| Database  | MongoDB (Atlas) — stores room metadata          |
| Video     | YouTube IFrame Player API                       |
| Deployment| Render (backend) + Vercel (frontend)            |

## 3. Architecture Overview

┌────────────┐        WebSocket (Socket.IO)         ┌──────────────┐
│  Browser A │ ◄───────────────────────────────────►│              │
│  (Host)    │                                       │   Node.js    │
└────────────┘        REST (POST /api/rooms/create)  │   Express    │
────────────────────────────► │   + Socket.IO│
┌────────────┐                                       │   Server     │
│ Browser B  │ ◄────────────────────────────────────►│              │
│(Participant)│                                       └──────┬───────┘
└────────────┘                                               │
(metadata only)
▼
MongoDB Atlas

- Each **room** is an in-memory `Room` object on the server
  (`backend/src/models/Room.js`) holding the participant list, current
  `videoId`, `playState`, and `currentTime`. Live state lives in memory
  because it changes many times per second — a database round-trip for
  every play/pause/seek would add unacceptable latency.
- A `RoomManager` (`backend/src/managers/RoomManager.js`) keeps a `Map` of
  all active rooms on the server.
- When the Host/Moderator plays, pauses, seeks, or changes the video, the
  client emits an event (`play`, `pause`, `seek`, `change_video`) over the
  socket. The server **validates the sender's role first**
  (`backend/src/socket/socketHandler.js`), updates the room's state, then
  broadcasts `sync_state` to everyone in that room (`io.to(roomId).emit(...)`),
  including the sender's own other tabs.
- Every participant's browser applies the same YouTube player state via the
  YouTube IFrame API, so everyone stays in sync within 1–2 seconds.
- Role changes (`assign_role`, `remove_participant`, `transfer_host`) are
  Host-only and are also validated server-side — the frontend disables
  buttons for UX, but the server would reject the event even if the UI
  restriction were bypassed.
- MongoDB stores lightweight **room metadata** (room ID, host username,
  created/last-active timestamps) via the `RoomMeta` model — this is
  persisted history, not the live sync state.

## 4. Role-Based Access Control

| Role        | Assigned by                          | Can do |
|-------------|----------------------------------------|--------|
| **Host**        | Automatic (room creator, or promoted) | Everything: play/pause/seek/change video, assign roles, remove participants, transfer host |
| **Moderator**   | Host                                    | Play/pause/seek/change video |
| **Participant** | Default for joiners                   | Watch only |

The backend is the single source of truth for permissions
(`backend/src/constants/roles.js` + `withPlaybackPermission()` /
`withHostPermission()` checks in `socketHandler.js`).

## 5. WebSocket Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join_room` | Client → Server | `{ roomId, username }` | User joins; server assigns role (Host if room creator, else Participant) |
| `leave_room` | Client → Server | `{}` | User leaves the room |
| `sync_state` | Server → Clients | `{ playState, currentTime, videoId }` | Broadcast current video state to room |
| `play` / `pause` | Client → Server | `{ currentTime }` | Requires Host/Moderator; server broadcasts |
| `seek` | Client → Server | `{ time }` | Requires Host/Moderator; server broadcasts |
| `change_video` | Client → Server | `{ videoId }` | Requires Host/Moderator; server broadcasts |
| `assign_role` | Client → Server | `{ userId, role }` | Host only |
| `remove_participant` | Client → Server | `{ userId }` | Host only |
| `transfer_host` | Client → Server | `{ userId }` | Host only (bonus) |
| `chat_message` | Client ↔ Server | `{ text }` | Bonus text chat |
| `user_joined` / `user_left` | Server → Clients | `{ username, userId, role, participants }` | Participant list update |
| `role_assigned` | Server → Clients | `{ userId, username, role, participants }` | Role changed |
| `participant_removed` | Server → Clients | `{ userId, participants }` | Host removed someone |

## 6. Project Structure

watch-party/
├── backend/
│   ├── server.js                   # entrypoint: Express + Socket.IO + Mongo
│   ├── src/
│   │   ├── constants/roles.js      # role names + permission helpers
│   │   ├── models/Participant.js   # Participant class
│   │   ├── models/Room.js          # Room class (state + logic)
│   │   ├── models/RoomMeta.js      # Mongoose schema for room metadata
│   │   ├── managers/RoomManager.js # holds all active Room instances
│   │   ├── socket/socketHandler.js # all socket.io event wiring + RBAC checks
│   │   └── routes/rooms.js         # POST /api/rooms/create
│   └── .env.example
└── frontend/
├── src/
│   ├── pages/Home.jsx           # landing page — create/join room
│   ├── pages/RoomPage.jsx       # main watch party screen + socket wiring
│   ├── components/YouTubePlayer.jsx   # IFrame API wrapper
│   ├── components/Controls.jsx
│   ├── components/ParticipantsList.jsx
│   ├── components/Chat.jsx
│   ├── utils/youtube.js         # video ID extraction helper
│   └── socket.js                # socket.io-client singleton
└── .env.example

## 7. Run Locally

### Backend
```bash
cd backend
cp .env.example .env
# fill in MONGO_URI in .env (optional but recommended)
npm install
npm run dev
```
Runs on `http://localhost:5000`.

### Frontend
```bash
cd frontend
cp .env.example .env
# VITE_SERVER_URL should point to http://localhost:5000
npm install
npm run dev
```
Runs on `http://localhost:5173`. Open it in two browser tabs (or one normal
+ one incognito window) to test sync — create a room in one tab, join with
the room code in the other.

## 8. Deployment

- **Backend** is deployed on **Render** as a Web Service, root directory
  `backend`, build command `npm install`, start command `npm start`.
- **Frontend** is deployed on **Vercel**, root directory `frontend`, with
  `VITE_SERVER_URL` set to the Render backend URL.
- On Render, `CLIENT_ORIGIN` is set to the Vercel frontend URL so CORS
  allows requests from it.

Full click-by-click deployment steps are documented in **DEPLOY.md**.

## 9. Code Understanding — Key Points

- **Socket.IO** powers all real-time communication: the server listens for
  events like `play`/`pause`/`seek`/`change_video` and re-broadcasts an
  authoritative `sync_state` to the whole room, so every client's player
  converges to the same state.
- **Express** only handles two things: a health check (`/api/health`) and
  room creation (`POST /api/rooms/create`), which generates a short unique
  room code with `nanoid`.
- **React** owns the UI; `RoomPage.jsx` is a controlled component that
  treats the server as the source of truth — it never assumes local state
  is correct and re-syncs whenever a `sync_state` event arrives.
- **Role-based logic** lives entirely on the backend
  (`socketHandler.js` + `roles.js`) — every state-changing socket event is
  wrapped in a permission check (`withPlaybackPermission` /
  `withHostPermission`) before it's applied, so a modified/malicious
  client still cannot bypass RBAC.
- **MongoDB** is optional at the code level (the app runs fully without
  it) but is connected in this deployment to persist room metadata
  (`RoomMeta` model) — see Trade-offs below for why live state isn't in
  MongoDB.

## 10. Trade-offs / Known Limitations

- Room **state** (participants, video, playback position) is in-memory,
  not in MongoDB — restarting the backend clears active rooms and
  participants would need to rejoin. Only room *metadata* is persisted.
  This was a deliberate choice: WebSocket state changes many times per
  second, and routing every play/pause through a database write would add
  latency without real benefit for a same-session watch party.
- Seek sync is driven by an explicit "Seek to (sec)" control rather than
  detecting scrubbing on the native YouTube progress bar, since the
  IFrame API doesn't reliably distinguish a user drag from buffering.
- Single server instance — for horizontal scaling (1,000+ concurrent
  users, 100+ rooms), the next step would be the Socket.IO Redis adapter
  so multiple server instances can share room broadcasts.
- Render's free tier sleeps after inactivity, causing a cold-start delay
  on the first request after idle time.

## 11. Bonus Features Implemented

- ✅ OOP structure: `Room`, `Participant`, `RoomManager` classes
- ✅ Text chat
- ✅ Transfer host
- ✅ Persistent room metadata in MongoDB
- ⬜ Redis pub/sub for multi-instance scaling (documented as a next step above)
- ⬜ Login/authentication (currently just a display name, no accounts)

## 12. Deliverables Checklist

- ✅ Working application — deployed and reachable at the live URL above
- ✅ README with setup instructions + live URL (this file)
- ✅ Architecture overview (Section 3)
- ✅ Code walkthrough readiness (Section 9)
- ⬜ Demo video/screenshots (optional — add if desired)
