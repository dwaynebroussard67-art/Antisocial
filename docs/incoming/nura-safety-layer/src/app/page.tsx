import Link from "next/link";
import { NuraIcon } from "@/components/NuraIcon";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex items-center gap-4">
        <NuraIcon className="h-14 w-14" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Nura</h1>
          <p className="text-sm text-orange-300/80">Aramaic: fire / light — the guardian layer</p>
        </div>
      </div>

      <p className="max-w-2xl text-neutral-300">
        Nura watches <span className="text-orange-300">The Chapel</span> — the public commons of
        Antisocial and Misfit Ministries — to protect the vulnerable, keep the space clean, and
        quietly escalate real crisis to human responders. She is a guardian, not a warden.
      </p>

      <div className="rounded-xl border border-orange-900/40 bg-orange-950/20 p-5 text-sm text-orange-100">
        <p className="font-semibold">The one hard line</p>
        <p className="mt-1 text-orange-200/80">
          Nura never touches Misfit Signal. No read access, no metadata, nothing — enforced at the
          data layer, not by policy. This build&apos;s schema contains no Signal table, and Nura&apos;s
          service layer has no query surface that could reach one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/chapel"
          className="group rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-orange-700"
        >
          <h2 className="text-lg font-semibold text-neutral-100 group-hover:text-orange-300">
            Enter The Chapel →
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Try the public commons demo. Post as different members across Antisocial and Misfit
            Ministries and watch the detection ladder run live.
          </p>
        </Link>
        <Link
          href="/admin/nura"
          className="group rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-orange-700"
        >
          <h2 className="text-lg font-semibold text-neutral-100 group-hover:text-orange-300">
            Guardian Admin →
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Review queue, the append-only log, config tuning, and the quiet-mode master switch.
          </p>
        </Link>
      </div>

      <div className="grid gap-3 text-xs text-neutral-500 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="font-semibold text-neutral-300">Detect &amp; escalate</p>
          <p className="mt-1">LLM nominates a class. Code always decides the consequence.</p>
        </div>
        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="font-semibold text-neutral-300">Nothing destroyed</p>
          <p className="mt-1">Removals are soft, logged, and human-reversible. Always.</p>
        </div>
        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="font-semibold text-neutral-300">Never snitch culture</p>
          <p className="mt-1">Nura carries the weight herself — she never deputizes users.</p>
        </div>
      </div>
    </main>
  );
}
