import 'dotenv/config';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

const cleanEnv = (val?: string) => val?.trim().replace(/^['"]|['"]$/g, '');
const isProduction = cleanEnv(process.env.NODE_ENV) === 'production' || !!process.env.RENDER;
const trustedOrigins = (process.env.TRUSTED_ORIGINS?.split(',') || []).map(o => o.trim().replace(/^['"]|['"]$/g, ''));

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  trustedOrigins,
  baseURL: cleanEnv(process.env.BETTER_AUTH_URL) || 'http://localhost:3000',
  secret: cleanEnv(process.env.BETTER_AUTH_SECRET) || 'secret',
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      partitioned: isProduction,
      httpOnly: true,
    },
  },
});