import GatheredLight, { type GatheredLightSkinConfig } from "@/game/skins/GatheredLight";

// "Block" skin — indoors, warmer, closer quarters. Same figures as
// street (skins never touch engine logic, only dressing) but the
// background carries a dying-fire glow at the edges.
const blockSkin: GatheredLightSkinConfig = {
  id: "block",
  name: "The Block",
  background: "/assets/games/gathered_light/block/bg-path.png",
  figure1: "/assets/games/gathered_light/block/figure-player1.png",
  figure2: "/assets/games/gathered_light/block/figure-player1.png",
  flame: "/assets/games/gathered_light/common/flame-player1.png",
  player2Filter: "hue-rotate(28deg) saturate(1.15) scaleX(-1)",
};

export default function BlockGatheredLight({ onExitToArcade }: { onExitToArcade: () => void }) {
  return <GatheredLight skin={blockSkin} onExitToArcade={onExitToArcade} />;
}
