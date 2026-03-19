// Shared Vertex AI authentication using Google Cloud Service Account
// Generates OAuth2 access tokens from GCP_SERVICE_ACCOUNT_JSON secret

const GCP_LOCATION = "us-central1";
const GEMINI_API_KEY_PREFIX = "AIza";
const PRIVATE_KEY_BEGIN = "-----BEGIN PRIVATE KEY-----";
const PRIVATE_KEY_END = "-----END PRIVATE KEY-----";

interface ServiceAccount {
  type?: string;
  project_id: string;
  client_email: string;
  private_key: string;
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return typeof candidate.project_id === "string"
    && typeof candidate.client_email === "string"
    && typeof candidate.private_key === "string"
    && candidate.private_key.includes("PRIVATE KEY")
    && (candidate.type === undefined || candidate.type === "service_account");
}

function stripCodeFences(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function decodeEscapedContent(value: string): string {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function normalizePrivateKey(value: string): string {
  let normalized = stripCodeFences(value);
  normalized = stripOuterQuotes(normalized);
  normalized = decodeEscapedContent(normalized);
  normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (normalized.includes(PRIVATE_KEY_BEGIN) && normalized.includes(PRIVATE_KEY_END) && !normalized.endsWith("\n")) {
    normalized += "\n";
  }

  return normalized;
}

function normalizeServiceAccount(value: ServiceAccount): ServiceAccount {
  return {
    type: value.type ?? "service_account",
    project_id: stripOuterQuotes(value.project_id),
    client_email: stripOuterQuotes(value.client_email),
    private_key: normalizePrivateKey(value.private_key),
  };
}

function tryParseServiceAccountJson(candidate: string): ServiceAccount | null {
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate);

    if (isServiceAccount(parsed)) {
      return normalizeServiceAccount(parsed);
    }

    if (typeof parsed === "string") {
      return tryParseServiceAccountJson(parsed);
    }
  } catch {
    return null;
  }

  return null;
}

function extractJsonStringField(raw: string, field: string): string | null {
  const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*})`));
  return match?.[1] ?? null;
}

function extractPrivateKeyFromText(raw: string): string | null {
  const directField = extractJsonStringField(raw, "private_key");
  if (directField) {
    return normalizePrivateKey(directField);
  }

  const beginIndex = raw.indexOf(PRIVATE_KEY_BEGIN);
  const endIndex = raw.indexOf(PRIVATE_KEY_END);
  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    return null;
  }

  return normalizePrivateKey(raw.slice(beginIndex, endIndex + PRIVATE_KEY_END.length));
}

function extractServiceAccountFromText(raw: string): ServiceAccount | null {
  const textCandidates = new Set<string>([
    raw,
    stripOuterQuotes(raw),
    decodeEscapedContent(stripOuterQuotes(raw)),
    raw.replace(/\\"/g, '"'),
  ]);

  for (const candidate of textCandidates) {
    const projectId = extractJsonStringField(candidate, "project_id");
    const clientEmail = extractJsonStringField(candidate, "client_email");
    const privateKey = extractPrivateKeyFromText(candidate);

    if (!projectId || !clientEmail || !privateKey) {
      continue;
    }

    const parsed = normalizeServiceAccount({
      type: "service_account",
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    });

    if (isServiceAccount(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseServiceAccountSecret(raw: string | null): ServiceAccount | null {
  if (!raw) return null;

  const base = stripCodeFences(raw.trim());
  const candidates = new Set<string>([
    base,
    stripOuterQuotes(base),
    decodeEscapedContent(stripOuterQuotes(base)),
  ]);

  for (const value of Array.from(candidates)) {
    const firstBrace = value.indexOf("{");
    const lastBrace = value.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidates.add(value.slice(firstBrace, lastBrace + 1));
    }
  }

  for (const candidate of candidates) {
    const parsedJson = tryParseServiceAccountJson(candidate);
    if (parsedJson) return parsedJson;
  }

  for (const candidate of candidates) {
    const parsedText = extractServiceAccountFromText(candidate);
    if (parsedText) return parsedText;
  }

  return null;
}

function getServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  const parsed = parseServiceAccountSecret(raw);
  if (!parsed) throw new Error("GCP_SERVICE_ACCOUNT_JSON is missing or is not valid service account JSON");
  return parsed;
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
    ["sign"],
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
    }),
  );

  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
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
  return parseServiceAccountSecret(Deno.env.get("GCP_SERVICE_ACCOUNT_JSON")) !== null;
}

/**
 * Check if GCP_SERVICE_ACCOUNT_JSON contains a plain Gemini API key (not JSON).
 */
export function getGeminiApiKeyFromEnv(): string | null {
  const val = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!val) return null;

  if (parseServiceAccountSecret(val)) {
    return null;
  }

  const trimmed = stripOuterQuotes(stripCodeFences(val.trim()));
  return trimmed.startsWith(GEMINI_API_KEY_PREFIX) ? trimmed : null;
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
