const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const spotifyClientId = Deno.env.get("SPOTIFY_CLIENT_ID");
const spotifyClientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

function assertSpotifyCredentials() {
  if (!spotifyClientId || !spotifyClientSecret) {
    throw new Error("Spotify credentials are not configured in the Supabase environment.");
  }
}

async function getSpotifyAccessToken(): Promise<string> {
  assertSpotifyCredentials();

  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const credentials = btoa(`${spotifyClientId}:${spotifyClientSecret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Spotify token request failed: ${response.status} ${message}`);
  }

  const payload = await response.json();
  cachedAccessToken = payload.access_token as string;
  cachedAccessTokenExpiresAt = Date.now() + ((payload.expires_in as number) - 60) * 1000;

  return cachedAccessToken;
}

async function fetchSpotify(path: string) {
  const accessToken = await getSpotifyAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Spotify API request failed: ${response.status} ${message}`);
  }

  return response.json();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json();
    const action = body.action as "search" | "track" | "album" | "artist";
    const params = (body.params ?? {}) as Record<string, unknown>;

    switch (action) {
      case "search": {
        const query = String(params.query ?? "").trim();
        const limit = Number(params.limit ?? 8);

        if (!query) {
          return new Response(
            JSON.stringify({
              tracks: { items: [] },
              albums: { items: [] },
              artists: { items: [] }
            }),
            { headers: corsHeaders }
          );
        }

        const data = await fetchSpotify(
          `/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=${limit}`
        );
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "track": {
        const id = String(params.id ?? "");
        const data = await fetchSpotify(`/tracks/${encodeURIComponent(id)}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "album": {
        const id = String(params.id ?? "");
        const data = await fetchSpotify(`/albums/${encodeURIComponent(id)}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "artist": {
        const id = String(params.id ?? "");
        const data = await fetchSpotify(`/artists/${encodeURIComponent(id)}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action." }), {
          status: 400,
          headers: corsHeaders
        });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error."
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
