import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './connection.js';

const EMPLOYEE_ID = 'ADMIN001';
const NAME = 'Admin';
const EMAIL = 'admin@company.com';
const PASSWORD = 'Admin1234!';

async function seed(): Promise<void> {
  const existing = await db
    .selectFrom('users')
    .select('id')
    .where('employee_id', '=', EMPLOYEE_ID)
    .executeTakeFirst();

  if (existing) {
    console.log(`User ${EMPLOYEE_ID} already exists — skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await db
    .insertInto('users')
    .values({
      employee_id: EMPLOYEE_ID,
      name: NAME,
      email: EMAIL,
      password_hash: passwordHash,
      role: 'ADMIN',
    })
    .execute();

  console.log('✅ Admin user created:');
  console.log(`   Employee ID : ${EMPLOYEE_ID}`);
  console.log(`   Password    : ${PASSWORD}`);
  console.log(`   Role        : ADMIN`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
