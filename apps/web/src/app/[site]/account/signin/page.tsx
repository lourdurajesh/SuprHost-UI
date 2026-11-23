import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/sign-in-form";
import { getSite } from "@/lib/pms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function SignInPage({ params }: PageProps<"/[site]/account/signin">) {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
      <Suspense fallback={<Intro phone={false} />}>
        <SignInContent params={params} part="intro" />
      </Suspense>
      <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <Suspense fallback={<SignInForm />}>
          <SignInContent params={params} part="form" />
        </Suspense>
      </div>
    </div>
  );
}

// Mobile number first where the host's PMS can send SMS codes; email everywhere else.
async function SignInContent({ params, part }: Pick<PageProps<"/[site]/account/signin">, "params"> & { part: "intro" | "form" }) {
  const { site: key } = await params;
  const site = await getSite(key);
  const phone = Boolean(site?.features.includes("guest.phone_sign_in"));
  return part === "intro" ? <Intro phone={phone} /> : <SignInForm phoneSignIn={phone} />;
}

function Intro({ phone }: { phone: boolean }) {
  return (
    <div>
      <h1 className="text-h1">Welcome back</h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
        Sign in to see your upcoming and past stays, find your booking details and get in touch with us about a trip.
      </p>
      <ul className="mt-8 space-y-3 text-ink-soft">
        <li>· No password needed: we {phone ? "text" : "email"} you a one-time code</li>
        <li>· Every booking made with your {phone ? "mobile number or email" : "email"} appears automatically</li>
        <li>· Hosts get a link to the property management system</li>
      </ul>
    </div>
  );
}
