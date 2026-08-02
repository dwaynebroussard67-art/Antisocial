import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameEngine } from "../hooks/useGameEngine";
import { entityRenderPos } from "../game/engine";
import { toWorld, dirAngle3D, COLS, ROWS } from "../game/coords";
import type { LevelTheme } from "../game/themes";
import type { GameEngine } from "../game/engine";
import type { Dir } from "../game/types";
import HUD from "./HUD";
import TouchControls from "./TouchControls";

type EngineRef = React.RefObject<GameEngine>;

function Walls({ engineRef, theme }: { engineRef: EngineRef; theme: LevelTheme }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const cells = useMemo(() => {
    const list: { row: number; col: number }[] = [];
    const g = engineRef.current.grid;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (g[r][c] === "wall") list.push({ row: r, col: c });
    return list;
  }, [engineRef]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    cells.forEach((cell, i) => {
      const { x, z } = toWorld(cell.row, cell.col);
      dummy.position.set(x, 0.5, z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [cells]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cells.length]} castShadow receiveShadow>
      <boxGeometry args={[0.94, 1, 0.94]} />
      <meshStandardMaterial
        color={theme.colors.wall}
        emissive={theme.colors.wallEmissive}
        emissiveIntensity={0.35}
        roughness={0.45}
        metalness={0.15}
      />
    </instancedMesh>
  );
}

function DotsField({ engineRef, color }: { engineRef: EngineRef; color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cells = useMemo(() => {
    const list: { row: number; col: number }[] = [];
    const g = engineRef.current.grid;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (g[r][c] === "dot") list.push({ row: r, col: c });
    return list;
  }, [engineRef]);

  useFrame(() => {
    const g = engineRef.current.grid;
    cells.forEach((cell, i) => {
      const alive = g[cell.row][cell.col] === "dot";
      const { x, z } = toWorld(cell.row, cell.col);
      dummy.position.set(x, 0.28, z);
      dummy.scale.setScalar(alive ? 1 : 0.0001);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(cells.length, 1)]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </instancedMesh>
  );
}

function PelletMesh({
  row,
  col,
  engineRef,
  theme,
}: {
  row: number;
  col: number;
  engineRef: EngineRef;
  theme: LevelTheme;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const alive = engineRef.current.grid[row][col] === "pellet";
    ref.current.visible = alive;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.38 + Math.sin(t * 4) * 0.08;
    ref.current.rotation.y = t * 2;
    ref.current.rotation.x = t;
  });
  const { x, z } = toWorld(row, col);
  return (
    <mesh ref={ref} position={[x, 0.38, z]}>
      <icosahedronGeometry args={[0.23, 0]} />
      <meshStandardMaterial color={theme.colors.pellet} emissive={theme.colors.pellet} emissiveIntensity={1.1} />
    </mesh>
  );
}

function Pellets({ engineRef, theme }: { engineRef: EngineRef; theme: LevelTheme }) {
  const cells = useMemo(() => {
    const list: { row: number; col: number }[] = [];
    const g = engineRef.current.grid;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (g[r][c] === "pellet") list.push({ row: r, col: c });
    return list;
  }, [engineRef]);
  return (
    <>
      {cells.map((cell, i) => (
        <PelletMesh key={i} row={cell.row} col={cell.col} engineRef={engineRef} theme={theme} />
      ))}
    </>
  );
}

function Player3D({ engineRef, theme }: { engineRef: EngineRef; theme: LevelTheme }) {
  const group = useRef<THREE.Group>(null!);
  const mouthRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const now = performance.now();
    const p = engineRef.current.player;
    const pos = entityRenderPos(p, now);
    const { x, z } = toWorld(pos.row, pos.col);
    group.current.position.set(x, 0.42, z);
    const dir = p.dir === "none" ? "right" : p.dir;
    group.current.rotation.y = dirAngle3D(dir);
    const moving = p.dir !== "none" && engineRef.current.status === "playing";
    const mouth = moving ? 0.35 + 0.55 * Math.abs(Math.sin(now / 110)) : 0.15;
    if (mouthRef.current) mouthRef.current.scale.set(1, mouth, mouth);
  });

  return (
    <group ref={group}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial
          color={theme.colors.player}
          emissive={theme.colors.player}
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={mouthRef} position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.24, 0.5, 4]} />
        <meshStandardMaterial color={theme.colors.playerAccent} />
      </mesh>
      {theme.id === "crib" && (
        <>
          <mesh position={[0.18, 0.1, 0.3]}>
            <boxGeometry args={[0.42, 0.13, 0.06]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0, -0.2, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.035, 8, 16]} />
            <meshStandardMaterial color="#f2c14e" metalness={1} roughness={0.25} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Ghost3D({ index, engineRef, theme }: { index: number; engineRef: EngineRef; theme: LevelTheme }) {
  const group = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const sirenRef = useRef<THREE.Mesh>(null!);
  const leftPupil = useRef<THREE.Mesh>(null!);
  const rightPupil = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const now = performance.now();
    const g = engineRef.current.ghosts[index];
    const pos = entityRenderPos(g, now);
    const { x, z } = toWorld(pos.row, pos.col);
    const eaten = g.mode === "eaten";
    group.current.position.set(x, eaten ? 0.3 : 0.42, z);
    if (bodyRef.current) bodyRef.current.visible = !eaten;
    if (sirenRef.current) sirenRef.current.visible = !eaten;

    let color = theme.colors.ghosts[index % 4];
    if (g.mode === "frightened") {
      const flashing = engineRef.current.frightenedUntil - engineRef.current.clock < 1500;
      color =
        flashing && Math.floor(now / 150) % 2 === 0 ? theme.colors.frightenedFlash : theme.colors.frightened;
    }
    if (bodyMatRef.current) {
      bodyMatRef.current.color.set(color);
      bodyMatRef.current.emissive.set(color);
    }
    if (sirenRef.current && theme.id === "crib") {
      const on = Math.floor(now / 220) % 2 === 0;
      const mat = sirenRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(on ? "#ff3030" : "#3070ff");
      mat.emissive.set(on ? "#ff3030" : "#3070ff");
    }

    const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], none: [0, 1] }[g.dir];
    const eyeOff = 0.1;
    const scared = g.mode === "frightened";
    if (leftPupil.current && rightPupil.current) {
      leftPupil.current.position.set(-0.15 + dv[0] * eyeOff * 0.4, 0.05, 0.28 + dv[1] * eyeOff * 0.4);
      rightPupil.current.position.set(0.15 + dv[0] * eyeOff * 0.4, 0.05, 0.28 + dv[1] * eyeOff * 0.4);
      leftPupil.current.visible = !scared && !eaten;
      rightPupil.current.visible = !scared && !eaten;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={bodyRef} castShadow>
        <capsuleGeometry args={[0.34, 0.32, 6, 12]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={theme.colors.ghosts[index % 4]}
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>
      {theme.id === "crib" && (
        <mesh ref={sirenRef} position={[0, 0.42, 0]}>
          <boxGeometry args={[0.22, 0.1, 0.16]} />
          <meshStandardMaterial color="#ff3030" emissive="#ff3030" emissiveIntensity={1.3} />
        </mesh>
      )}
      <mesh position={[-0.15, 0.08, 0.25]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.15, 0.08, 0.25]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={leftPupil}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1a2b6b" />
      </mesh>
      <mesh ref={rightPupil}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1a2b6b" />
      </mesh>
    </group>
  );
}

function CameraRig({ engineRef }: { engineRef: EngineRef }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3());

  useFrame(() => {
    const now = performance.now();
    const p = engineRef.current.player;
    const pos = entityRenderPos(p, now);
    const { x, z } = toWorld(pos.row, pos.col);
    target.current.lerp(new THREE.Vector3(x, 0, z), 0.05);
    desired.current.set(target.current.x * 0.35, 12.5, target.current.z + 8.5);
    camera.position.lerp(desired.current, 0.05);
    camera.lookAt(target.current.x, 0, target.current.z);
  });
  return null;
}

