import { z } from "zod";

/** Central, validated runtime configuration. Fails fast on misconfiguration. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:8080"),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),
  SESSION_COOKIE_NAME: z.string().default("studio_os_sid"),
  SESSION_TTL_HOURS: z.coerce.number().int().default(168),

  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("change-me-admin"),
  ADMIN_EMAIL: z.string().optional(),

  OLLAMA_BASE_URL: z.string().default("http://studio-os-ollama:11434"),
  LLM_MODEL: z.string().default("llama3.1:8b"),
  EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  EMBEDDING_DIM: z.coerce.number().int().default(768),

  CHUNK_SIZE: z.coerce.number().int().default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().default(150),
  STORAGE_DIR: z.string().default("/data/storage"),
  WATCH_DIR: z.string().default("/data/watch"),
});

export type AppConfig = z.infer<typeof envSchema> & { isProd: boolean };

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = { ...parsed.data, isProd: parsed.data.NODE_ENV === "production" };
  return cached;
}
