import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { arcadeGames } from "./arcade-core";
import { memberTierEnum } from "./member-roles";

/**
 * GAME VARIANTS — one game, a different build of it per tier.
 *
 * D's correction: "the games are not present on the street. The games on the
 * street are gonna be the simplest... just because you're on the street don't
 * mean you don't get to play the game."
 *
 * So a game is no longer a single thing you either can or can't reach. A game
 * is a family, and each tier gets the version of it that belongs to that tier.
 * Pac-Man is the worked example that came with this correction:
 *   street -> The Grind    (2D classic, the simplest build)
 *   block  -> Grind City   (3D)
 *   crib   -> Trap Man     (3D, cops/cash/getaway — adults only)
 *
 * `active` defaults to FALSE. Turning a variant on is a data change, not a
 * deploy — nothing ships live just because its row exists.
 *
 * `minAge` is the server-side age gate. It is checked in lib/arcade/variants.ts
 * on every read, not in the page that happens to render the tile, so no invite
 * path or direct link can route around it.
 */
export const arcadeGameVariants = pgTable(
  "arcade_game_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    gameKey: text("game_key")
      .notNull()
      .references(() => arcadeGames.key, { onDelete: "cascade" }),

    // The tier this build belongs to. NOT a floor — a Crib member sees the
    // Crib build of a game, not four builds of it. See variants.ts.
    tier: memberTierEnum("tier").notNull(),

    // Stable id for this specific build, e.g. "the_grind", "grind_city",
    // "trap_man". What the client loads.
    variantKey: text("variant_key").notNull(),

    // Player-facing name of THIS build. The Street's Pac-Man is called
    // "The Grind"; it is not "Pac-Man (Street)".
    title: text("title").notNull(),

    // Where the built game lives. Null until the bundle is actually built —
    // registry rows are allowed to exist ahead of content.
    assetBundle: text("asset_bundle"),

    blurb: text("blurb"),

    active: boolean("active").notNull().default(false),

    // Null = no age restriction. Set on adult-tier builds.
    minAge: integer("min_age"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One build per game per tier. This is the constraint that makes
    // "which build does this member get" a single unambiguous lookup.
    onePerGamePerTier: uniqueIndex("arcade_game_variants_game_tier_uq").on(t.gameKey, t.tier),
    tierIdx: index("arcade_game_variants_tier_idx").on(t.tier, t.active),
  })
);
