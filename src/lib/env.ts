import { z } from "zod";

const core = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().default("./data/strike.db"),
  AI_PROVIDER: z.enum(["groq", "mock"]).optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
  TTS_PROVIDER: z.enum(["browser", "elevenlabs", "google"]).default("browser"),
  GOOGLE_TTS_API_KEY: z.string().optional(),
  GOOGLE_VOICE_EN: z.string().default("en-IN-Chirp3-HD-Aoede"),
  GOOGLE_VOICE_HI: z.string().default("hi-IN-Chirp3-HD-Aoede"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_MODEL: z.string().default("eleven_flash_v2_5"),
  ELEVENLABS_VOICE_EN: z.string().optional(),
  ELEVENLABS_VOICE_HI: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.TTS_PROVIDER === "google" && !v.GOOGLE_TTS_API_KEY) ctx.addIssue({ code: "custom", path: ["GOOGLE_TTS_API_KEY"], message: "is missing" });
  if (v.TTS_PROVIDER === "elevenlabs") for (const k of ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_EN", "ELEVENLABS_VOICE_HI"] as const) if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: "is missing" });
  if (v.AI_PROVIDER === "groq" && !v.GROQ_API_KEY) ctx.addIssue({ code: "custom", path: ["GROQ_API_KEY"], message: "is missing" });
});

const exotel = z.object({
  PUBLIC_BASE_URL: z.string().url(),
  EXOTEL_ACCOUNT_SID: z.string().min(1),
  EXOTEL_API_KEY: z.string().min(1),
  EXOTEL_API_TOKEN: z.string().min(1),
  EXOTEL_API_HOST: z.enum(["api.in.exotel.com", "api.exotel.com"]).default("api.in.exotel.com"),
  EXOTEL_CALLER_ID: z.string().regex(/^\+[1-9]\d{6,14}$/, "must look like +918012345678"),
  EXOTEL_WS_USER: z.string().min(1).default("exotel"),
  EXOTEL_WS_PASSWORD: z.string().min(12, "must be at least 12 characters"),
});

type CoreRaw = z.infer<typeof core>;
export type CoreEnv = Omit<CoreRaw, "AI_PROVIDER"> & { AI_PROVIDER: "groq" | "mock" };
const withProvider = (v: CoreRaw): CoreEnv => ({ ...v, AI_PROVIDER: v.AI_PROVIDER ?? (v.GROQ_API_KEY ? "groq" : "mock") });
export type Env = CoreEnv & z.infer<typeof exotel>; // full env incl. Exotel (used by telephony code)
export type ExotelEnv = z.infer<typeof exotel> & CoreEnv;

const HELP: Record<string, string> = {
  GOOGLE_TTS_API_KEY: "console.cloud.google.com -> APIs & Services -> enable Cloud Text-to-Speech API -> Credentials -> Create API key.",
  ELEVENLABS_API_KEY: "elevenlabs.io -> Developers -> API Keys.",
  ELEVENLABS_VOICE_EN: "elevenlabs.io -> Voices -> pick a voice -> copy its Voice ID (choose a warm English/Indian-English voice).",
  ELEVENLABS_VOICE_HI: "elevenlabs.io -> Voices -> filter language Hindi -> copy its Voice ID. Can be the same as the English one if it is multilingual.",
  GROQ_API_KEY: "Create a free key at console.groq.com -> API Keys, paste it here.",
  PUBLIC_BASE_URL: "The public https address of this app, e.g. https://your-app.up.railway.app",
  EXOTEL_ACCOUNT_SID: "Exotel dashboard -> API credentials -> Account SID",
  EXOTEL_API_KEY: "Exotel dashboard -> API credentials -> API key",
  EXOTEL_API_TOKEN: "Exotel dashboard -> API credentials -> API token",
  EXOTEL_CALLER_ID: "Your Exotel virtual number in international format, e.g. +918012345678",
  EXOTEL_WS_PASSWORD: "Make up a long random password (12+ characters). It protects the call connection.",
};

function fail(issues: z.ZodIssue[]): never {
  const lines = issues.map((i) => {
    const key = String(i.path[0]);
    return ` - ${key}: ${i.message === "Required" ? "is missing" : i.message}.\n${HELP[key] ? `  How to fix: ${HELP[key]}` : ""}`;
  });
  throw new Error("\nSTRIKE.AI cannot start because some settings are missing or wrong.\nOpen the file named .env in the project folder (copy .env.example if you do not have one) and fix:\n\n" + lines.join("\n") + "\n");
}

export function loadCoreEnv(source: NodeJS.ProcessEnv = process.env): CoreEnv {
  const r = core.safeParse(source);
  return r.success ? withProvider(r.data) : fail(r.error.issues);
}

/** Telephony is optional. Returns null when no Exotel or PUBLIC_BASE_URL setting exists; throws if only some are set. */
export function loadExotelEnv(source: NodeJS.ProcessEnv = process.env): ExotelEnv | null {
  const any = Object.keys(source).some((k) => (k.startsWith("EXOTEL_") || k === "PUBLIC_BASE_URL") && source[k]);
  if (!any) return null;
  const r = exotel.safeParse(source);
  if (!r.success) fail(r.error.issues);
  return { ...loadCoreEnv(source), ...r.data };
}

/** Back-compat: everything required (core + Exotel). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const e = loadExotelEnv(source);
  if (!e) return fail(exotel.safeParse({}).error!.issues);
  return e;
}
