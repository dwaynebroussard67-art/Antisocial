// Run with: npm run seed
//
// ENV LOADING, AND WHY THE IMPORTS LOOK LIKE THIS:
//
// src/lib/db builds its Postgres client at module-evaluation time from
// process.env.DATABASE_URL. ES module imports are HOISTED — every static
// import is evaluated before any statement in this file runs — so a plain
// `import { db }` at the top would connect before an env loader placed
// above it ever executed. Putting the loader "first" in source order does
// not make it first at runtime.
//
// So the loader is the only static import, and everything that reaches
// lib/db is pulled in with dynamic import() afterwards, once DATABASE_URL
// is actually set. This is what removes the need to `export DATABASE_URL=`
// into the shell before seeding — which matters more than convenience: an
// exported credential lingers in shell history and in the environment of
// every later command in that session.
import { requireDatabaseUrl } from "./load-env";

async function main() {
  requireDatabaseUrl();

  const { seedBadges } = await import("../src/lib/badges/seed-badges");
  const { seedArcadeGames } = await import("../src/lib/arcade/seed-games");
  const { seedEthiopianTrivia } = await import("../src/lib/arcade/trivia/ethiopian-questions");

  await seedBadges();
  await seedArcadeGames();
  await seedEthiopianTrivia();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
