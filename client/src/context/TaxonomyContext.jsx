import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getTaxonomy } from '../api';

const EMPTY_TAXONOMY = {
  categories: [],
  regions: [],
  dynasties: [],
  terms: [],

};

const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ children }) {
  const [taxonomy, setTaxonomy] = useState(EMPTY_TAXONOMY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTaxonomy();
      if (res.data?.success) {
        setTaxonomy({ ...EMPTY_TAXONOMY, ...res.data.data });
      }
    } catch {
      /* 导航失败时保留空列表，不阻断页面 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ taxonomy, loading, refresh }),
    [taxonomy, loading, refresh]
  );

  return (
    <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  const ctx = useContext(TaxonomyContext);
  if (!ctx) throw new Error('useTaxonomy must be used within TaxonomyProvider');
  return ctx;
}

export default TaxonomyContext;