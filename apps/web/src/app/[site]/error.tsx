"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";

// Anything a page couldn't do (most often: the booking system didn't answer). The header and footer stay.
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-h1">Something went wrong on our side</h1>
      <p className="mt-3 text-ink-soft">Please try again in a moment. If you were booking, nothing is charged until a booking is confirmed.</p>
      <button type="button" onClick={() => retry()} className={`${buttonClass()} mt-6`}>
        Try again
      </button>
      {error.digest && <p className="mt-6 text-xs text-ink-soft">Reference {error.digest}</p>}
    </div>
  );
}
