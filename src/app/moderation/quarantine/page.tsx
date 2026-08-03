import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSiteRole, getSiteRole, AccessDeniedError } from "@/lib/auth/roles";
import { listOpenQuarantine } from "@/lib/moderation/nura";
import { CATEGORIES, type CategoryKey } from "@/lib/moderation/nura-bands";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * THE REVIEW QUEUE — everything Nura held and couldn't decide alone.
 *
 * Oldest first, deliberately: a hold that's been sitting longest is the one
 * most likely to be somebody waiting on an answer they don't know they're
 * waiting for.
 */
export default async function QuarantineQueuePage() {
  let reviewer;
  try {
    reviewer = await requireSiteRole("moderator");
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();
  const isAdmin = (await getSiteRole(reviewer.id)) === "admin";
  const items = await listOpenQuarantine(100);

  return (
    <main>
      <NavBar viewerTier="pit" viewer={viewer} isAdmin={isAdmin} />

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <h1 style={{ fontFamily: "var(--font-display, inherit)", marginBottom: "0.25rem" }}>
          Held for review
        </h1>
        <p style={{ color: "var(--text-muted, #999)", marginBottom: "2rem", maxWidth: "60ch" }}>
          Nura pulled these out of sight because she wasn&apos;t sure. Nobody has seen
          them and the person who wrote them hasn&apos;t been told anything. Read it,
          then decide.
        </p>

        {items.length === 0 ? (
          <p style={{ color: "var(--text-muted, #999)" }}>Nothing is waiting. The queue is clear.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/moderation/quarantine/${item.id}`}
                  style={{
                    display: "block",
                    padding: "1rem 1.15rem",
                    border: "1px solid var(--border, #333)",
                    borderRadius: "var(--radius-lg, 10px)",
                    background: "var(--surface-2, #141414)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      fontSize: "0.78rem",
                      color: "var(--text-muted, #999)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>
                      {item.contentType.replace(/_/g, " ")} · {item.authorName ?? "unnamed member"}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>

                  {/* Truncated on purpose: the queue is for triage, the detail
                      page is where you actually read someone's words. */}
                  <p style={{ margin: "0 0 0.6rem", lineHeight: 1.5 }}>
                    {item.capturedBody.length > 180
                      ? `${item.capturedBody.slice(0, 180)}…`
                      : item.capturedBody}
                  </p>

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.72rem" }}>
                    <span
                      style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        border: "1px solid var(--border, #333)",
                        color: "var(--text-muted, #999)",
                      }}
                    >
                      {item.score}/100
                    </span>
                    {item.categories.map((c) => (
                      <span
                        key={c}
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          border: "1px solid var(--border, #333)",
                          color: "var(--text-muted, #999)",
                        }}
                      >
                        {CATEGORIES[c as CategoryKey]?.label ?? c}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
