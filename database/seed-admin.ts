/**
 * Admin Seed Script
 *
 * Creates an admin record for an existing user.
 *
 * Usage:
 *   cd database
 *   npx tsx seed-admin.ts <user-email> [--super]
 *
 * Examples:
 *   npx tsx seed-admin.ts admin@example.com          # Creates a regular admin
 *   npx tsx seed-admin.ts admin@example.com --super   # Creates a super admin
 */

import 'dotenv/config';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const email = process.argv[2];
  const isSuperAdmin = process.argv.includes('--super');

  if (!email) {
    console.error('Usage: npx tsx seed-admin.ts <user-email> [--super]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx seed-admin.ts user@example.com');
    console.error('  npx tsx seed-admin.ts user@example.com --super');
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.error(`\nError: No user found with email "${email}".`);
      console.error('The user must register first before being made an admin.');
      process.exit(1);
    }

    // Check if already an admin
    const existingAdmin = await prisma.admin.findUnique({
      where: { userId: user.id },
    });

    if (existingAdmin) {
      // Update if needed
      if (isSuperAdmin && !existingAdmin.isSuperAdmin) {
        await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { isSuperAdmin: true, isActive: true },
        });
        console.log(`\nUpdated "${user.name || user.email}" to super admin.`);
      } else if (!existingAdmin.isActive) {
        await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { isActive: true },
        });
        console.log(`\nReactivated admin "${user.name || user.email}".`);
      } else {
        console.log(
          `\n"${user.name || user.email}" is already an ${existingAdmin.isSuperAdmin ? 'super ' : ''}admin.`,
        );
      }
      return;
    }

    // Create the admin record
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        isSuperAdmin,
        isActive: true,
      },
    });

    console.log(
      `\nSuccessfully created ${isSuperAdmin ? 'super ' : ''}admin:`,
    );
    console.log(`  User:  ${user.name || '(no name)'} <${user.email}>`);
    console.log(`  Admin ID: ${admin.id}`);
    console.log(`  Super Admin: ${isSuperAdmin}`);
  } catch (error) {
    console.error('\nFailed to seed admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
