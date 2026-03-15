/**
 * Application configuration loaded from environment variables.
 * Uses Zod for validation and type-safe defaults.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  TARGET_REPO: z.string().default('akuligowski9/project-bridge'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  return envSchema.parse(process.env);
}
