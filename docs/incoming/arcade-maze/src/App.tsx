import { useCallback, useState } from "react";
import LevelSelect from "./components/LevelSelect";
import ClassicLevel from "./components/ClassicLevel";
import ThreeDLevel from "./components/ThreeDLevel";
import { THEMES, type LevelId } from "./game/themes";

type Screen = "menu" | LevelId;

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [cleared, setCleared] = useState<Record<LevelId, boolean>>({
    streets: false,
    block: false,
    crib: false,
  });

  const goMenu = useCallback(() => setScreen("menu"), []);

  const markCleared = useCallback((id: LevelId) => {
    setCleared((current) => ({ ...current, [id]: true }));
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      {screen === "menu" && <LevelSelect onSelect={setScreen} cleared={cleared} />}
      {screen === "streets" && (
        <ClassicLevel theme={THEMES.streets} onExit={goMenu} onCleared={() => markCleared("streets")} />
      )}
      {screen === "block" && (
        <ThreeDLevel theme={THEMES.block} onExit={goMenu} onCleared={() => markCleared("block")} />
      )}
      {screen === "crib" && (
        <ThreeDLevel theme={THEMES.crib} onExit={goMenu} onCleared={() => markCleared("crib")} />
      )}
    </main>
  );
}
