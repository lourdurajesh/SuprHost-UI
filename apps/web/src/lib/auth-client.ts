// The two steps of signing in, as the browser asks for them. Shared by the sign-in popup and the checkout.

export type Login = { mobile: string } | { email: string };

export type CodeResult = { sent: true; testModeCode: string | null } | { sent: false; invalid: boolean; message: string };

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

/** Asks for a one-time code. `website` is the honeypot field: people leave it empty. */
export async function requestCode(login: Login, guard: { website: string; turnstileToken: string | null }): Promise<CodeResult> {
  const byPhone = "mobile" in login;
  const res = await post("/api/auth/code", { ...login, ...guard });
  const body = res ? await res.json().catch(() => ({})) : {};
  if (res?.status === 202) return { sent: true, testModeCode: typeof body.testModeCode === "string" ? body.testModeCode : null };
  if (res?.status === 400) return { sent: false, invalid: true, message: byPhone ? "Enter a valid 10-digit mobile number." : "Enter a valid email address." };
  const fallback = byPhone ? "We couldn’t send the text message just now. Please try again." : "We couldn’t send a code just now. Please try again.";
  const message =
    res?.status === 429 ? "Too many attempts. Please wait a few minutes." : res?.status === 422 && typeof body.message === "string" ? body.message : fallback;
  return { sent: false, invalid: false, message };
}

/** Null when the code was right; otherwise what to tell the guest. */
export async function verifyCode(login: Login, code: string, details: { name?: string; phone?: string; contactEmail?: string } = {}): Promise<string | null> {
  const res = await post("/api/auth/verify", { ...login, code, ...details });
  if (res?.ok) return null;
  return res?.status === 429 ? "Too many attempts. Request a new code in a few minutes." : "That code is invalid or has expired.";
}
