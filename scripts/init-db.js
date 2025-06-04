const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '6432', 10),
  user: process.env.PGUSER || 'mockstagram',
  password: process.env.PGPASSWORD || 'mockstagram',
  database: process.env.PGDATABASE || 'mockstagram',
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'volumes', 'timescaledb', 'init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log('Executing SQL initialization...');
    
    // Execute each statement separately
    for (const statement of statements) {
      try {
        // Skip transaction for continuous aggregates
        if (statement.includes('CREATE MATERIALIZED VIEW') || 
            statement.includes('add_continuous_aggregate_policy')) {
          await client.query('COMMIT'); // Ensure we're not in a transaction
          await client.query(statement);
        } else {
          await client.query(statement);
        }
      } catch (error) {
        console.error('Error executing statement:', error);
        console.error('Statement:', statement);
        throw error;
      }
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb(); 