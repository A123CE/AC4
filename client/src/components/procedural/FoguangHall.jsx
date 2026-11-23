import { useMemo } from 'react';
import LayerGroup from './LayerGroup';
import { PALETTE, createCurvedHipGeometry } from './architectureUtils';

/* ============================================================
 *  佛光寺东大殿 — 程序化复原
 *  唐大中十一年 (857) 重建, 面阔七间、进深四间, 单檐庑殿顶,
 *  斗拱雄大、出檐深远, 是中国现存唐代木构殿堂的代表。
 *  建模顺序: 台基 → 柱网 → 额枋 → 斗拱 → 庑殿屋顶 → 门窗装饰
 * ============================================================ */

const PLATFORM_TOP = 0.5;
const COLUMN_HEIGHT = 2.0;
const BEAM_Y = PLATFORM_TOP + COLUMN_HEIGHT + 0.08;
const ROOF_Y = BEAM_Y + 0.46;

// 面阔七间 → 八根柱; 进深四间 → 五根柱
const XS = Array.from({ length: 8 }, (_, i) => -3.15 + i * 0.9);
const ZS = Array.from({ length: 5 }, (_, i) => -1.8 + i * 0.9);
// 明间五间设板门
const DOORS = [1, 2, 3, 4, 5].map((i) => (XS[i] + XS[i + 1]) / 2);

