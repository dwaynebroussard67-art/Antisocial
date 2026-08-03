import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSiteRole, getSiteRole, AccessDeniedError } from "@/lib/auth/roles";
import { getQuarantine } from "@/lib/moderation/nura";
import { CATEGORIES, type CategoryKey } from "@/lib/moderation/nura-bands";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

/**
 * ONE HELD ITEM — the page the staff alert email links to.
 *
 * Shows the captured body (a copy kept precisely so a review has something
 * to read even if the source row was removed), what Nura scored it, and why.
 */
export default async function QuarantineDetailPage({ params }: { params: { id: string } }) {
  let reviewer;
  try {
    reviewer = await requireSiteRole("moderator");
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();
  const isAdmin = (await getSiteRole(reviewer.id)) === "admin";
  const item = await getQuarantine(params.id);
  if (!item) notFound();

  const resolved = item.status !== "quarantined";

  return (
    <main>
      <NavBar viewerTier="pit" viewer={viewer} isAdmin={isAdmin} />

      <section style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <Link
          href="/moderation/quarantine"
          style={{ fontSize: "0.82rem", color: "var(--text-muted, #999)" }}
        >
          ← Back to the queue
        </Link>

        <h1 style={{ margin: "1rem 0 0.4rem" }}>
          {item.contentType.replace(/_/g, " ")}
        </h1>
        <p style={{ color: "var(--text-muted, #999)", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
          {item.authorName ?? item.authorEmail ?? "unnamed member"} ·{" "}
          {new Date(item.createdAt).toLocaleString()}
        </p>

        <blockquote
          style={{
            margin: "0 0 1.5rem",
            padding: "1.1rem 1.25rem",
            borderLeft: "3px solid var(--accent-gold, #d4af37)",
            background: "var(--surface-2, #141414)",
            borderRadius: "0 var(--radius-lg, 10px) var(--radius-lg, 10px) 0",
            whiteSpace: "pre-wrap",
            lineHeight: 1.65,
          }}
        >
          {item.capturedBody}
        </blockquote>

        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            padding: "1rem 1.15rem",
            border: "1px solid var(--border, #333)",
            borderRadius: "var(--radius-lg, 10px)",
            marginBottom: "1.75rem",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <strong>Score:</strong> {item.score}/100
          </div>
          <div>
            <strong>Categories:</strong>{" "}
            {item.categories.length
              ? item.categories.map((c) => CATEGORIES[c as CategoryKey]?.label ?? c).join(", ")
              : "none"}
          </div>
          <details>
            <summary style={{ cursor: "pointer", color: "var(--text-muted, #999)" }}>
              Why Nura flagged it
            </summary>
            <pre
              style={{
                marginTop: "0.6rem",
                padding: "0.75rem",
                background: "var(--surface-1, #0f0f0f)",
                borderRadius: "var(--radius-lg, 10px)",
                overflowX: "auto",
                fontSize: "0.78rem",
              }}
            >
              {JSON.stringify(item.rationale, null, 2)}
            </pre>
          </details>
        </div>

        {resolved ? (
          <p style={{ color: "var(--text-muted, #999)" }}>
            Already {item.status} on{" "}
            {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "an earlier date"}.
            {item.reviewNotes ? ` Notes: ${item.reviewNotes}` : ""}
          </p>
        ) : (
          <ReviewForm quarantineId={item.id} />
        )}
      </section>
    </main>
  );
}
