import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { getViewer } from "@/lib/auth/session";
import { AccountForm } from "./account-form";
import styles from "@/components/signal/signal.module.css";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  street: "Street",
  block: "Block",
  crib: "Crib",
  pit: "The Pit",
};

export default async function AccountPage() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <section className={styles.shell}>
        <p className={styles.kicker}>Account</p>
        <h1 className={styles.title}>Who&apos;s there?</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to see your account.
        </p>
      </section>
    );
  }

  const [row] = await db
    .select({
      email: members.email,
      displayName: members.displayName,
      createdAt: members.createdAt,
      tier: memberRoles.tier,
      siteRole: memberRoles.siteRole,
    })
    .from(members)
    .innerJoin(memberRoles, eq(memberRoles.memberId, members.id))
    .where(eq(members.id, viewer.id))
    .limit(1);

  return (
    <section className={styles.shell}>
      <p className={styles.kicker}>Account</p>
      <h1 className={styles.title}>{row?.displayName ?? "No name yet"}</h1>
      <p className={styles.subtitle}>
        Signed in as {row?.email ?? "(no email)"} — this is the account everything you do here belongs to.
      </p>

      <div className={styles.content}>
        <AccountForm initialName={row?.displayName ?? null} />

        <div className={styles.card}>
          <div className={styles.rowBetween}>
            <span className={styles.meta}>Tier</span>
            <span>{TIER_LABEL[row?.tier ?? "street"]}</span>
          </div>
          <div className={styles.rowBetween} style={{ marginTop: 10 }}>
            <span className={styles.meta}>Role</span>
            <span>{row?.siteRole ?? "member"}</span>
          </div>
          <div className={styles.rowBetween} style={{ marginTop: 10 }}>
            <span className={styles.meta}>Member since</span>
            <span>{row?.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</span>
          </div>
        </div>

        <form action="/api/auth/signout" method="post">
          <button type="submit" className={styles.actionBtn}>Sign out</button>
        </form>
      </div>
    </section>
  );
}
