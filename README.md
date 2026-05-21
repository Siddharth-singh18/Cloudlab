# ⚡ CloudLab — Collaborative Cloud IDE

A production-grade, full-stack collaborative IDE platform that combines GitHub PRs, VS Code, Replit, Codespaces, and Figma-style collaboration into one unified developer experience.

---

## 📸 What's included

| Feature | Status |
|---|---|
| Monaco Editor (VS Code engine) | ✅ |
| Multi-file project & file tree | ✅ |
| Real-time collaboration (Yjs/CRDT) | ✅ |
| Live cursor & presence | ✅ |
| Inline code review comments | ✅ |
| Suggestion mode (accept/reject) | ✅ |
| Review workspace system | ✅ |
| Browser terminal (xterm.js) | ✅ |
| Live preview pane | ✅ |
| Side-by-side diff view | ✅ |
| Build validation & output | ✅ |
| Review timeline & activity feed | ✅ |
| Review chat | ✅ |
| Git panel (stage/commit/history) | ✅ |
| Search across files | ✅ |
| Extensions panel | ✅ |
| Merge workflow with modal | ✅ |
| Docker container runtime | ✅ |
| BullMQ build queue | ✅ |
| JWT auth (register/login) | ✅ |
| PostgreSQL + Prisma ORM | ✅ |
| Redis + Socket.IO | ✅ |
| Docker Compose deployment | ✅ |
| Nginx reverse proxy | ✅ |

---

## 🗂️ Project structure

```
cloudlab/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── Editor/         # Monaco, DiffView, PreviewPane
│       │   ├── FileTree/       # File explorer
│       │   ├── ReviewPanel/    # Comments, Timeline, Chat
│       │   ├── Sidebar/        # Git, Search, Extensions panels
│       │   ├── Terminal/       # xterm.js terminal
│       │   └── TopBar/         # Nav, presence, view toggles
│       ├── hooks/              # useAuth, useSocket, useFileSystem, useCollaboration
│       ├── lib/                # api.ts, socket.ts, mockData.ts, utils.ts
│       ├── pages/              # LandingPage, ProjectsPage, IDELayout
│       ├── store/              # Zustand global state
│       └── types/              # Shared TypeScript types
│
├── server/                     # Node.js + Express backend
│   ├── prisma/
│   │   └── schema.prisma       # Full DB schema
│   └── src/
│       ├── middleware/         # auth.ts, error.ts
│       ├── routes/             # auth, projects, files, review, comments, git
│       ├── services/
│       │   ├── docker.ts       # Container lifecycle management
│       │   ├── buildQueue.ts   # BullMQ build worker
│       │   └── collaboration.ts # Yjs server-side doc management
│       ├── socket.ts           # Socket.IO handlers
│       └── index.ts            # Server entry point
│
├── docker/
│   └── nginx.conf              # Reverse proxy config
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- (Optional) PostgreSQL & Redis locally

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Set up environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set JWT_SECRET at minimum
```

### 3. Run with Docker Compose (recommended)

```bash
docker compose up -d
```

App will be at: **http://localhost**

### 4. Or run locally (dev mode)

```bash
# Terminal 1 — start Postgres + Redis
docker compose up postgres redis -d

# Terminal 2 — run DB migrations
cd server && npx prisma migrate dev --name init && cd ..

# Terminal 3 — start both servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Prisma Studio: `cd server && npx prisma studio`

---

## 🏗️ Architecture

```
Browser
  │
  ├─ React + Monaco Editor + xterm.js
  ├─ Zustand (state)  ←─── React Query (server cache)
  ├─ Yjs (CRDT) ──────────────────────────────┐
  └─ Socket.IO client                          │
        │                                      │
        ▼                                      ▼
  Nginx (reverse proxy)              y-websocket / Socket.IO
        │
  ┌─────┴──────┐
  │            │
  ▼            ▼
Express API   Socket.IO Server
  │                │
  ├─ REST routes   ├─ Presence (room-based)
  ├─ JWT auth      ├─ Yjs CRDT sync
  ├─ File I/O      ├─ Terminal (node-pty)
  └─ Git (simple-git) └─ Build events
        │
   ┌────┴─────┐
   │          │
   ▼          ▼
PostgreSQL   Redis
(Prisma)    (BullMQ + cache)
                │
                ▼
           Docker containers
           (per project/review)
