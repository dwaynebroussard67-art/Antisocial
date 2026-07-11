"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

/**
 * MOM-PROOFING (HANDOFF-34): D's mom typed her details into sign-in mode
 * with no account yet, got Supabase's raw "Invalid login credentials",
 * kept hitting the button, and got rate-limited. Three changes:
 *  - initialMode comes from the landing page's two explicit buttons
 *  - Supabase errors are translated into human words that say what to DO
 *  - the rate-limit error explains itself instead of looking broken
 *
 * Sign-in for ANTISOCIAL — same accounts as Misfit Ministries. If someone
 * already has a Ministries login, it works here unchanged. Signing up here
 * creates an account that works on the Ministries site too.
 *
 * After a successful sign-in we hit /api/auth/sync once, which links the
 * auth user to their member row (preserving any anonymous Street history)
 * and recomputes tier — that's the moment Street becomes Block.
 */
function friendly(message: string, mode: "signin" | "signup"): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("after ")) {
    return "Too many tries — the door locks itself for a little while when that happens. Nothing is broken and nothing is lost. Wait about 15–60 minutes and try once more.";
  }
  if (mode === "signin" && m.includes("invalid login credentials")) {
    return "That email and password don't match any account. If you're new here, tap \"New here? Create an account\" below — signing in only works after an account exists.";
  }
  if (mode === "signup" && (m.includes("already registered") || m.includes("already exists"))) {
    return "Good news — an account with this email already exists. Tap \"Already a Misfit? Sign in\" below and use your password.";
  }
  if (m.includes("password should be")) {
    return "Password needs to be at least 6 characters.";
  }
  return message;
}

export function SignInForm({ initialMode }: { initialMode: "signin" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setStatus(null);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setStatus(friendly(error.message, "signin"));
          return;
        }
        await fetch("/api/auth/sync", { method: "POST" });
        router.push("/street");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setStatus(friendly(error.message, "signup"));
          return;
        }
        if (data.session) {
          // Email confirmation is off — signed in immediately.
          await fetch("/api/auth/sync", { method: "POST" });
          router.push("/street");
          router.refresh();
        } else {
          // Email confirmation is on — Supabase sent a link.
          setStatus("Check your email for a confirmation link, then come back and sign in.");
          setMode("signin");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.9rem 1rem",
    fontSize: "1rem",
    width: "100%",
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p className="label">MISFIT MINISTRIES</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          One account for Misfit Ministries and Antisocial. Giving an email is
          what opens the Block — nothing here is bought.
        </p>

        <input
          style={field}
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={field}
          type="password"
          placeholder="Password"
          value={password}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

        {status && (
          <p style={{ color: "var(--danger-text)", lineHeight: 1.5 }}>{status}</p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{
            background: "var(--accent-gold)",
            color: "#14100F",
            padding: "0.9rem 1.4rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setStatus(null);
          }}
          style={{
            background: "none",
            border: "1px solid var(--accent-silver)",
            color: "var(--accent-silver)",
            padding: "0.9rem 1.4rem",
            borderRadius: "var(--radius-md)",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {mode === "signin" ? "New here? Create an account" : "Already a Misfit? Sign in"}
        </button>

        <Link href="/street" style={{ color: "var(--text-secondary)", textAlign: "center", textDecoration: "none", marginTop: "0.5rem" }}>
          Stay on the Street — no sign-in needed
        </Link>
      </div>
    </main>
  );
}
