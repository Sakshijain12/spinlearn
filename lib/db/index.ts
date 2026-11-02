// Database initialization (currently using in-memory storage via state)
// Ready to integrate with PostgreSQL + Drizzle ORM in production

interface DatabaseConfig {
  isInitialized: boolean;
}

const config: DatabaseConfig = {
  isInitialized: false,
};

export function initializeDatabase() {
  if (config.isInitialized) return;
  config.isInitialized = true;
  console.log('Database ready (in-memory mode for demo)');
}

export function getDatabase() {
  if (!config.isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return config;
}
