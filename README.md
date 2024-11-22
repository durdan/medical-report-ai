# Medical Report AI

A Next.js application for generating and managing medical reports using AI, with robust authentication and database integration.

## Features

- 🔐 **Authentication System**
  - NextAuth-based authentication
  - Role-based access control (USER, ADMIN)
  - Custom signup and signin flows
  - Secure password handling

- 📝 **Report Generation**
  - AI-powered medical report creation
  - Specialty-specific report generation
  - Flexible prompt management
  - System and user-defined prompts

- 🗄️ **Database Management**
  - SQLite for development
  - PostgreSQL for production
  - Comprehensive schema
  - Foreign key constraints and indexes

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (development)
- PostgreSQL (production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/medical-report-ai.git
cd medical-report-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration.

4. Run the development server:
```bash
npm run dev
```

### Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables in Vercel
3. Deploy to Vercel:
```bash
vercel
```

## Environment Variables

### Development
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET=your-nextauth-secret
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=development
```

### Production
```env
POSTGRES_URL=your-postgres-connection-string
NEXTAUTH_SECRET=your-nextauth-secret
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.vercel.app
```

## Database Schema

### Users
- id (TEXT PRIMARY KEY)
- name (TEXT)
- email (TEXT UNIQUE)
- password (TEXT)
- role (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Prompts
- id (TEXT PRIMARY KEY)
- name (TEXT)
- prompt_text (TEXT)
- specialty (TEXT)
- is_default (BOOLEAN)
- is_system (BOOLEAN)
- user_id (TEXT FOREIGN KEY)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Reports
- id (TEXT PRIMARY KEY)
- title (TEXT)
- findings (TEXT)
- report (TEXT)
- specialty (TEXT)
- prompt_id (TEXT FOREIGN KEY)
- user_id (TEXT FOREIGN KEY)
- is_archived (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Development

### Database Management
- Development uses SQLite
- Production uses PostgreSQL
- Automatic schema creation
- Default admin user creation
- System prompts initialization

### Authentication
- JWT-based authentication
- Role-based access control
- Secure password handling
- Protected API routes

### Report Generation
- OpenAI GPT integration
- Specialty-specific prompts
- System prompt guidance
- Customizable AI parameters

## Production Deployment

1. Create a new project on Vercel
2. Connect your repository
3. Configure environment variables:
   - `POSTGRES_URL`
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`
4. Deploy the application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
