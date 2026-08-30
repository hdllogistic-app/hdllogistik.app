import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, EmployeeDivision } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || '';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const loginId = process.env.INITIAL_OWNER_LOGIN_ID?.trim();
  const password = process.env.INITIAL_OWNER_PASSWORD;
  const name = process.env.INITIAL_OWNER_NAME?.trim();
  const phone = process.env.INITIAL_OWNER_PHONE?.trim();
  const rawEmail = process.env.INITIAL_OWNER_EMAIL?.trim();
  const email = rawEmail && rawEmail.length > 0 ? rawEmail : null;
  const rawJoinDate = process.env.INITIAL_OWNER_JOIN_DATE?.trim();

  // 1. ENV VALIDATION BEFORE ANY DATABASE MUTATION OR QUERY
  if (!loginId) {
    throw new Error('Required environment variable INITIAL_OWNER_LOGIN_ID is missing or empty.');
  }

  if (!password) {
    throw new Error('Required environment variable INITIAL_OWNER_PASSWORD is missing or empty.');
  }

  if (!name) {
    throw new Error('Required environment variable INITIAL_OWNER_NAME is missing or empty.');
  }

  if (!phone) {
    throw new Error('Required environment variable INITIAL_OWNER_PHONE is missing or empty.');
  }

  // 2. PASSWORD SAFETY VALIDATION (Minimum 12 characters)
  if (password.length < 12) {
    throw new Error('INITIAL_OWNER_PASSWORD must be at least 12 characters long for security compliance.');
  }

  // 3. JOIN DATE PARSING & VALIDATION
  let joinDate = new Date();
  if (rawJoinDate && rawJoinDate.length > 0) {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(rawJoinDate);
    if (!isIsoDate) {
      throw new Error('INITIAL_OWNER_JOIN_DATE must be in YYYY-MM-DD format.');
    }
    const parsedDate = new Date(rawJoinDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('INITIAL_OWNER_JOIN_DATE is not a valid date.');
    }
    joinDate = parsedDate;
  }

  // 4. FAIL-SAFE OWNER CHECK (Must not create a second OWNER account)
  const existingOwnerUser = await prisma.user.findFirst({
    where: { role: UserRole.OWNER },
  });

  if (existingOwnerUser) {
    console.log('[Seed] An OWNER account already exists in the system. Skipping initial owner bootstrap.');
    return;
  }

  // 5. CONFLICT CHECKS
  // Check loginId conflict
  const existingLoginUser = await prisma.user.findUnique({
    where: { loginId },
  });

  if (existingLoginUser) {
    throw new Error(`Login ID '${loginId}' is already registered to an existing account. Bootstrap cancelled.`);
  }

  // Check email conflict if email is provided
  if (email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      throw new Error(`Email address '${email}' is already registered to an existing account. Bootstrap cancelled.`);
    }
  }

  // Check employeeCode OWNER001 conflict
  const existingEmployee = await prisma.employee.findUnique({
    where: { employeeCode: 'OWNER001' },
    include: { user: true },
  });

  if (existingEmployee && existingEmployee.user) {
    throw new Error('Employee code OWNER001 is already assigned to another user account. Bootstrap cancelled.');
  }

  // 6. ATOMIC CREATION VIA PRISMA TRANSACTION
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    let employeeId = existingEmployee?.id;

    if (!employeeId) {
      const newEmployee = await tx.employee.create({
        data: {
          employeeCode: 'OWNER001',
          fullName: name,
          phone,
          division: EmployeeDivision.ADMIN,
          dailySalaryRate: 0,
          joinDate,
          active: true,
        },
      });
      employeeId = newEmployee.id;
    }

    await tx.user.create({
      data: {
        loginId,
        email,
        name,
        passwordHash,
        role: UserRole.OWNER,
        employeeId,
        active: true,
      },
    });
  });

  console.log(`[Seed] Successfully bootstrapped initial OWNER account '${loginId}' (Employee: OWNER001).`);
}

main()
  .catch((error) => {
    console.error('[Seed Error] Initial owner bootstrap failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
