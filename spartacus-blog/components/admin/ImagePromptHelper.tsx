'use client';

import { useMemo, useState } from 'react';
import { buildImagePrompts } from '@/lib/image-prompts';

/**
 * Brand-consistent image prompts for the post being edited, ready to paste into
 * whichever image generator you use. Copying a prompt also fills the matching
 * alt text into a field, so an image never arrives without one.
 */
export default function ImagePromptHelper({
  title,
  categoryName,
  keywords,
  onUseAltText,
}: {
  title: string;
  categoryName?: string | null;
  keywords?: string[] | null;
  onUseAltText?: (spec: { role: 'featured' | 'body'; altText: string }) => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const specs = useMemo(
    () => buildImagePrompts({ title, categoryName, keywords }),
    [title, categoryName, keywords],
  );

  if (!title.trim()) {
    return (
      <p className="mt-3 rounded border border-dashed border-steel p-4 text-xs text-ash">
        Add a title and the image prompts appear here.
      </p>
    );
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      window.setTimeout(() => setCopied((c) => (c === index ? null : c)), 2000);
    } catch {
      // Clipboard permission denied — the prompt is selectable in the box below.
      setCopied(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {specs.map((spec, index) => (
        <details key={spec.position} className="rounded border border-steel bg-char/40 p-4">
          <summary className="cursor-pointer font-display text-xs uppercase tracking-widest text-gold">
            {spec.label}
          </summary>

          <textarea
            readOnly
            rows={4}
            value={spec.prompt}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-3 w-full resize-y rounded border border-steel bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-ash"
          />

          <p className="mt-2 text-xs text-ash">
            <span className="eyebrow">Alt text</span>
            <br />
            {spec.altText}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(spec.prompt, index)}
              className="btn-ghost !px-3 !py-1.5 !text-[11px]"
            >
              {copied === index ? 'Copied' : 'Copy prompt'}
            </button>
            {onUseAltText && (
              <button
                type="button"
                onClick={() => onUseAltText({ role: spec.role, altText: spec.altText })}
                className="btn-ghost !px-3 !py-1.5 !text-[11px]"
              >
                {spec.role === 'featured' ? 'Use as featured alt text' : 'Add image row with this alt text'}
              </button>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
