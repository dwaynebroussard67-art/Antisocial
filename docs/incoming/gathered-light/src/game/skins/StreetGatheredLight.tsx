import GatheredLight, { type GatheredLightSkinConfig } from "@/game/skins/GatheredLight";

// "Street" skin — a quiet stretch of pavement, faint gold path line.
// Uses the block figures (a plain silhouette reads well against the
// wider, more open street backdrop) with a slightly cooler tint on
// player 2 so the two are easy to tell apart at a glance.
const streetSkin: GatheredLightSkinConfig = {
  id: "street",
  name: "The Street",
  background: "/assets/games/gathered_light/street/bg-path.png",
  figure1: "/assets/games/gathered_light/block/figure-player1.png",
  figure2: "/assets/games/gathered_light/block/figure-player1.png",
  flame: "/assets/games/gathered_light/common/flame-player1.png",
  player2Filter: "hue-rotate(28deg) saturate(1.15) scaleX(-1)",
};

export default function StreetGatheredLight({ onExitToArcade }: { onExitToArcade: () => void }) {
  return <GatheredLight skin={streetSkin} onExitToArcade={onExitToArcade} />;
}
