import { useMemo } from 'react';
import LayerGroup from './LayerGroup';
import { PALETTE, createSkirtGeometry } from './architectureUtils';

/* ============================================================
 *  应县木塔 (佛宫寺释迦塔) — 程序化复原
 *  八角五层楼阁式木塔, 每层出檐、平座、柱网与斗拱依次叠置,
 *  塔刹以金饰收顶。建模顺序遵循真实荷载路径:
 *  台基 → 柱网 → 斗拱 → 屋檐 → 平座栏杆 → 塔刹
 * ============================================================ */

const STORIES = [
  { r: 1.5, h: 1.0 },
  { r: 1.34, h: 0.92 },
  { r: 1.2, h: 0.86 },
  { r: 1.06, h: 0.82 },
  { r: 0.93, h: 0.78 },
];

const GAP = 0.06;

/** 逐层计算柱脚标高 */
const LEVELS = (() => {
  const levels = [];
  let base = 0.32;
  STORIES.forEach((story) => {
    levels.push({ ...story, base });
    base += story.h + GAP;
  });
  return levels;
})();

const TOP = LEVELS[LEVELS.length - 1].base + LEVELS[LEVELS.length - 1].h;

export default function YingxianPagoda({ layers = {}, exploded = false }) {
  const visible = (key) => layers[key] !== false;

  // 每层屋檐裙沿 — 缓曲反宇
  const eaveGeometries = useMemo(
    () =>
      LEVELS.map(({ r }) =>
        createSkirtGeometry({
          outerRadius: r + 0.58,
          innerRadius: Math.max(r - 0.04, 0.1),
          height: 0.26,
          segments: 8,
          curve: 1.75,
        })
      ),
    []
  );

  // 塔顶大屋檐
  const topEaveGeometry = useMemo(
    () =>
      createSkirtGeometry({
        outerRadius: 1.3,
        innerRadius: 0.04,
        height: 0.62,
        segments: 8,
        curve: 1.5,
      }),
    []
  );

  return (
    <group>
      {/* ---------- 台基 ---------- */}
      <LayerGroup visible={visible('platform')} exploded={exploded} offset={-0.32}>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[2.02, 2.14, 0.22, 8]} />
          <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[1.82, 1.94, 0.1, 8]} />
          <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
        </mesh>
        {/* 月台踏跺 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.05 + i * 0.045, 2.18 + (2 - i) * 0.16]}>
            <boxGeometry args={[1.25, 0.09, 0.24]} />
            <meshStandardMaterial color={PALETTE.stone} roughness={0.92} />
          </mesh>
        ))}
      </LayerGroup>

      {/* ---------- 柱网与塔身 ---------- */}
      <LayerGroup visible={visible('structure')} exploded={exploded} offset={0.08}>
        {LEVELS.map(({ r, h, base }, levelIndex) => (
          <group key={levelIndex}>
            {/* 塔身墙体 */}
            <mesh position={[0, base + h / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[r, r, h, 8]} />
              <meshStandardMaterial
                color={levelIndex % 2 === 0 ? PALETTE.wall : PALETTE.wallShade}
                roughness={0.86}
              />
            </mesh>
            {/* 檐下暗红木枋 */}
            <mesh position={[0, base + h - 0.1, 0]}>
              <cylinderGeometry args={[r + 0.035, r + 0.035, 0.14, 8]} />
              <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.7} />
            </mesh>
            {/* 八角柱 */}
            {Array.from({ length: 8 }).map((_, k) => {
              const a = (k * Math.PI) / 4;
              return (
                <mesh
                  key={k}
                  position={[Math.cos(a) * r * 0.985, base + h / 2, Math.sin(a) * r * 0.985]}
                  castShadow
                >
                  <cylinderGeometry args={[0.045, 0.052, h * 0.98, 6]} />
                  <meshStandardMaterial color={PALETTE.vermilion} roughness={0.62} />
                </mesh>
              );
            })}
          </group>
        ))}
      </LayerGroup>

      {/* ---------- 斗拱 ---------- */}
      <LayerGroup visible={visible('brackets')} exploded={exploded} offset={0.4}>
        {LEVELS.map(({ r, h, base }, levelIndex) =>
          Array.from({ length: 16 }).map((_, k) => {
            const a = (k * Math.PI) / 8;
            const radius = r + 0.1;
            return (
              <group
                key={`${levelIndex}-${k}`}
                position={[Math.cos(a) * radius, base + h - 0.02, Math.sin(a) * radius]}
                rotation={[0, -a, 0]}
              >
                <mesh>
                  <boxGeometry args={[0.16, 0.1, 0.16]} />
                  <meshStandardMaterial color={PALETTE.vermilion} roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.08, 0]}>
                  <boxGeometry args={[0.24, 0.06, 0.1]} />
                  <meshStandardMaterial color={PALETTE.gold} roughness={0.45} metalness={0.25} />
                </mesh>
              </group>
            );
          })
        )}
      </LayerGroup>

      {/* ---------- 屋顶与檐口 ---------- */}
      <LayerGroup visible={visible('roof')} exploded={exploded} offset={0.95}>
        {LEVELS.map(({ h, base }, levelIndex) => (
          <mesh
            key={levelIndex}
            geometry={eaveGeometries[levelIndex]}
            position={[0, base + h, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={levelIndex === 4 ? PALETTE.tileDark : PALETTE.tile}
              roughness={0.78}
              side={2}
            />
          </mesh>
        ))}
        {/* 塔顶攒尖大屋檐 */}
        <mesh geometry={topEaveGeometry} position={[0, TOP + 0.02, 0]} castShadow>
          <meshStandardMaterial color={PALETTE.tileDark} roughness={0.74} side={2} />
        </mesh>
        {/* 攒尖顶屋脊 */}
        {Array.from({ length: 8 }).map((_, k) => {
          const a = (k * Math.PI) / 4;
          return (
            <mesh
              key={k}
              position={[Math.cos(a) * 0.62, TOP + 0.34, Math.sin(a) * 0.62]}
              rotation={[0, -a, 0.62]}
            >
              <boxGeometry args={[0.05, 0.62, 0.05]} />
              <meshStandardMaterial color={PALETTE.tileDark} roughness={0.7} />
            </mesh>
          );
        })}
      </LayerGroup>

      {/* ---------- 平座栏杆 / 塔刹 / 匾额 ---------- */}
      <LayerGroup visible={visible('details')} exploded={exploded} offset={0.62}>
        {LEVELS.map(({ r, h, base }, levelIndex) => (
          <group key={levelIndex}>
            {/* 平座楼板 */}
            <mesh position={[0, base - 0.03, 0]}>
              <cylinderGeometry args={[r + 0.28, r + 0.28, 0.06, 8]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
            </mesh>
            {/* 栏杆立柱 */}
            {Array.from({ length: 8 }).map((_, k) => {
              const a = (k * Math.PI) / 4 + Math.PI / 8;
              const radius = r + 0.28;
              return (
                <mesh
                  key={k}
                  position={[Math.cos(a) * radius, base + 0.13, Math.sin(a) * radius]}
                >
                  <cylinderGeometry args={[0.018, 0.018, 0.26, 5]} />
                  <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.7} />
                </mesh>
              );
            })}
            {/* 檐角风铃 */}
            {Array.from({ length: 8 }).map((_, k) => {
              const a = (k * Math.PI) / 4;
              const radius = r + 0.52;
              return (
                <mesh
                  key={`bell-${k}`}
                  position={[Math.cos(a) * radius, base + h - 0.12, Math.sin(a) * radius]}
                >
                  <sphereGeometry args={[0.035, 8, 6]} />
                  <meshStandardMaterial color={PALETTE.gold} metalness={0.4} roughness={0.4} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* 一层匾额 */}
        <mesh position={[0, LEVELS[0].base + LEVELS[0].h * 0.74, LEVELS[0].r * 0.925 + 0.03]}>
          <boxGeometry args={[0.34, 0.17, 0.03]} />
          <meshStandardMaterial color={PALETTE.goldDark} metalness={0.35} roughness={0.42} />
        </mesh>

        {/* 塔刹 */}
        <group position={[0, TOP + 0.6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.3, 0.1, 8]} />
            <meshStandardMaterial color={PALETTE.goldDark} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.15, 12, 10]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.05, 0.09, 0.26, 8]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.4} roughness={0.38} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.5 + i * 0.09, 0]}>
              <torusGeometry args={[0.09 - i * 0.018, 0.015, 6, 16]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.86, 0]}>
            <coneGeometry args={[0.055, 0.3, 8]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      </LayerGroup>
    </group>
  );
}
