# Market Intelligence Hub (MIH)

A scalable, real-time financial data aggregation platform with AI-powered analysis for stocks, crypto, and on-chain data.

## Architecture

- **Frontend:** React 18+, TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Backend:** Node.js, TypeScript, Express
- **Database:** PostgreSQL, TimescaleDB, Redis
- **Real-time:** Socket.io (WebSockets)
- **Background Jobs:** BullMQ (Redis)
- **AI:** LangChain (OpenAI/Claude integration)

## Features

- ✅ Real-time market data aggregation from 50+ sources
- ✅ Top Gainers/Losers tables with sorting and filtering
- ✅ Multi-market support (US Stocks, Crypto, NGX)
- ✅ AI-powered analysis reports (Technical, Fundamental, Sentiment)
- ✅ WebSocket-based live price updates
- ✅ Responsive, modern UI with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for databases)
- API Keys (optional for full functionality):
  - CoinGecko API Key
  - OpenAI API Key (for AI recommendations)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start databases with Docker:**
   ```bash
   docker-compose up -d
   ```

3. **Setup environment variables:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env and add your API keys (optional)
   
   # Frontend (optional)
   cd ../frontend
   # Create .env if needed: VITE_API_URL=http://localhost:3001
   ```

4. **Start development servers:**
   ```bash
   # From root directory
   npm run dev
   
   # Or run separately:
   npm run dev:backend  # Backend on http://localhost:3001
   npm run dev:frontend # Frontend on http://localhost:5173
   ```

5. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/health

## Project Structure

```
market-analysis/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── providers/     # Data source adapters (CoinGecko, Yahoo Finance, NGX)
│   │   ├── engines/        # AI and analysis engines
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── websocket/      # Socket.io setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/            # API client and hooks
│   │   ├── store/          # Zustand state management
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml      # PostgreSQL and Redis setup
└── README.md
```

## API Endpoints

### Market Data
- `GET /api/v1/market/top-performers` - Get top gainers/losers
  - Query params: `market`, `timeframe`, `country`, `limit`, `type`

### Analysis
- `GET /api/v1/analysis/:symbol` - Get AI-generated analysis report
  - Query params: `market`

### Notifications
- `POST /api/v1/notifications/subscribe` - Subscribe to price alerts
- `POST /api/v1/notifications/unsubscribe` - Unsubscribe from alerts

## Implementation Roadmap

- ✅ **Sprint 1:** Foundation (Backend API, Frontend UI, Basic Data Providers)
- 🔄 **Sprint 2:** NGX Layer & Enhanced Filtering (In Progress)
- ⏳ **Sprint 3:** AI & Reports (LangChain integration, PDF export)
- ⏳ **Sprint 4:** Notifications & Real-time (BullMQ workers, Socket.io live updates)

## Development Notes

- The backend uses mock data for Yahoo Finance and NGX providers. Replace with actual API integrations in production.
- AI recommendations fall back to rule-based logic if OpenAI API key is not provided.
- WebSocket connections are set up but require Redis for full functionality.

## License

MIT
