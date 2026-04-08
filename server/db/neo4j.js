import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'neo4j'
  ),
  {
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 30000,
  }
);

// Test connection on startup
async function testConnection() {
  try {
    const session = driver.session();
    await session.run('MATCH (n) RETURN count(n) as count');
    await session.close();
    console.log('✅ Neo4j connected');
  } catch (err) {
    console.error('❌ Neo4j connection failed:', err.message);
  }
}

testConnection();

export default driver;