function Scene({ engineRef, theme }: { engineRef: EngineRef; theme: LevelTheme }) {
  return (
    <>
      <color attach="background" args={[theme.colors.bgTo]} />
      <fog attach="fog" args={[theme.colors.bgTo, 15, 32]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 4]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 6, 0]} intensity={0.35} color={theme.colors.hudAccent} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[COLS + 6, ROWS + 6]} />
        <meshStandardMaterial color={theme.colors.floor} roughness={0.9} />
      </mesh>
      <Walls engineRef={engineRef} theme={theme} />
      <DotsField engineRef={engineRef} color={theme.colors.dot} />
      <Pellets engineRef={engineRef} theme={theme} />
      <Player3D engineRef={engineRef} theme={theme} />
      {[0, 1, 2, 3].map((i) => (
        <Ghost3D key={i} index={i} engineRef={engineRef} theme={theme} />
      ))}
      <CameraRig engineRef={engineRef} />
    </>
  );
}

export default function ThreeDLevel({
  theme,
  onExit,
  onCleared,
}: {
  theme: LevelTheme;
  onExit: () => void;
  onCleared?: () => void;
}) {
  const speed = theme.id === "crib" ? 155 : 162;
  const { engineRef, snapshot } = useGameEngine(speed, 192);

  useEffect(() => {
    if (snapshot.status === "levelclear") onCleared?.();
  }, [snapshot.status, onCleared]);

  function handleDir(d: Dir) {
    engineRef.current.setDirection(d);
  }

  return (
    <div
      className="relative h-full w-full"
      style={{ background: `linear-gradient(180deg, ${theme.colors.bgFrom}, ${theme.colors.bgTo})` }}
    >
      <Canvas shadows camera={{ position: [0, 12.5, 9], fov: 48 }}>
        <Scene engineRef={engineRef} theme={theme} />
      </Canvas>
      <HUD
        theme={theme}
        snapshot={snapshot}
        onExit={onExit}
        onRestart={() => engineRef.current.reset()}
        onPause={() => engineRef.current.togglePause()}
      />
      <TouchControls onDirection={handleDir} accent={theme.colors.hudAccent} />
    </div>
  );
}
