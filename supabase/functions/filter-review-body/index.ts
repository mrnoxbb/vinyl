const MAX_REVIEW_BODY = 500;
const blockedPatterns = [/hate speech/i, /violent threat/i];

function sanitizeBody(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, MAX_REVIEW_BODY);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await request.json();
    const rawBody = typeof payload.body === "string" ? payload.body : "";
    const sanitizedBody = sanitizeBody(rawBody);
    const flagged = blockedPatterns.some((pattern) => pattern.test(sanitizedBody));

    return new Response(
      JSON.stringify({
        body: sanitizedBody,
        flagged,
        length: sanitizedBody.length
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
