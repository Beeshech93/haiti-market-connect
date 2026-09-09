import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TranslateInput = z.object({
  text: z.string().min(1).max(4000),
  from: z.enum(["fr", "ht"]),
  to: z.enum(["fr", "ht"]),
});

const LANG_LABEL: Record<"fr" | "ht", string> = {
  fr: "French (Français)",
  ht: "Haitian Creole (Kreyòl Ayisyen)",
};

export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data, context }) => {
    // Only admins may use the translation helper.
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError || (!isAdmin && !isSuperAdmin)) {
      throw new Error("Forbidden");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              `You are a professional e-commerce translator. Translate the user text from ${LANG_LABEL[data.from]} to ${LANG_LABEL[data.to]}. ` +
              "Keep the same tone, formatting and line breaks. Do not add comments, quotes or explanations. Return only the translated text.",
          },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[translate] gateway error", response.status, body);
      if (response.status === 429) throw new Error("RateLimited");
      if (response.status === 402) throw new Error("CreditsExhausted");
      throw new Error("TranslationFailed");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const translated = payload.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error("TranslationFailed");

    return { text: translated };
  });
