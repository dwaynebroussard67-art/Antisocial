import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

/**
 * Server wrapper: the landing page's two explicit buttons land here with
 * ?mode=signup or ?mode=signin, so the form opens on the right foot
 * (HANDOFF-34 — the create/sign-in confusion that locked D's mom out).
 */
export default function SignInPage({ searchParams }: { searchParams?: { mode?: string } }) {
  const initialMode = searchParams?.mode === "signup" ? "signup" : "signin";
  return <SignInForm initialMode={initialMode} />;
}
