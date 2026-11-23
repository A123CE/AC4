import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getRoute, getRoutes, updateRouteProgress } from '../api';
import { useAuth } from '../context/AuthContext';
import guestSession from '../lib/guestSession';
import RecommendationRail from '../components/RecommendationRail';

function RouteList({ routes, loading, error, navigate }) {
  return (
    <main id="main" className="route-page">
      <header className="route-page-head">
        <Link to="/" className="route-back">
          <i className="fas fa-arrow-left" /> 返回首页
        </Link>
        <h1>主题导览路线</h1>
        <p>按主题顺序游览，进度会自动保存。</p>
      </header>

      {loading && <p role="status">加载中…</p>}
      {error && <p role="alert">{error}</p>}

      <RecommendationRail
        title="全部路线"
        items={routes}
        emptyText={loading ? '' : '暂无已发布路线'}
        renderItem={(route) => (
          <button
            type="button"
            className="route-list-card"
            onClick={() => navigate(`/routes/${route.id}`)}
          >
            <strong>{route.name}</strong>
            <span>
              {route.duration_minutes} 分钟 · {route.stops_count} 站
            </span>
            <p>{route.description}</p>
          </button>
        )}
      />
    </main>
  );
}

export default function RoutePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [routes, setRoutes] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (!id) {
      getRoutes()
        .then((res) => {
          if (!cancelled && res.data?.success) setRoutes(res.data.data || []);
        })
        .catch(() => {
          if (!cancelled) setError('加载路线失败');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    getRoute(id)
      .then((res) => {
        if (cancelled || !res.data?.success) return;

        const data = res.data.data;
        const stops = data.stops || [];
        const saved = isLoggedIn
          ? data.progress.stop_order
          : guestSession.getRouteProgress(id);
        const order = stops.some((stop) => stop.stop_order === saved)
          ? saved
          : stops[0]?.stop_order || 1;

        setDetail({
          ...data,
          progress: { ...data.progress, stop_order: order },
        });
      })
      .catch(() => {
        if (!cancelled) setError('路线不存在或已下线');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isLoggedIn]);

  if (!id) {
    return (
      <RouteList
        routes={routes}
        loading={loading}
        error={error}
        navigate={navigate}
      />
    );
  }

  if (loading) {
    return (
      <main id="main" className="route-page">
        <p role="status">加载路线中…</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main id="main" className="route-page">
        <p role="alert">{error || '路线不存在'}</p>
        <Link to="/routes" className="route-back">
          返回全部路线
        </Link>
      </main>
    );
  }

  const { route, stops, skipped, progress } = detail;
  const currentIndex = Math.max(
    0,
    stops.findIndex((stop) => stop.stop_order === progress.stop_order)
  );
  const currentStop = stops[currentIndex];

  const setStop = (order) => {
    const index = stops.findIndex((stop) => stop.stop_order === order);
    const safeIndex = index >= 0 ? index : 0;
    setDetail((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        stop_order: order,
        percent: Math.round(((safeIndex + 1) / Math.max(stops.length, 1)) * 100),
      },
    }));

    if (isLoggedIn) {
      updateRouteProgress(id, order).catch(() => {});
    } else {
      guestSession.setRouteProgress(id, order);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setStop(stops[currentIndex - 1].stop_order);
  };

  const goNext = () => {
    if (currentIndex < stops.length - 1) {
      setStop(stops[currentIndex + 1].stop_order);
    }
  };

  return (
    <main id="main" className="route-page">
      <header className="route-hero">
        <Link to="/routes" className="route-back">
          <i className="fas fa-arrow-left" /> 全部路线
        </Link>
        <h1>{route.name}</h1>
        <p>{route.description}</p>
        <div className="route-meta">
          <span>
            <i className="fas fa-clock" /> {route.duration_minutes} 分钟
          </span>
          <span>
            <i className="fas fa-signal" /> {route.difficulty}
          </span>
          <span>
            <i className="fas fa-flag-checkered" /> {progress.stop_order}/
            {progress.total} 站
          </span>
        </div>
        <div className="route-progress-bar" aria-label={`完成度 ${progress.percent}%`}>
          <div style={{ width: `${progress.percent}%` }} />
        </div>
      </header>

      {skipped.length > 0 && (
        <div className="route-skipped" role="status">
          有 {skipped.length} 站内容已下线，已自动跳过。
        </div>
      )}

      <section className="route-current">
        <h2>
          当前站 · {progress.stop_order}/{progress.total}
        </h2>

        {currentStop && (
          <div className="route-stop active">
            <div className="route-stop-body">
              <strong>{currentStop.palace.name}</strong>
              <span>
                {currentStop.palace.category || '建筑'} · 建议停留{' '}
                {currentStop.stay_minutes} 分钟
              </span>
              <p>{currentStop.highlight}</p>
            </div>
            <button
              type="button"
              className="route-enter-btn"
              onClick={() =>
                navigate(
                  `/exhibition/${currentStop.palace.id}?from=route&route=${encodeURIComponent(id)}`
                )
              }
            >
              进入此建筑
            </button>
          </div>
        )}

        <div className="route-actions">
          <button type="button" disabled={currentIndex <= 0} onClick={goPrev}>
            上一站
          </button>
          <button
            type="button"
            disabled={currentIndex >= stops.length - 1}
            onClick={goNext}
          >
            下一站
          </button>
        </div>
      </section>

      <section className="route-stops">
        <h2>全部站点</h2>
        {stops.map((stop, index) => (
          <button
            type="button"
            key={stop.stop_order}
            className={`route-stop${
              stop.stop_order === progress.stop_order ? ' active' : ''
            }`}
            onClick={() => {
              setStop(stop.stop_order);
              navigate(
                `/exhibition/${stop.palace.id}?from=route&route=${encodeURIComponent(id)}`
              );
            }}
          >
            <span className="route-stop-index">{index + 1}</span>
            <div className="route-stop-body">
              <strong>{stop.palace.name}</strong>
              <span>{stop.highlight}</span>
            </div>
            <em>{stop.stay_minutes} 分钟</em>
          </button>
        ))}
      </section>
    </main>
  );
}