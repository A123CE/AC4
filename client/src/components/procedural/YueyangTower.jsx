import { useMemo } from 'react';
import LayerGroup from './LayerGroup';
import { PALETTE, createSkirtGeometry } from './architectureUtils';

/* ============================================================
 *  岳阳楼 — 程序化复原
 *  三层三檐、四角盔顶的江南名楼。每层出檐深远、翼角起翘,
 *  顶层收为盔顶, 以宝顶收束。建模顺序:
 *  台基 → 三层柱网 → 斗拱 → 三重屋檐 → 盔顶 → 门窗栏杆
 * ============================================================ */

const TIERS = [
  { side: 2.5, h: 1.3, base: 0.4, eaveR: 2.15, innerR: 1.15, roofH: 0.34 },
  { side: 1.9, h: 1.05, base: 1.96, eaveR: 1.72, innerR: 0.9, roofH: 0.3 },
  { side: 1.45, h: 0.95, base: 3.23, eaveR: 1.5, innerR: 0.72, roofH: 0.26 },
];

const HELMET_BASE = 4.18;

export default function YueyangTower({ layers = {}, exploded = false }) {
  const visible = (key) => layers[key] !== false;

  // 三层屋檐 — 四角反宇
  const eaveGeometries = useMemo(
    () =>
      TIERS.map(({ eaveR, innerR, roofH }) =>
        createSkirtGeometry({
          outerRadius: eaveR,
          innerRadius: innerR,
          height: roofH,
          segments: 4,
          curve: 1.7,
          angleOffset: Math.PI / 4,
        })
      ),
    []
  );

  // 盔顶 — 四角攒尖曲面
  const helmetGeometry = useMemo(
    () =>
      createSkirtGeometry({
        outerRadius: 1.5,
        innerRadius: 0.02,
        height: 0.78,
        segments: 4,
        curve: 1.35,
        angleOffset: Math.PI / 4,
      }),
    []
  );

  // 斗拱: 每层四边各 4 攒
  const bracketRows = useMemo(() => {
    const rows = [];
    TIERS.slice(0, 2).forEach(({ side, base, h }, tierIndex) => {
      const half = side / 2 + 0.08;
      const points = [];
      for (let i = 0; i < 4; i++) {
        const t = -side / 2 + 0.28 + (i / 3) * (side - 0.56);
        points.push([t, half], [t, -half], [half, t], [-half, t]);
      }
      rows.push({ tierIndex, y: base + h, points });
    });
    return rows;
  }, []);

  return (
    <group>
      {/* ---------- 台基 ---------- */}
      <LayerGroup visible={visible('platform')} exploded={exploded} offset={-0.32}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[4.1, 0.2, 4.1]} />
          <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 0.18, 3.8]} />
          <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
        </mesh>
        {/* 正面踏跺 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.04 + i * 0.09, 2.12 + (2 - i) * 0.2]}>
            <boxGeometry args={[1.3, 0.09, 0.22]} />
            <meshStandardMaterial color={PALETTE.stone} roughness={0.92} />
          </mesh>
        ))}
        {/* 台基石栏 */}
        {[-1.95, 1.95].map((x) =>
          [-1.95, 1.95].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.55, z]}>
              <boxGeometry args={[0.12, 0.5, 0.12]} />
              <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
            </mesh>
          ))
        )}
      </LayerGroup>

      {/* ---------- 三层柱网与楼身 ---------- */}
      <LayerGroup visible={visible('structure')} exploded={exploded} offset={0.08}>
        {TIERS.map(({ side, h, base }, tierIndex) => {
          const half = side / 2;
          return (
            <group key={tierIndex}>
              {/* 楼身墙体 */}
              <mesh position={[0, base + h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[side, h, side]} />
                <meshStandardMaterial
                  color={tierIndex === 2 ? PALETTE.wallShade : PALETTE.wall}
                  roughness={0.88}
                />
              </mesh>
              {/* 角柱与檐柱 */}
              {[
                [-half, -half], [half, -half], [-half, half], [half, half],
                [0, half], [0, -half], [half, 0], [-half, 0],
              ].map(([x, z], i) => (
                <mesh
                  key={i}
                  position={[x, base + h / 2, z]}
                  castShadow
                >
                  <cylinderGeometry args={[0.055, 0.065, h, 8]} />
                  <meshStandardMaterial color={PALETTE.vermilion} roughness={0.62} />
                </mesh>
              ))}
              {/* 额枋 */}
              {[half, -half].map((z) => (
                <mesh key={`b-${z}`} position={[0, base + h - 0.08, z]}>
                  <boxGeometry args={[side + 0.05, 0.14, 0.12]} />
                  <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.68} />
                </mesh>
              ))}
              {[half, -half].map((x) => (
                <mesh key={`s-${x}`} position={[x, base + h - 0.08, 0]}>
                  <boxGeometry args={[0.12, 0.14, side + 0.05]} />
                  <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.68} />
                </mesh>
              ))}
            </group>
          );
        })}
      </LayerGroup>

      {/* ---------- 斗拱 ---------- */}
      <LayerGroup visible={visible('brackets')} exploded={exploded} offset={0.42}>
        {bracketRows.map(({ tierIndex, y, points }) =>
          points.map(([x, z], i) => (
            <group key={`${tierIndex}-${i}`} position={[x, y - 0.02, z]}>
              <mesh>
                <boxGeometry args={[0.18, 0.1, 0.18]} />
                <meshStandardMaterial color={PALETTE.vermilion} roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.075, 0]}>
                <boxGeometry args={[0.3, 0.06, 0.1]} />
                <meshStandardMaterial color={PALETTE.gold} metalness={0.25} roughness={0.45} />
              </mesh>
            </group>
          ))
        )}
      </LayerGroup>

      {/* ---------- 三重屋檐 + 盔顶 ---------- */}
      <LayerGroup visible={visible('roof')} exploded={exploded} offset={0.98}>
        {TIERS.map(({ base, h }, tierIndex) => (
          <mesh
            key={tierIndex}
            geometry={eaveGeometries[tierIndex]}
            position={[0, base + h, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={PALETTE.gold}
              metalness={0.22}
              roughness={0.58}
              side={2}
            />
          </mesh>
        ))}
        {/* 盔顶 */}
        <mesh geometry={helmetGeometry} position={[0, HELMET_BASE, 0]} castShadow>
          <meshStandardMaterial
            color={PALETTE.gold}
            metalness={0.25}
            roughness={0.54}
            side={2}
          />
        </mesh>
        {/* 盔顶四脊 */}
        {Array.from({ length: 4 }).map((_, k) => {
          const a = (k * Math.PI) / 2 + Math.PI / 4;
          return (
            <mesh
              key={k}
              position={[Math.cos(a) * 0.72, HELMET_BASE + 0.52, Math.sin(a) * 0.72]}
              rotation={[0, -a, 0.72]}
            >
              <boxGeometry args={[0.05, 0.9, 0.05]} />
              <meshStandardMaterial color={PALETTE.goldDark} roughness={0.55} metalness={0.2} />
            </mesh>
          );
        })}
      </LayerGroup>

      {/* ---------- 门窗 / 平座栏杆 / 宝顶 / 灯笼 ---------- */}
      <LayerGroup visible={visible('details')} exploded={exploded} offset={0.64}>
        {/* 一层板门 */}
        <group position={[0, 0.95, 1.27]}>
          <mesh>
            <boxGeometry args={[0.95, 1.05, 0.05]} />
            <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.7} />
          </mesh>
          {[-0.24, 0, 0.24].map((ox) => (
            <mesh key={ox} position={[ox, 0, 0.04]}>
              <boxGeometry args={[0.025, 0.95, 0.02]} />
              <meshStandardMaterial color={PALETTE.goldDark} metalness={0.35} roughness={0.5} />
            </mesh>
          ))}
        </group>

        {/* 二层 / 三层直棂窗 */}
        <group position={[0, 2.5, 0.97]}>
          <mesh>
            <boxGeometry args={[0.72, 0.62, 0.05]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
          </mesh>
          {[-0.22, -0.07, 0.07, 0.22].map((ox) => (
            <mesh key={ox} position={[ox, 0, 0.04]}>
              <boxGeometry args={[0.03, 0.54, 0.02]} />
              <meshStandardMaterial color={PALETTE.woodLight} roughness={0.72} />
            </mesh>
          ))}
        </group>
        <group position={[0, 3.72, 0.74]}>
          <mesh>
            <boxGeometry args={[0.58, 0.56, 0.05]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
          </mesh>
          {[-0.17, 0, 0.17].map((ox) => (
            <mesh key={ox} position={[ox, 0, 0.04]}>
              <boxGeometry args={[0.025, 0.48, 0.02]} />
              <meshStandardMaterial color={PALETTE.woodLight} roughness={0.72} />
            </mesh>
          ))}
        </group>

        {/* 二层 / 三层平座栏杆 */}
        {[
          { y: 1.82, half: 1.28 },
          { y: 3.08, half: 1.02 },
        ].map(({ y, half }, idx) => (
          <group key={idx}>
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[half * 2 + 0.32, 0.06, half * 2 + 0.32]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
            </mesh>
            {[
              [0, half], [0, -half], [half, 0], [-half, 0],
              [half, half], [half, -half], [-half, half], [-half, -half],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, y + 0.15, z]}>
                <boxGeometry args={[0.025, 0.28, 0.025]} />
                <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.72} />
              </mesh>
            ))}
          </group>
        ))}

        {/* 檐角灯笼 */}
        {[
          [1.55, 1.55], [1.55, -1.55], [-1.55, 1.55], [-1.55, -1.55],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 1.5, z]}>
            <mesh>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshStandardMaterial
                color={PALETTE.vermilion}
                emissive="#7a1f14"
                emissiveIntensity={0.45}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.05, 6]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* 宝顶 */}
        <group position={[0, HELMET_BASE + 0.82, 0]}>
          <mesh>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <coneGeometry args={[0.06, 0.28, 8]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      </LayerGroup>
    </group>
  );
}
