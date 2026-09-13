import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders, SECURITY_HEADERS_RECORD } from "./lib/security-headers";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Security headers (CSP, nosniff, referrer policy, HSTS…) on every response.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  setResponseHeaders(SECURITY_HEADERS_RECORD);
  const result = await next();
  if (result instanceof Response) {
    applySecurityHeaders(result.headers);
  } else if (
    result != null &&
    typeof result === "object" &&
    "response" in result &&
    (result as { response?: unknown }).response instanceof Response
  ) {
    applySecurityHeaders((result as { response: Response }).response.headers);
  }
  return result;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
    applySecurityHeaders(headers);
    return new Response(renderErrorPage(), { status: 500, headers });
  }
});


// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));

