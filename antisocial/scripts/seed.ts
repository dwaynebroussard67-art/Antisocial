// Run with: npx tsx scripts/seed.ts
// (requires DATABASE_URL to be set and `drizzle-kit push` already run)
//
// This is a plain top-level call, not a `require.main === module` guard —
// this project's tsconfig targets ESM ("module": "esnext"), where that CJS
// idiom doesn't reliably apply. Since this file is only ever meant to be
// run directly (nothing imports scripts/seed.ts), an unconditional call is
// simpler and correct.
import { seedBadges } from "../src/lib/badges/seed-badges";
import { seedArcadeGames } from "../src/lib/arcade/seed-games";

async function main() {
  await seedBadges();
  await seedArcadeGames();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
