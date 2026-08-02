# Antisocial Arcade

Tiered maze-chase arcade game for the Antisocial site.

## Versions

- **The Streets**: **The Grind**, classic 2D gameplay.
- **The Block**: **Grind City**, full 3D gameplay.
- **The Crib**: **Trap Man**, the exclusive 3D variant. Police replace the chasers, cash replaces the standard collectibles, and the getaway boost temporarily reverses the chase.

## Integration

Vite + React + TypeScript.

```bash
npm install
npm run build
```

The production build is generated in `dist/`.

## Tier access

This package keeps tier access outside the game itself so Antisocial can enforce membership at the site/router level:

- Streets tier -> `streets`
- Block tier -> `block`
- Crib tier -> `crib`

## Controls

Arrow keys / WASD to move. Space or P to pause. Touch controls appear automatically on mobile.
