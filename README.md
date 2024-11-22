# Medical Report AI Generator

## Overview
A Next.js web application that leverages OpenAI's GPT models to generate and refine medical reports across various specialties. This application helps medical specialists streamline their report writing process using AI assistance.

## Key Features
1. AI-Powered Report Generation
   - Dynamic medical specialty selection
   - Customizable system prompts with real-time preview
   - Advanced report generation with GPT models
   - Interactive report refinement capabilities

2. Intuitive User Interface
   - Clean, modern design with Tailwind CSS
   - Real-time system prompt preview
   - Responsive layout for all devices
   - Clear error handling and loading states

3. Report Management
   - Save and organize generated reports
   - Copy reports to clipboard
   - Edit and refine existing reports
   - Dashboard view for all reports

4. System Prompt Management
   - Specialty-specific prompt templates
   - Full prompt preview and selection
   - Custom prompt creation and editing
   - Default prompt management

## Technical Stack
- Frontend: Next.js 14 (React)
- AI Integration: OpenAI API
- Styling: Tailwind CSS
- State Management: React Hooks
- Database: SQLite (dev) / PostgreSQL (prod)

## Project Structure
```
medical-report-ai/
├── src/
│   ├── app/
│   │   ├── page.js              # Report generation page
│   │   ├── dashboard/
│   │   │   └── page.js          # Reports dashboard
│   │   ├── api/
│   │   │   ├── reports/         # Report-related API routes
│   │   │   └── prompts/         # Prompt-related API routes
│   │   ├── layout.js            # Root layout
│   │   └── globals.css          # Global styles
│   └── lib/
│       ├── openai.js            # OpenAI integration
│       └── constants.js         # App constants
├── public/                      # Static assets
├── data/                        # Data storage
├── reports/                     # Generated reports
└── config/                      # Configuration files
```

## Prerequisites
- Node.js (v18+)
- OpenAI API Key
- npm or yarn
- Git

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/yourusername/medical-report-ai.git
cd medical-report-ai
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Copy `.env.example` to `.env` and configure:
```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
DATABASE_URL="file:./dev.db"

# OpenAI Configuration
AI_MODEL="gpt-3.5-turbo"
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000

# Development vs Production
NODE_ENV=development
```

4. Run the development server
```bash
npm run dev
```

## Features in Detail

### Report Generation
- Select from specialty-specific system prompts
- Enter medical findings in a dedicated text area
- Generate AI-powered medical reports
- Real-time loading states and error handling

### Report Dashboard
- View all generated reports
- Filter by specialty and date
- Sort reports by various criteria
- Quick actions for each report

### System Prompts
- View and select from available prompts
- See full prompt text before generation
- Create and edit custom prompts
- Manage prompt defaults per specialty

## API Endpoints

### Reports
- `POST /api/reports/generate` - Generate new report
- `POST /api/reports/refine` - Refine existing report
- `POST /api/reports/save` - Save report
- `GET /api/reports/list` - List all reports

### System Prompts
- `GET /api/prompts` - List available prompts
- `POST /api/prompts` - Create new prompt
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt

## Development Progress
- [x] Project setup and configuration
- [x] OpenAI integration
- [x] Main UI implementation
- [x] Report generation
- [x] Report refinement
- [x] System prompt management
- [x] Dashboard implementation
- [x] Error handling
- [ ] User authentication
- [ ] Advanced filtering
- [ ] Export functionality
- [ ] Production deployment

## Security Considerations
- Environment variables for sensitive data
- Input validation and sanitization
- Error handling and logging
- Rate limiting for API calls

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
MIT License

## Acknowledgments
- OpenAI for their powerful GPT models
- Next.js team for the amazing framework
- Tailwind CSS for the styling system
