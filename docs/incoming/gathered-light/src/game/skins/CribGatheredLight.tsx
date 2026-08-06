import GatheredLight, { type GatheredLightSkinConfig } from "@/game/skins/GatheredLight";

// "Crib" skin — the painterly night forest. Softer, more mythic framing
// for the same exact mechanic.
const cribSkin: GatheredLightSkinConfig = {
  id: "crib",
  name: "The Crib",
  background: "/assets/games/gathered_light/crib/bg-forest.png",
  figure1: "/assets/games/gathered_light/crib/figure-player1.png",
  figure2: "/assets/games/gathered_light/crib/figure-player1.png",
  flame: "/assets/games/gathered_light/common/flame-player1.png",
  player2Filter: "hue-rotate(24deg) saturate(1.2) scaleX(-1)",
};

export default function CribGatheredLight({ onExitToArcade }: { onExitToArcade: () => void }) {
  return <GatheredLight skin={cribSkin} onExitToArcade={onExitToArcade} />;
}
