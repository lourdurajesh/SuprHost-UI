import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-eyebrow font-medium uppercase text-accent">404</p>
      <h1 className="mt-3 text-h1">This page has checked out</h1>
      <p className="mt-3 text-ink-soft">The page you were looking for doesn’t exist or has moved.</p>
      <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-medium text-white">
        Back to home
      </Link>
    </main>
  );
}
