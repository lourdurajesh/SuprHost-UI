import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function SignInPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
      <div>
        <h1 className="text-h1">Welcome back</h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          Sign in to see your upcoming and past stays, find your booking details and get in touch with us about a trip.
        </p>
        <ul className="mt-8 space-y-3 text-ink-soft">
          <li>· No password needed: we email you a one-time code</li>
          <li>· Every booking made with your email appears automatically</li>
          <li>· Hosts get a link to the property management system</li>
        </ul>
      </div>
      <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <SignInForm />
      </div>
    </div>
  );
}
