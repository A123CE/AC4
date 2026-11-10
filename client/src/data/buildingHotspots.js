/**
 * 建筑热点数据配置
 * 每个热点对应百科术语，显示在3D模型上的标注位置
 * 位置使用模型包围盒百分比坐标 (0-1)
 */
const BUILDING_HOTSPOTS = {
  taihedian: [
    {
      id: 'taihedian-roof',
      position: [0.5, 0.92, 0.5],   // 屋顶顶部
      label: '重檐庑殿顶',
      termId: 'wudian-roof',
      icon: 'fa-house',
      description: '中国古建筑最高等级屋顶，四面坡五条脊，象征皇权至高无上',
    },
    {
      id: 'taihedian-ridge',
      position: [0.5, 0.85, 0.95],  // 正脊前端
      label: '鸱吻',
      termId: 'chiwen',
      icon: 'fa-dragon',
      description: '正脊两端龙形装饰，高3.4米重4.3吨，镇火避灾',
    },
    {
      id: 'taihedian-jishou',
      position: [0.85, 0.80, 0.5],  // 角脊
      label: '脊兽·仙人走兽',
      termId: 'jishou-xianren',
      icon: 'fa-dragon',
      description: '太和殿角脊10只蹲兽，绝无仅有的最高等级',
    },
    {
      id: 'taihedian-dougong',
      position: [0.6, 0.60, 0.3],   // 斗拱层
      label: '九踩斗拱',
      termId: 'dougong-levels',
      icon: 'fa-cubes',
      description: '最高等级斗拱规制，出挑四层，层层承托屋顶重量',
    },
    {
      id: 'taihedian-caihua',
      position: [0.3, 0.55, 0.5],   // 彩画区域
      label: '金龙和玺彩画',
      termId: 'caihua-hexi',
      icon: 'fa-palette',
      description: '最高等级彩画，全部以五爪金龙为主题，沥粉贴金',
    },
    {
      id: 'taihedian-sumeru',
      position: [0.5, 0.08, 0.5],   // 台基底部
      label: '三层须弥座',
      termId: 'sumeru',
      icon: 'fa-layer-group',
      description: '汉白玉须弥座台基，高8.13米，螭首排水千龙吐水',
    },
    {
      id: 'taihedian-caisson',
      position: [0.5, 0.95, 0.5],   // 内部藻井(估算)
      label: '藻井·盘龙含珠',
      termId: 'caisson',
      icon: 'fa-star',
      description: '宝座上方八角藻井，盘龙口衔轩辕镜，辨真假天子',
    },
  ],
  taihemen: [
    { id: 'taihemen-roof', position: [0.5, 0.90, 0.5], label: '重檐歇山顶', termId: 'xieshan-roof', icon: 'fa-house', description: '九条脊的次高等级屋顶，故宫最大宫门' },
    { id: 'taihemen-dougong', position: [0.5, 0.55, 0.3], label: '斗拱', termId: 'dougong', icon: 'fa-cubes', description: '柱顶与屋架间的木结构，承重抗震装饰三位一体' },
    { id: 'taihemen-door', position: [0.5, 0.40, 0.05], label: '宫门制式', termId: 'gongmen', icon: 'fa-door-open', description: '三阙门洞，正门居中两侧各一' },
  ],
  baohedian: [
    { id: 'baohedian-roof', position: [0.5, 0.90, 0.5], label: '重檐歇山顶', termId: 'xieshan-roof', icon: 'fa-house', description: '九条脊的次高等级屋顶' },
    { id: 'baohedian-caihua', position: [0.3, 0.55, 0.5], label: '龙凤和玺彩画', termId: 'caihua-hexi', icon: 'fa-palette', description: '龙纹与凤纹交替，等级略低于金龙和玺' },
    { id: 'baohedian-sumeru', position: [0.5, 0.10, 0.5], label: '须弥座', termId: 'sumeru', icon: 'fa-layer-group', description: '与太和殿共用三层台基，云龙石雕重200吨' },
  ],
  zhonghedian: [
    { id: 'zhonghedian-roof', position: [0.5, 0.92, 0.5], label: '四角攒尖顶', termId: 'roof-ranking', icon: 'fa-house', description: '单檐四角攒尖顶，平面正方形，故宫中较为独特' },
  ],
  qianqinggong: [
    { id: 'qianqinggong-roof', position: [0.5, 0.90, 0.5], label: '单檐庑殿顶', termId: 'wudian-roof', icon: 'fa-house', description: '等级次于太和殿重檐庑殿顶，内廷最高等级' },
    { id: 'qianqinggong-caihua', position: [0.4, 0.55, 0.5], label: '龙草和玺彩画', termId: 'caihua-hexi', icon: 'fa-palette', description: '龙纹与花卉纹样结合，等级低于金龙和玺' },
  ],
  jiaotaidian: [
    { id: 'jiaotaidian-roof', position: [0.5, 0.92, 0.5], label: '四角攒尖顶', termId: 'roof-ranking', icon: 'fa-house', description: '单檐四角攒尖顶，存放二十五方宝玺' },
    { id: 'jiaotaidian-fengwen', position: [0.5, 0.50, 0.5], label: '凤纹', termId: 'fengwen', icon: 'fa-feather', description: '皇后相关的尊贵纹样，龙凤和玺交替出现' },
  ],
  kunninggong: [
    { id: 'kunninggong-roof', position: [0.5, 0.90, 0.5], label: '重檐庑殿顶', termId: 'wudian-roof', icon: 'fa-house', description: '内廷后三宫之一，明代皇后寝宫' },
  ],
  wumen: [
    { id: 'wumen-roof', position: [0.5, 0.90, 0.5], label: '重檐歇山顶', termId: 'xieshan-roof', icon: 'fa-house', description: '故宫正门，凹字形城楼，中国现存最大宫门' },
    { id: 'wumen-door', position: [0.5, 0.30, 0.05], label: '五阙门洞', termId: 'gongmen', icon: 'fa-door-open', description: '最高等级宫门，中间三门帝王专用' },
  ],
  qianqingmen: [
    { id: 'qianqingmen-roof', position: [0.5, 0.88, 0.5], label: '单檐歇山顶', termId: 'xieshan-roof', icon: 'fa-house', description: '内廷正门，外朝与内廷分界线' },
    { id: 'qianqingmen-screen', position: [0.5, 0.40, 0.02], label: '琉璃照壁', termId: 'liulizhaobi', icon: 'fa-gem', description: '遮挡视线分隔空间，挡煞聚气' },
  ],
  shenwumen: [
    { id: 'shenwumen-roof', position: [0.5, 0.90, 0.5], label: '重檐庑殿顶', termId: 'wudian-roof', icon: 'fa-house', description: '故宫北门，原名玄武门，避康熙讳改名' },
  ],
};

/** 根据建筑ID获取热点列表 */
export function getHotspots(palaceId) {
  return BUILDING_HOTSPOTS[palaceId] || [];
}

/** 获取热点对应的百科术语信息 */
export function getHotspotTermInfo(hotspot) {
  if (!hotspot || !hotspot.termId) return null;
  return {
    termId: hotspot.termId,
    label: hotspot.label,
    icon: hotspot.icon,
    description: hotspot.description,
  };
}

export default BUILDING_HOTSPOTS;
