const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const id = uuidv4();
  const email = 'agabaenwerejeffrey@gmail.com';
  const passwordHash = 'Jeffreyisadmin';
  
  try {
    const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length > 0) {
       console.log('User already exists, upgrading to super_admin...');
       await client.query('UPDATE users SET role = $1, "passwordHash" = $2, "adminScope" = $3 WHERE email = $4', ['admin', passwordHash, 'super_admin', email]);
    } else {
       console.log('Creating new admin user...');
       await client.query(
         'INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, "adminScope", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
         [id, email, passwordHash, 'eDrive', 'Admin', 'admin', 'super_admin']
       );
    }
    console.log('✅ Admin user ready!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${passwordHash}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createAdmin();
