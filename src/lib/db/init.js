import { initializeDatabase } from './index';

// Initialize the database when the application starts
initializeDatabase().catch(console.error);
