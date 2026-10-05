const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');

  if (process.env.ARCHLENS_TLS_INSECURE !== '0') {
    neonConfig.webSocketConstructor = class NeonWs extends ws {
      constructor(url, protocols) {
        super(url, protocols, { rejectUnauthorized: false });
      }
    };
  } else {
    neonConfig.webSocketConstructor = ws;
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    console.log('prisma ok (Neon WSS/443)', rows);
  } catch (e) {
    console.error('prisma fail', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