```

### Key architectural decisions

| Decision | Reasoning |
|---|---|
| **Filesystem storage** (not DB) for file content | Scales independently; compatible with S3 swap |
| **Yjs CRDT** for collab | Conflict-free, works offline, proven at scale |
| **Isolated Docker containers** per project | Security sandboxing, clean runtime |
| **BullMQ** for build jobs | Retry logic, concurrency control, Redis-backed |
| **Socket.IO rooms** for presence/chat | Namespaced by `project:{id}` and `review:{id}` |
| **JWT (httpOnly cookie** in prod) | Stateless auth, XSS-resistant when using cookies |

---

## 📡 API reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET  | `/api/auth/me` | Current user |

### Projects
| Method | Path | Description |
|---|---|---|
| GET    | `/api/projects` | List user's projects |
| POST   | `/api/projects` | Create project |
| GET    | `/api/projects/:id` | Get project |
| PATCH  | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Files
| Method | Path | Description |
|---|---|---|
| GET    | `/api/projects/:id/files` | File tree |
| GET    | `/api/projects/:id/files/content?path=` | Read file |
| PUT    | `/api/projects/:id/files/content` | Save file |
| POST   | `/api/projects/:id/files` | Create file/folder |
| DELETE | `/api/projects/:id/files?path=` | Delete |
| PATCH  | `/api/projects/:id/files` | Rename |

### Review
| Method | Path | Description |
|---|---|---|
| GET  | `/api/projects/:id/reviews` | List reviews |
| POST | `/api/projects/:id/reviews` | Create review session |
| GET  | `/api/reviews/:id` | Get review (with comments + suggestions) |
| POST | `/api/reviews/:id/merge` | Merge review |
| POST | `/api/reviews/:id/close` | Close review |

### Comments & Suggestions
| Method | Path | Description |
|---|---|---|
| GET   | `/api/reviews/:id/comments` | List comments |
| POST  | `/api/reviews/:id/comments` | Add comment |
| PATCH | `/api/comments/:id/resolve` | Resolve comment |
| POST  | `/api/comments/:id/replies` | Add reply |
| GET   | `/api/reviews/:id/suggestions` | List suggestions |
| POST  | `/api/reviews/:id/suggestions` | Add suggestion |
| POST  | `/api/suggestions/:id/accept` | Accept suggestion |
| POST  | `/api/suggestions/:id/reject` | Reject suggestion |

### Git
| Method | Path | Description |
|---|---|---|
| GET  | `/api/projects/:id/git/status` | Git status |
| GET  | `/api/projects/:id/git/branches` | List branches |
| GET  | `/api/projects/:id/git/commits` | Commit history |
| POST | `/api/projects/:id/git/commit` | Commit staged changes |
| POST | `/api/projects/:id/git/branch` | Create branch |
| POST | `/api/projects/:id/git/import` | Import GitHub repo |

---

## 🔌 Socket.IO events

### Client → Server
```ts
room:join(roomId)
room:leave(roomId)
presence:update({ filePath, line, column })
terminal:create(projectId)
terminal:input(data)
terminal:resize({ cols, rows })
build:trigger(projectId)
chat:send({ roomId, body })
yjs:sync({ projectId, filePath, clientStateVector })
yjs:update({ projectId, filePath, update })
yjs:awareness({ projectId, filePath, awareness })
```

### Server → Client
```ts
presence:update(Presence[])
comment:new(Comment)
comment:resolved(commentId)
suggestion:new(Suggestion)
suggestion:update(Suggestion)
build:status(BuildResult)
activity:event(ActivityEvent)
chat:message(ChatMessage)
terminal:data(string)
file:saved({ path, savedBy })
yjs:sync_reply({ update, serverStateVector })
yjs:awareness({ clientId, userId, awareness })
```

---

## 🛣️ Roadmap

- [ ] **Phase 2** — Docker container per project, real `npm run dev` execution
- [ ] **Phase 3** — Wildcard subdomain preview routing (`*.preview.cloudlab.app`)
- [ ] **Phase 4** — GitHub OAuth + import repos
- [ ] **Phase 5** — AI code review assistant (Claude API integration)
- [ ] **Phase 6** — Voice/video rooms (WebRTC)
- [ ] **Phase 7** — Kubernetes + horizontal scaling
- [ ] **Phase 8** — Multi-tenant teams + billing

---

## 🧪 Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Monaco Editor, Yjs, xterm.js, Socket.IO client, Zustand, React Query, Lucide icons

**Backend:** Node.js, Express, TypeScript, Socket.IO, Prisma + PostgreSQL, Redis, BullMQ, node-pty, simple-git, Dockerode, Zod, JWT

**Infrastructure:** Docker, Docker Compose, Nginx, node:20-alpine container images

---

Built with ❤️ as a production-grade SaaS platform scaffold.
