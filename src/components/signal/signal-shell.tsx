import Link from "next/link";
import styles from "./signal.module.css";

export function SignalShell({
  children,
  title,
  subtitle,
  active,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  active?: "board" | "porch";
}) {
  return (
    <section className={styles.shell}>
      <p className={styles.kicker}>Signal</p>
      <h1 className={styles.title}>{title}</h1>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      <div className={styles.navRow}>
        <Link href="/signal" className={`${styles.navLink} ${active === "board" ? styles.navLinkActive : ""}`}>
          Signal Board
        </Link>
        <Link
          href="/signal/front-porch"
          className={`${styles.navLink} ${active === "porch" ? styles.navLinkActive : ""}`}
        >
          Front Porch
        </Link>
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
