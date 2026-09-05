import type { ImagePromptSpec } from './image-prompts';

/**
 * Higgsfield image generation adapter.
 *
 * IMPORTANT — read before going live: the request/response shape below is the
 * common "submit a job, poll until it is done" pattern. Confirm the exact
 * field names against your Higgsfield account's API docs and adjust
 * `submitJob` / `pollJob` if they differ. Everything else in the app is
 * insulated from that shape by `generateImage()`.
 *
 * Failure is never fatal: if the API key is missing or a generation fails, the
 * caller records a warning and the post still publishes. Publishing must not
 * depend on a third-party image service being up.
 */

const API_BASE = (process.env.HIGGSFIELD_API_URL ?? 'https://api.higgsfield.ai/v1').replace(/\/$/, '');
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

export interface GeneratedImage {
  url: string;
  altText: string;
  role: 'featured' | 'body';
  position: number;
}

export interface GenerationOutcome {
  images: GeneratedImage[];
  warnings: string[];
}

export function isHiggsfieldConfigured(): boolean {
  return Boolean(process.env.HIGGSFIELD_API_KEY);
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
  };
}

async function submitJob(prompt: string): Promise<string> {
  const res = await fetch(`${API_BASE}/image/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      prompt,
      model: process.env.HIGGSFIELD_IMAGE_MODEL ?? 'soul',
      quality: 'high',
      n: 1,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Higgsfield submit failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { id?: string; job_id?: string; url?: string };
  // Some deployments return the image synchronously; honour that.
  if (json.url) return `direct:${json.url}`;
  const id = json.id ?? json.job_id;
  if (!id) throw new Error('Higgsfield submit returned neither a job id nor a url.');
  return id;
}

async function pollJob(jobId: string): Promise<string> {
  if (jobId.startsWith('direct:')) return jobId.slice('direct:'.length);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/image/jobs/${jobId}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Higgsfield poll failed (${res.status}).`);
    }
    const json = (await res.json()) as {
      status?: string;
      results?: { url?: string }[];
      output?: { url?: string }[];
      url?: string;
    };
    const url = json.url ?? json.results?.[0]?.url ?? json.output?.[0]?.url;
    const status = (json.status ?? '').toLowerCase();
    if (url && (!status || ['completed', 'succeeded', 'success', 'done'].includes(status))) {
      return url;
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      throw new Error(`Higgsfield job ${jobId} ended with status "${status}".`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Higgsfield job ${jobId} timed out after ${POLL_TIMEOUT_MS / 1000}s.`);
}

async function generateOne(spec: ImagePromptSpec): Promise<GeneratedImage> {
  const url = await pollJob(await submitJob(spec.prompt));
  return { url, altText: spec.altText, role: spec.role, position: spec.position };
}

/**
 * Generates every prompt in `specs`. Runs sequentially so a rate limit on the
 * Higgsfield side does not take out the whole batch.
 */
export async function generateImages(specs: ImagePromptSpec[]): Promise<GenerationOutcome> {
  if (!isHiggsfieldConfigured()) {
    return {
      images: [],
      warnings: ['HIGGSFIELD_API_KEY is not set — no images were generated. Add them manually.'],
    };
  }

  const images: GeneratedImage[] = [];
  const warnings: string[] = [];
  for (const spec of specs) {
    try {
      images.push(await generateOne(spec));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Image generation failed for the ${spec.role} image: ${message}`);
    }
  }
  return { images, warnings };
}
