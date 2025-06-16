# Financial System (MERN)

A full-stack financial management system built with the **MERN** stack.

---

## Tech Stack

• **MongoDB** – document database  
• **Express.js** – REST API  
• **React** (Create React App) – web client  
• **Node.js** – runtime  

## Quick Start

```bash
# 1. Clone repository
 git clone <YOUR-REPO-URL>
 cd financial-system

# 2. Install dependencies (root will install shared + concurrently; sub-packages install their own)
 npm install
 cd server && npm install && cd ..
 cd client && npm install && cd ..

# 3. Configure environment
 cp .env.example .env
 # → fill in MONGODB_URI and JWT_SECRET etc.

# 4. Seed sample data (optional)
 npm run seed

# 5. Run dev servers (React + API)
 npm run dev

# 6. Open client
 http://localhost:3000
```

## Package.json scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Concurrently starts API (Nodemon, port 5000) and React client (port 3000) |
| `npm run server` | API only |
| `npm run client` | React client only |
| `npm run seed` | Populate MongoDB with sample users, accounts & transactions |

## Folder Structure

```
financial-system/
├── client/          # React app
├── server/          # Express + Mongo + services
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── scripts/     # seed / generate data
└── README.md
```

## License

MIT © Your Name 