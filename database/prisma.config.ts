import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config();
dotenv.config({ path: '../.env' });
dotenv.config({ path: '../client/.env' });
dotenv.config({ path: '../server/.env' });

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:1234567890@localhost:5432/seed',
  },
});
