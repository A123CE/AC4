import { CardContainer, CardBody, CardItem } from './ui/3d-card';
import CollectionButton from './CollectionButton';

/**
 * 分类图标映射 — 按建筑类别返回国风图标
 */
const CATEGORY_ICONS = {
  宫殿: 'fa-landmark-dome',
  关隘: 'fa-torii-gate',
  楼阁: 'fa-gopuram',
  佛塔: 'fa-chess-rook',
  寺庙: 'fa-vihara',
  石窟: 'fa-mountain',
  军事工程: 'fa-mountain-city',
  坛庙: 'fa-place-of-worship',
  民居: 'fa-house-chimney',
};

function getCoverUrl(palace) {
  if (palace.poster_path) return `/images/${palace.poster_path}`;
  return null;
}

function getSummary(palace) {
  if (palace.tagline) return palace.tagline;
  const desc = palace.description || '';
  return desc.length > 40 ? desc.slice(0, 40) + '…' : desc || '暂无简介';
}

/**
 * 古建筑信息卡片 — 3D 视差效果, 统一结构
 * 新增建筑无需改动即可自动生成
 */
export default function BuildingCard({ palace, onDetail, onModel }) {
  const coverUrl = getCoverUrl(palace);
  const region = palace.region || palace.city || '北京';
  const icon = CATEGORY_ICONS[palace.category] || 'fa-landmark';

  return (
    <CardContainer className="building-card-3d">
      <CardBody as="article" className="building-card">
        <div className="building-card-collection">
          <CollectionButton palaceId={palace.id} variant="icon" />
        </div>

        {/* 封面 — 收在卡片框内, 悬停时整卡放大、图片再放大 */}
        <CardItem className="building-card-cover">
          {coverUrl ? (
            <img src={coverUrl} alt={palace.name} loading="lazy" />
          ) : (
            <div className="building-card-cover-placeholder">
              <i className={`fas ${icon}`} />
              <span>{palace.name}</span>
            </div>
          )}
        </CardItem>

        <div className="building-card-body">
          <CardItem as="h3" translateZ={60} className="building-card-title">
            {palace.name}
          </CardItem>
          <CardItem translateZ={30} className="building-card-meta">
            <span>{region}</span>
            <span>{palace.dynasty || '—'}</span>
            <span className="meta-category">{palace.category}</span>
          </CardItem>
          <CardItem as="p" translateZ={40} className="building-card-desc">
            {getSummary(palace)}
          </CardItem>
          <div className="building-card-actions">
            <CardItem
              as="button"
              translateZ={55}
              className="building-card-btn building-card-btn--detail"
              onClick={(e) => { e.stopPropagation(); onDetail(palace); }}
            >
              查看详情
            </CardItem>
            <CardItem
              as="button"
              translateZ={55}
              className="building-card-btn building-card-btn--model"
              onClick={(e) => { e.stopPropagation(); onModel(palace); }}
            >
              3D模型浏览
            </CardItem>
          </div>
        </div>
      </CardBody>
    </CardContainer>
  );
}
