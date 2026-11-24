import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safePath } from "@/lib/links";

// Signing in is a popup (components/sign-in). Old links to this address open it over My trips.
export default function SignInPage({ searchParams }: PageProps<"/[site]/account/signin">) {
  return (
    <Suspense fallback={null}>
      <ToPopup searchParams={searchParams} />
    </Suspense>
  );
}

async function ToPopup({ searchParams }: Pick<PageProps<"/[site]/account/signin">, "searchParams">): Promise<null> {
  const next = (await searchParams).next;
  const to = (typeof next === "string" && safePath(next)) || "/account";
  redirect(`/account?signin=1&next=${encodeURIComponent(to)}`);
}
