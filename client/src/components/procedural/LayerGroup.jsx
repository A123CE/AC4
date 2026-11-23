import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 可拆解图层组
 * - visible=false 时整层卸载
 * - 拆解模式下向 offset 指定的纵向位移平滑过渡, 形成"营造拆解"层叠效果
 */
export default function LayerGroup({ visible = true, exploded = false, offset = 0, children }) {
  const ref = useRef();

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = exploded ? offset : 0;
    ref.current.position.y += (target - ref.current.position.y) * Math.min(1, delta * 7);
  });

  if (!visible) return null;
  return <group ref={ref}>{children}</group>;
}
