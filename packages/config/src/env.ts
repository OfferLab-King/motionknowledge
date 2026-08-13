import {z} from 'zod';

const optionalSecret = z.string().optional().or(z.literal(''));

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@127.0.0.1:54322/postgres'),
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  SUPABASE_JWT_SECRET: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  LLM_API_KEY: optionalSecret,
  LLM_BASE_URL: optionalSecret,
  GOOGLE_TTS_CREDENTIALS_JSON: optionalSecret,
  ELEVENLABS_API_KEY: optionalSecret,
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: optionalSecret,
  S3_REGION: optionalSecret,
  S3_BUCKET: optionalSecret,
  S3_ACCESS_KEY_ID: optionalSecret,
  S3_SECRET_ACCESS_KEY: optionalSecret,
  S3_FORCE_PATH_STYLE: z.string().optional().transform((v) => v !== 'false'),
  HYPERFRAMES_RENDER_IMAGE: z.string().default('motionknowledge-hyperframes:0.7.107'),
  RUN_HYPERFRAMES_SMOKE: z.string().optional().transform((v) => v === '1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  return ServerEnvSchema.parse(input);
}
