import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-bone sm:text-4xl">
        That page is not on the mat
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ash">
        The article you were looking for has either moved or was never published. Start from the
        homepage, or go straight to one of the pillars.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to the blog
      </Link>
    </div>
  );
}
