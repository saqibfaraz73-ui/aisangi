// Shared Vertex AI authentication using Google Cloud Service Account
// Generates OAuth2 access tokens from GCP_SERVICE_ACCOUNT_JSON secret

const GCP_LOCATION = "us-central1";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount {
  const json = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!json) throw new Error("GCP_SERVICE_ACCOUNT_JSON not configured");
  return JSON.parse(json);
}

function b64url(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64urlStr(str: string): string {
  return b64url(new TextEncoder().encode(str));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryStr = atob(pemContents);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function createSignedJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64urlStr(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    })
  );

  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

// Simple in-memory token cache (lives for duration of edge function cold start)
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const sa = getServiceAccount();
  const jwt = await createSignedJwt(sa);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OAuth2 token error:", err);
    throw new Error(`Failed to get Vertex AI access token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export function getProjectId(): string {
  return getServiceAccount().project_id;
}

export function hasServiceAccount(): boolean {
  const json = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!json) return false;
  try {
    const parsed = JSON.parse(json);
    return !!(parsed.project_id && parsed.client_email && parsed.private_key);
  } catch {
    return false;
  }
}

/**
 * Check if GCP_SERVICE_ACCOUNT_JSON contains a plain Gemini API key (not JSON).
 */
export function getGeminiApiKeyFromEnv(): string | null {
  const val = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!val) return null;
  try {
    JSON.parse(val);
    return null; // It's valid JSON, not a plain API key
  } catch {
    return val; // It's a plain string, treat as API key
  }
}

/**
 * Build a Vertex AI endpoint URL.
 * @param model - Model name (e.g., "gemini-2.5-flash-image", "lyria-002")
 * @param method - API method (default: "generateContent", use "predict" for Lyria)
 */
export function buildVertexUrl(model: string, method = "generateContent"): string {
  const projectId = getProjectId();
  return `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${GCP_LOCATION}/publishers/google/models/${model}:${method}`;
}
