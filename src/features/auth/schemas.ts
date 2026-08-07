import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string({ error: "Kullanıcı adı gerekli." })
    .min(1, { error: "Kullanıcı adı gerekli." })
    .max(50, { error: "Kullanıcı adı çok uzun." }),
  password: z
    .string({ error: "Şifre gerekli." })
    .min(1, { error: "Şifre gerekli." })
    .max(200, { error: "Şifre çok uzun." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