export default function FoguangHall({ layers = {}, exploded = false }) {
  const visible = (key) => layers[key] !== false;

  // 庑殿顶 — 曲面凹坡
  const roofGeometry = useMemo(
    () =>
      createCurvedHipGeometry({
        baseW: 8.7,
        baseD: 6.1,
        ridgeW: 2.6,
        height: 1.85,
        segments: 14,
        curve: 1.5,
      }),
    []
  );

  // 斗拱位置: 柱头铺作 (前后檐各 8) + 补间铺作 (前后檐各 7)
  const bracketPositions = useMemo(() => {
    const positions = [];
    XS.forEach((x) => {
      positions.push([x, 1.8], [x, -1.8]);
    });
    for (let i = 0; i < XS.length - 1; i++) {
      const mid = (XS[i] + XS[i + 1]) / 2;
      positions.push([mid, 1.8], [mid, -1.8]);
    }
    return positions;
  }, []);

  return (
    <group>
      {/* ---------- 台基 ---------- */}
      <LayerGroup visible={visible('platform')} exploded={exploded} offset={-0.34}>
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <boxGeometry args={[7.9, 0.12, 5.3]} />
          <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.4, 0.38, 4.8]} />
          <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
        </mesh>
        {/* 正面踏跺 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.06 + i * 0.11, 2.72 + (2 - i) * 0.22]}>
            <boxGeometry args={[2.3, 0.11, 0.26]} />
            <meshStandardMaterial color={PALETTE.stone} roughness={0.92} />
          </mesh>
        ))}
      </LayerGroup>

      {/* ---------- 柱网 / 墙体 / 额枋 ---------- */}
      <LayerGroup visible={visible('structure')} exploded={exploded} offset={0.1}>
        {/* 后檐墙与两山墙 */}
        <mesh position={[0, PLATFORM_TOP + 0.95, -1.8]}>
          <boxGeometry args={[6.3, 1.9, 0.12]} />
          <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
        </mesh>
        {[-3.15, 3.15].map((x) => (
          <mesh key={x} position={[x, PLATFORM_TOP + 0.95, 0]}>
            <boxGeometry args={[0.12, 1.9, 3.6]} />
            <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
          </mesh>
        ))}

        {/* 四十根檐柱 */}
        {XS.map((x) =>
          ZS.map((z) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, PLATFORM_TOP + COLUMN_HEIGHT / 2, z]}
              castShadow
            >
              <cylinderGeometry args={[0.085, 0.1, COLUMN_HEIGHT, 8]} />
              <meshStandardMaterial color={PALETTE.vermilion} roughness={0.62} />
            </mesh>
          ))
        )}

        {/* 前后檐额枋 */}
        {[1.8, -1.8].map((z) => (
          <mesh key={`beam-${z}`} position={[0, BEAM_Y, z]}>
            <boxGeometry args={[6.7, 0.18, 0.16]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.72} />
          </mesh>
        ))}
        {/* 山面额枋 */}
        {[-3.15, 3.15].map((x) => (
          <mesh key={`side-${x}`} position={[x, BEAM_Y, 0]}>
            <boxGeometry args={[0.16, 0.18, 3.7]} />
            <meshStandardMaterial color={PALETTE.wood} roughness={0.72} />
          </mesh>
        ))}

        {/* 门上方横披墙 */}
        <mesh position={[0, PLATFORM_TOP + 1.78, 1.79]}>
          <boxGeometry args={[6.3, 0.44, 0.1]} />
          <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
        </mesh>
      </LayerGroup>

      {/* ---------- 斗拱 ---------- */}
      <LayerGroup visible={visible('brackets')} exploded={exploded} offset={0.46}>
        {bracketPositions.map(([x, z], i) => (
          <group
            key={i}
            position={[x, BEAM_Y + 0.15, z]}
            rotation={[0, z > 0 ? 0 : Math.PI, 0]}
          >
            {/* 栌斗 */}
            <mesh>
              <boxGeometry args={[0.26, 0.14, 0.26]} />
              <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.66} />
            </mesh>
            {/* 华拱 */}
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[0.62, 0.1, 0.12]} />
              <meshStandardMaterial color={PALETTE.vermilion} roughness={0.6} />
            </mesh>
            {/* 泥道拱 */}
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[0.12, 0.1, 0.56]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.68} />
            </mesh>
            {/* 散斗 */}
            {[-0.24, 0, 0.24].map((ox) => (
              <mesh key={ox} position={[ox, 0.2, 0]}>
                <boxGeometry args={[0.1, 0.07, 0.18]} />
                <meshStandardMaterial
                  color={PALETTE.gold}
                  metalness={0.2}
                  roughness={0.5}
                />
              </mesh>
            ))}
          </group>
        ))}
      </LayerGroup>

      {/* ---------- 庑殿屋顶 ---------- */}
      <LayerGroup visible={visible('roof')} exploded={exploded} offset={1.05}>
        <mesh geometry={roofGeometry} position={[0, ROOF_Y, 0]} castShadow>
          <meshStandardMaterial color={PALETTE.tile} roughness={0.76} side={2} />
        </mesh>
        {/* 正脊 */}
        <mesh position={[0, ROOF_Y + 1.85 + 0.04, 0]}>
          <boxGeometry args={[2.72, 0.16, 0.18]} />
          <meshStandardMaterial color={PALETTE.tileDark} roughness={0.7} />
        </mesh>
        {/* 鸱吻 */}
        {[-1.3, 1.3].map((x) => (
          <group key={x} position={[x, ROOF_Y + 1.98, 0]}>
            <mesh rotation={[0, 0, x > 0 ? 0.35 : -0.35]}>
              <boxGeometry args={[0.14, 0.46, 0.14]} />
              <meshStandardMaterial color={PALETTE.tileDark} roughness={0.66} />
            </mesh>
            <mesh position={[x > 0 ? -0.08 : 0.08, 0.2, 0]}>
              <boxGeometry args={[0.1, 0.2, 0.1]} />
              <meshStandardMaterial color={PALETTE.goldDark} metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        ))}
        {/* 四角垂脊 */}
        {[
          [-4.35, -3.05, 0.72],
          [4.35, -3.05, -0.72],
          [-4.35, 3.05, 0.72],
          [4.35, 3.05, -0.72],
        ].map(([x, z, ry], i) => (
          <mesh
            key={i}
            position={[x * 0.52, ROOF_Y + 0.95, z * 0.52]}
            rotation={[0.62, ry, 0]}
          >
            <boxGeometry args={[0.06, 2.1, 0.06]} />
            <meshStandardMaterial color={PALETTE.tileDark} roughness={0.72} />
          </mesh>
        ))}
      </LayerGroup>

      {/* ---------- 板门与直棂窗 ---------- */}
      <LayerGroup visible={visible('details')} exploded={exploded} offset={0.68}>
        {DOORS.map((x) => (
          <group key={x} position={[x, PLATFORM_TOP + 0.82, 1.8]}>
            <mesh>
              <boxGeometry args={[0.8, 1.55, 0.05]} />
              <meshStandardMaterial color={PALETTE.vermilionDark} roughness={0.7} />
            </mesh>
            {/* 门钉 / 门框 */}
            {[-0.3, 0, 0.3].map((ox) => (
              <mesh key={`v-${ox}`} position={[ox, 0, 0.04]}>
                <boxGeometry args={[0.025, 1.36, 0.02]} />
                <meshStandardMaterial color={PALETTE.goldDark} metalness={0.35} roughness={0.5} />
              </mesh>
            ))}
            {[-0.45, 0, 0.45].map((oy) => (
              <mesh key={`h-${oy}`} position={[0, oy, 0.04]}>
                <boxGeometry args={[0.7, 0.025, 0.02]} />
                <meshStandardMaterial color={PALETTE.goldDark} metalness={0.35} roughness={0.5} />
              </mesh>
            ))}
          </group>
        ))}
        {/* 两尽间直棂窗 */}
        {[-2.7, 2.7].map((x) => (
          <group key={x} position={[x, PLATFORM_TOP + 1.3, 1.8]}>
            <mesh>
              <boxGeometry args={[0.78, 0.62, 0.05]} />
              <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
            </mesh>
            {[-0.24, -0.08, 0.08, 0.24].map((ox) => (
              <mesh key={ox} position={[ox, 0, 0.04]}>
                <boxGeometry args={[0.03, 0.54, 0.02]} />
                <meshStandardMaterial color={PALETTE.woodLight} roughness={0.75} />
              </mesh>
            ))}
          </group>
        ))}
        {/* 台基前石灯 */}
        {[-1.9, 1.9].map((x) => (
          <group key={x} position={[x, 0, 3.05]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 0.36, 6]} />
              <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[0.16, 0.14, 0.16]} />
              <meshStandardMaterial color={PALETTE.stone} roughness={0.88} />
            </mesh>
          </group>
        ))}
      </LayerGroup>
    </group>
  );
}
