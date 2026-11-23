import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  addCollection,
  removeCollection,
  getCollections,
  updateCollectionNote,
} from '../api';
import guestSession from '../lib/guestSession';

/**
 * 全局收藏态
 * - 登录用户：与服务端同步，乐观更新 + 失败回滚
 * - 游客：暂存到本机 GuestSession，登录后由 T-S2-01 合并
 */
const CollectionsContext = createContext(null);

function buildDetails(items) {
  return new Map((items || []).map((item) => [item.palace_id, item]));
}

export function CollectionsProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [collections, setCollections] = useState(() => new Set());
  const [details, setDetails] = useState(() => new Map());
  const [staged, setStaged] = useState(() => new Set());
  const [stagedCount, setStagedCount] = useState(0);
  const [pending, setPending] = useState(() => new Set());
  const [error, setError] = useState(null);
  const pendingRef = useRef(new Set());

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return { success: false };

    try {
      const res = await getCollections();
      if (res.data?.success) {
        const items = res.data.data || [];
        setCollections(new Set(items.map((item) => item.palace_id)));
        setDetails(buildDetails(items));
        setError(null);
        return { success: true };
      }
      setError(res.data?.error || '加载收藏失败');
      return { success: false };
    } catch (err) {
      setError(err.response?.data?.error || '加载收藏失败');
      return { success: false };
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refresh();
      return;
    }

    setCollections(new Set());
    setDetails(new Map());
    const snapshot = guestSession.snapshotForMerge();
    setStaged(new Set(snapshot.collections.map((item) => item.palace_id)));
    setStagedCount(snapshot.collections.length);
    setDetails(
      new Map(
        snapshot.collections.map((item) => [
          item.palace_id,
          {
            palace_id: item.palace_id,
            collection_category: item.category || '默认',
            note: item.note || null,
          },
        ])
      )
    );
  }, [isLoggedIn, refresh]);

  const isCollected = useCallback(
    (palaceId) => collections.has(palaceId),
    [collections]
  );
  const isStaged = useCallback((palaceId) => staged.has(palaceId), [staged]);
  const getCollection = useCallback(
    (palaceId) => details.get(palaceId) || null,
    [details]
  );

  const acquire = useCallback((palaceId) => {
    if (!palaceId || pendingRef.current.has(palaceId)) return false;
    pendingRef.current.add(palaceId);
    setPending(new Set(pendingRef.current));
    return true;
  }, []);

  const release = useCallback((palaceId) => {
    pendingRef.current.delete(palaceId);
    setPending(new Set(pendingRef.current));
  }, []);

  const stageForGuest = useCallback((palaceId, options) => {
    const result = guestSession.stageCollection({
      palace_id: palaceId,
      category: options?.category,
      note: options?.note,
    });

    if (result.ok) {
      setStaged((prev) => new Set(prev).add(palaceId));
      setStagedCount(guestSession.snapshotForMerge().collections.length);
      setDetails((prev) =>
        new Map(prev).set(palaceId, {
          palace_id: palaceId,
          collection_category: result.item?.category || '默认',
          note: result.item?.note || null,
        })
      );
    } else {
      setError('暂存失败，请稍后重试');
    }

    return result;
  }, []);

  /**
   * 切换收藏状态
   */
  const toggle = useCallback(
    async (palaceId, options = {}) => {
      if (!acquire(palaceId)) return { success: false, skipped: true };

      setError(null);

      if (!isLoggedIn) {
        const result = stageForGuest(palaceId, options);
        release(palaceId);
        return result;
      }

      const wasCollected = collections.has(palaceId);
      const previousDetail = details.get(palaceId) || null;

      setCollections((prev) => {
        const next = new Set(prev);
        if (wasCollected) next.delete(palaceId);
        else next.add(palaceId);
        return next;
      });
      setDetails((prev) => {
        const next = new Map(prev);
        if (wasCollected) {
          next.delete(palaceId);
        } else {
          next.set(palaceId, {
            palace_id: palaceId,
            collection_category: options.category || '默认',
            note: options.note || null,
          });
        }
        return next;
      });

      try {
        const res = wasCollected
          ? await removeCollection(palaceId)
          : await addCollection(palaceId, options.category, options.note);
        if (res.data?.success === false) {
          throw new Error(res.data?.error || '操作失败');
        }
        return { success: true };
      } catch (err) {
        // 回滚乐观更新
        setCollections((prev) => {
          const next = new Set(prev);
          if (wasCollected) next.add(palaceId);
          else next.delete(palaceId);
          return next;
        });
        setDetails((prev) => {
          const next = new Map(prev);
          if (previousDetail) next.set(palaceId, previousDetail);
          else next.delete(palaceId);
          return next;
        });
        setError(err.response?.data?.error || err.message || '操作失败');
        return { success: false };
      } finally {
        release(palaceId);
      }
    },
    [acquire, collections, details, isLoggedIn, release, stageForGuest]
  );

  /**
   * 保存收藏（分类 + 笔记），始终走 POST；已存在时服务端只更新
   */
  const save = useCallback(
    async (palaceId, { category, note } = {}) => {
      if (!acquire(palaceId)) return { success: false, skipped: true };
      setError(null);

      if (!isLoggedIn) {
        const result = stageForGuest(palaceId, { category, note });
        release(palaceId);
        return result;
      }

      const wasCollected = collections.has(palaceId);
      const previousDetail = details.get(palaceId) || null;

      setCollections((prev) => new Set(prev).add(palaceId));
      setDetails((prev) =>
        new Map(prev).set(palaceId, {
          palace_id: palaceId,
          collection_category: category || '默认',
          note: note || null,
        })
      );

      try {
        const res = await addCollection(palaceId, category, note);
        if (res.data?.success === false) {
          throw new Error(res.data?.error || '保存失败');
        }

        const saved = res.data?.data?.collection;
        if (saved) {
          setDetails((prev) => new Map(prev).set(palaceId, saved));
        }
        return { success: true, data: res.data?.data };
      } catch (err) {
        setCollections((prev) => {
          const next = new Set(prev);
          if (!wasCollected) next.delete(palaceId);
          return next;
        });
        setDetails((prev) => {
          const next = new Map(prev);
          if (previousDetail) next.set(palaceId, previousDetail);
          else next.delete(palaceId);
          return next;
        });
        setError(err.response?.data?.error || err.message || '保存失败');
        return { success: false };
      } finally {
        release(palaceId);
      }
    },
    [acquire, collections, details, isLoggedIn, release, stageForGuest]
  );

  /**
   * 更新笔记
   */
  const updateNote = useCallback(
    async (palaceId, note) => {
      if (!isLoggedIn) {
        const result = guestSession.draftNote(palaceId, note);
        if (result.ok) {
          setStaged((prev) => new Set(prev).add(palaceId));
          setStagedCount(guestSession.snapshotForMerge().collections.length);
          setDetails((prev) =>
            new Map(prev).set(palaceId, {
              ...(prev.get(palaceId) || { palace_id: palaceId }),
              note,
            })
          );
        }
        return result;
      }

      try {
        const res = await updateCollectionNote(palaceId, note);
        if (res.data?.success === false) {
          throw new Error(res.data?.error || '保存失败');
        }
        setDetails((prev) =>
          new Map(prev).set(palaceId, {
            ...(prev.get(palaceId) || { palace_id: palaceId }),
            note: res.data?.data?.note ?? note,
            updated_at: res.data?.data?.updated_at,
          })
        );
        setError(null);
        return { success: true, data: res.data?.data };
      } catch (err) {
        setError(err.response?.data?.error || err.message || '保存失败');
        return { success: false };
      }
    },
    [isLoggedIn]
  );

  const clear = useCallback(() => {
    setCollections(new Set());
    setDetails(new Map());
    setPending(new Set());
    pendingRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      collections,
      details,
      staged,
      stagedCount,
      pending,
      error,
      isCollected,
      isStaged,
      getCollection,
      toggle,
      save,
      updateNote,
      refresh,
      clear,
    }),
    [
      collections,
      details,
      staged,
      stagedCount,
      pending,
      error,
      isCollected,
      isStaged,
      getCollection,
      toggle,
      save,
      updateNote,
      refresh,
      clear,
    ]
  );

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const ctx = useContext(CollectionsContext);
  if (!ctx) {
    throw new Error('useCollections must be used within CollectionsProvider');
  }
  return ctx;
}

export default CollectionsContext;