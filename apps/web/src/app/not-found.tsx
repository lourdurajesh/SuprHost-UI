import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-h1">This page has checked out</h1>
      <p className="mt-3 text-ink-soft">The page you were looking for doesn’t exist or has moved.</p>
      <Link href="/" className="mt-8 rounded-full bg-brand px-6 py-3 font-medium text-white">
        Back to home
      </Link>
    </div>
  );
}
