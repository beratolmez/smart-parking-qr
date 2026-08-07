import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL tanımlı değil." }),
  APP_URL: z.url({ error: "APP_URL geçerli bir URL olmalı." }),
  MUNICIPALITY_NAME: z.string().min(1).default("Belediye"),
  UPLOAD_DIR: z.string().min(1).default("./public/uploads"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    "Ortam değişkenleri hatalı:\n" +
      JSON.stringify(z.flattenError(parsed.error).fieldErrors, null, 2),
  );
}

export const config = parsed.data;
