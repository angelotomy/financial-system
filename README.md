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

# 4. Run dev servers (React + API)
npm run dev

# 5. Open client
http://localhost:3000
```

## Package.json scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Concurrently starts API (Nodemon, port 5000) and React client (port 3000) |
| `npm run server` | API only |
| `npm run client` | React client only |

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

## Implementation Guides

For detailed implementation instructions, refer to:

1. `IMPLEMENTATION_STEPS.md` - Complete step-by-step guide
2. `SETUP_GUIDE.md` - Initial setup instructions
3. `BACKEND_GUIDE.md` - Backend implementation details
4. `FRONTEND_GUIDE.md` - Frontend implementation details
5. `TESTING_GUIDE.md` - Testing instructions
6. `DEPLOYMENT_GUIDE.md` - Deployment steps

## Features

- 🔐 JWT Authentication
- 💰 Transaction Management
- 📊 Real-time Balance Updates
- 👥 User Management
- 📈 Financial Analytics
- 🔍 Transaction Search & Filters
- 📱 Responsive Design
- 🔒 Role-based Access Control

## API Endpoints

### Auth Routes
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user

### Transaction Routes
- GET `/api/transactions` - Get all transactions
- POST `/api/transactions` - Create transaction
- GET `/api/transactions/:id` - Get transaction
- PUT `/api/transactions/:id` - Update transaction
- DELETE `/api/transactions/:id` - Delete transaction

### Account Routes
- GET `/api/accounts` - Get all accounts
- POST `/api/accounts` - Create account
- GET `/api/accounts/:id` - Get account
- PUT `/api/accounts/:id` - Update account
- DELETE `/api/accounts/:id` - Delete account

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

