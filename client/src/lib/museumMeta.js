import { useEffect, useState } from 'react';
import { getPalaces } from '../api';

/**
 * 规范化年代文本 — 纯年份补「年」, 已是描述性文本的原样返回
 * 例: 1420 补为 1420年 ; "1420 年建成" / "跨越八百年" 原样返回
 */
export function formatBuiltYear(builtYear) {
  if (!builtYear) return '年代待考';
  const text = String(builtYear).trim();
  if (!text) return '年代待考';
  if (/^\d{1,4}$/.test(text)) return `${text}年`;
  return text;
}

/**
 * 建筑所在地 — 优先城市, 其次地区, 再次兜底
 */
export function formatLocation(palace) {
  if (!palace) return '待考';
  return palace.city || palace.region || '待考';
}

/**
 * 博物馆概览信息 — 建筑总数 / 覆盖地区 / 建筑类型
 * 登录页与登录弹窗共用；后端不可用时回退到静态兜底
 */
const FALLBACK = { total: 20, regionCount: 8, categoryCount: 9, loaded: false };

export function useMuseumMeta() {
  const [meta, setMeta] = useState(FALLBACK);

  useEffect(() => {
    let mounted = true;

    getPalaces()
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data || [];
        if (!Array.isArray(list) || list.length === 0) return;

        const regions = new Set();
        const categories = new Set();
        list.forEach((p) => {
          const region = p.region || p.city;
          if (region) regions.add(region);
          if (p.category) categories.add(p.category);
        });

        setMeta({
          total: list.length,
          regionCount: regions.size,
          categoryCount: categories.size,
          loaded: true,
        });
      })
      .catch(() => {
        /* 保持兜底数据 */
      });

    return () => {
      mounted = false;
    };
  }, []);

  return meta;
}

export default useMuseumMeta;
