import db_operations from './index';

// Initialize the database when the application starts
db_operations.initializeDatabase().catch(console.error);
