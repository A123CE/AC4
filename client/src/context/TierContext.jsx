import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  detectTierInfo,
  resolveTier,
  readTierOverride,
  writeTierOverride,
  onNetworkChange,
  probeWebGL2,
} from '../lib/deviceTier';

/**
 * 设备档位上下文
 * tier: 'high' | 'standard' | 'smooth'
 * override: 用户手动覆盖，null 表示自动
 */
const TierContext = createContext(null);

export function TierProvider({ children }) {
  const [override, setOverrideState] = useState(readTierOverride);
  const [detectedInfo, setDetectedInfo] = useState(() => detectTierInfo());
  const supports3D = probeWebGL2();

  useEffect(() => onNetworkChange(() => setDetectedInfo(detectTierInfo())), []);


  const setOverride = useCallback((next) => {
    const value = ['high', 'standard', 'smooth'].includes(next) ? next : null;
    setOverrideState(value);
    writeTierOverride(value);
  }, []);

  const tier = resolveTier(override, detectedInfo.tier);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.dataset.tier = tier;
    return () => {
      delete document.documentElement.dataset.tier;
    };
  }, [tier]);

  const reason = supports3D ? detectedInfo.reason : 'no-webgl2';

  const value = useMemo(
    () => ({
      tier,
      detected: detectedInfo.tier,
      detectedTier: detectedInfo.tier,
      override,
      setOverride,
      setTier: setOverride,
      supports3D,
      reason,
    }),
    [tier, detectedInfo.tier, override, setOverride, supports3D, reason]
  );

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used within TierProvider');
  return ctx;
}

export default TierContext;