import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { isAuthenticated } from '@/lib/auth';
import { publishPost } from '@/lib/publish';

/**
 * POST /api/publish  { "postId": "<uuid>" }
 *
 * The publish pipeline as an endpoint, so it can also be triggered from
 * outside the admin UI (a Make.com scenario, a cron job, a content script).
 *
 * Auth: either a live admin session cookie, or the shared
 * `x-publish-token` header matching PUBLISH_API_TOKEN.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenMatches(provided: string | null): boolean {
  const expected = process.env.PUBLISH_API_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const authorised = tokenMatches(request.headers.get('x-publish-token')) || (await isAuthenticated());
  if (!authorised) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let postId: string | undefined;
  try {
    ({ postId } = (await request.json()) as { postId?: string });
  } catch {
    return NextResponse.json({ error: 'Body must be JSON: { "postId": "…" }' }, { status: 400 });
  }
  if (!postId) {
    return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
  }

  try {
    const result = await publishPost(postId);
    return NextResponse.json(result, { status: result.published ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
