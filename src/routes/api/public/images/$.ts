import { createFileRoute } from "@tanstack/react-router";

import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/public/images/<path>
 *
 * Serves product photos stored in the private "product-images" bucket so the
 * shop can display them without authentication. Read-only: the path is
 * sanitised and only this one bucket is ever read. Rate limited to brake
 * flooding of the storage proxy.
 */
export const Route = createFileRoute("/api/public/images/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limit = rateLimit(clientKey(request, "images"), 300, 60_000);
        if (!limit.allowed) return tooManyRequests(limit);

        const raw = (params as { _splat?: string })._splat ?? "";
        const path = decodeURIComponent(raw);

        if (!path || path.includes("..") || path.startsWith("/")) {
          return new Response("Not found", { status: 404 });
        }


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("product-images").download(path);

        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(data, {
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
