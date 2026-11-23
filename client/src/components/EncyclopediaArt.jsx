/**
 * 营造法式 · 线稿插画集
 * 全部为单色描边 SVG (stroke: currentColor), 用于:
 *   1) 营造导引看板卡片缩略图
 *   2) 词条详情页「图解示意区」大幅拆解图
 * 统一画布 0 0 640 360, 便于热点用百分比坐标定位。
 */

const base = {
  viewBox: '0 0 640 360',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

/** 屋顶形制 — 庑殿顶正立面（屋面 / 斗拱层 / 柱额 / 台基） */
export function RoofArt({ className = '', thumb = false }) {
  return (
    <svg
      {...base}
      viewBox={thumb ? '70 26 500 306' : base.viewBox}
      className={`enc-art ${className}`.trim()}
    >
      {/* 正脊与两端鸱吻 */}
      <path d="M246 62h148" />
      <path d="M246 62c-9-11-2-22 9-24 8-1 12 5 11 11" />
      <path d="M394 62c9-11 2-22-9-24-8-1-12 5-11 11" />
      {/* 屋面两坡（垂脊） */}
      <path d="M246 62Q170 106 96 172" />
      <path d="M394 62Q470 106 544 172" />
      {/* 屋面瓦垄 */}
      <path d="M258 78Q196 116 132 168" />
      <path d="M382 78Q444 116 508 168" />
      <path d="M286 78Q236 118 190 168" />
      <path d="M354 78Q404 118 450 168" />
      {/* 檐口与翘角 */}
      <path d="M88 170h464" />
      <path d="M84 178h472" />
      <path d="M84 178q-13-2-19-14" />
      <path d="M556 178q13-2 19-14" />
      {/* 檐下斗拱层 */}
      <path d="M112 196h416" strokeDasharray="3 9" />
      <path d="M168 186v10m-10 0h20" />
      <path d="M288 186v10m-10 0h20" />
      <path d="M408 186v10m-10 0h20" />
      <path d="M168 196v10" />
      <path d="M288 196v10" />
      <path d="M408 196v10" />
      {/* 额枋 */}
      <path d="M116 206h408" />
      <path d="M116 214h408" />
      {/* 柱网与门扉 */}
      <path d="M118 214v78" />
      <path d="M126 214v78" />
      <path d="M352 214v78" />
      <path d="M360 214v78" />
      <path d="M462 214v78" />
      <path d="M470 214v78" />
      <path d="M236 214v78" />
      <path d="M244 214v78" />
      <path d="M296 218v74h40v-74" />
      <path d="M316 218v74" />
      {/* 台基与踏道 */}
      <path d="M96 292h448" />
      <path d="M92 302h456" />
      <path d="M88 320h464" />
      <path d="M300 292v28" />
      <path d="M340 292v28" />
      <path d="M292 312h56" />
    </svg>
  );
}

/** 斗拱结构 — 分层拆解线稿 */
export function DougongArt({ className = '', thumb = false }) {
  return (
    <svg
      {...base}
      viewBox={thumb ? '96 92 440 248' : base.viewBox}
      className={`enc-art ${className}`.trim()}
    >
      {/* 柱 */}
      <path d="M306 252h28v76h-28z" />
      {/* 栌斗 */}
      <path d="M288 232h64l-9 20h-46z" />
      {/* 第一跳华拱 */}
      <path d="M206 212h228v20H206z" />
      {/* 拱端散斗 */}
      <path d="M198 194h34l-5 18h-24z" />
      <path d="M408 194h34l-5 18h-24z" />
      {/* 下昂（左右斜出） */}
      <path d="M264 212 178 146l15-11 89 77z" />
      <path d="M376 212l86-66-15-11-89 77z" />
      {/* 第二跳 */}
      <path d="M240 148h160v20H240z" />
      {/* 替木 / 罗汉枋 */}
      <path d="M226 126h188v18H226z" />
      {/* 屋架示意 */}
      <path d="M176 106h288" strokeDasharray="4 9" />
      {/* 层高辅助线 */}
      <path d="M120 232h48" strokeDasharray="4 7" />
      <path d="M120 212h48" strokeDasharray="4 7" />
      <path d="M120 148h48" strokeDasharray="4 7" />
      <path d="M112 212v20" />
      <path d="M112 148v64" />
    </svg>
  );
}

/** 彩画纹样 — 龙纹简笔（龙身 + 祥云 + 火焰珠） */
export function DragonArt({ className = '', thumb = false }) {
  return (
    <svg
      {...base}
      viewBox={thumb ? '80 92 540 224' : base.viewBox}
      className={`enc-art ${className}`.trim()}
    >
      {/* 龙身（双线带身，自尾部向右上盘起） */}
      <path d="M118 236c50-52 120-64 174-42 56 22 88 56 140 20" />
      <path d="M132 262c48-52 116-64 168-44 54 20 84 50 136 18" />
      {/* 尾部开叉 */}
      <path d="M118 236l-20-16" />
      <path d="M132 262l-22 10" />
      <path d="M112 220l-16 4" />
      {/* 背鳍 */}
      <path d="M186 198l6-18 12 12" />
      <path d="M232 182l6-18 12 12" />
      <path d="M282 184l6-18 12 12" />
      <path d="M330 198l6-18 12 12" />
      {/* 鳞纹 */}
      <path d="M206 214q12 9 24 0" />
      <path d="M250 202q12 9 24 0" />
      <path d="M296 206q12 9 24 0" />
      <path d="M186 244q12 9 24 0" />
      <path d="M232 232q12 9 24 0" />
      {/* 四肢与爪 */}
      <path d="M246 238c-10 18-14 30-12 42" />
      <path d="M234 280l-11 9" />
      <path d="M234 280l0 13" />
      <path d="M234 280l11 8" />
      <path d="M340 244c-8 16-10 28-8 38" />
      <path d="M332 282l-11 9" />
      <path d="M332 282l0 13" />
      <path d="M332 282l11 8" />
      {/* 龙首 */}
      <path d="M430 214c34-14 66-8 82 8 10 10 4 24-14 26-22 2-46-6-58-16" />
      <path d="M446 232c14 10 34 16 52 14" />
      <circle cx="486" cy="222" r="3.6" />
      {/* 双角 */}
      <path d="M452 206c2-20 12-34 26-42" />
      <path d="M470 208c4-18 14-30 28-36" />
      {/* 龙须与火焰髭 */}
      <path d="M512 226c16 4 26 12 30 22" />
      <path d="M512 238c14 8 22 16 24 26" />
      <path d="M470 240c-6 12-4 22 4 30" />
      {/* 祥云 */}
      <path d="M120 140c-14-12-4-32 14-26 2-18 28-22 36-6 18-4 30 12 20 26" />
      <path d="M134 158c-10-8-2-22 12-18" />
      <path d="M138 132c-6-8 2-16 10-12" />
      <path d="M236 120c-12-10-2-26 14-22 4-14 26-14 32 0 14-2 24 12 14 24" />
      <path d="M252 112c-4-8 4-14 12-10" />
      {/* 火焰珠 */}
      <circle cx="556" cy="182" r="20" />
      <circle cx="556" cy="182" r="9" />
      <path d="M556 152c9 8 13 15 13 22" />
      <path d="M556 212c-9-8-13-15-13-22" />
      <path d="M526 182c8-9 15-13 22-13" />
      <path d="M586 182c-8 9-15 13-22 13" />
      <path d="M530 156c-8-4-12-10-13-17" />
      <path d="M582 208c8 4 12 10 13 17" />
    </svg>
  );
}

/** 建筑规制 — 三朝五门中轴布局简图 */
export function PlanArt({ className = '', thumb = false }) {
  return (
    <svg
      {...base}
      viewBox={thumb ? '180 50 680 290' : base.viewBox}
      className={`enc-art ${className}`.trim()}
    >
      {/* 宫城城墙（双线）与四隅角楼 */}
      <path d="M96 58h448v268H96z" />
      <path d="M104 66h432v252H104z" />
      <path d="M96 58h18v18H96z" />
      <path d="M526 58h18v18h-18z" />
      <path d="M96 308h18v18H96z" />
      <path d="M526 308h18v18h-18z" />
      {/* 中轴 */}
      <path d="M320 74v238" strokeDasharray="7 9" />
      {/* 院落分隔 */}
      <path d="M112 126h416" strokeDasharray="3 9" />
      <path d="M112 232h416" strokeDasharray="3 9" />
      {/* 乾清门 */}
      <path d="M294 100h52v14h-52z" />
      <path d="M320 100v14" />
      {/* 保和殿 */}
      <path d="M234 132h172v22H234z" />
      <path d="M234 140h172" strokeDasharray="3 6" />
      {/* 中和殿（方形攒尖） */}
      <path d="M254 162h132v20H254z" />
      <path d="M320 162v20" strokeDasharray="3 6" />
      {/* 太和殿 */}
      <path d="M216 190h208v28H216z" />
      <path d="M216 199h208" strokeDasharray="3 6" />
      <path d="M216 209h208" strokeDasharray="3 6" />
      {/* 太和门 */}
      <path d="M292 240h56v14h-56z" />
      <path d="M320 240v14" />
      {/* 午门（凹字形城台） */}
      <path d="M272 288h96v20h-96z" />
      <path d="M272 288v-12h20v12" />
      <path d="M348 288v-12h20v12" />
      <path d="M296 288v20" />
      <path d="M320 288v20" />
      <path d="M344 288v20" />
    </svg>
  );
}

/** 通用构件分层 — 台基、柱础、门窗、脊兽等词条的兜底示意 */
export function AssemblyArt({ className = '' }) {
  return (
    <svg {...base} className={`enc-art ${className}`.trim()}>
      {/* 屋顶层 */}
      <path d="M132 118 320 46l188 72" />
      <path d="M124 122h392" />
      <path d="M124 122q-12-2-18-12" />
      <path d="M516 122q12-2 18-12" />
      {/* 脊兽位置 */}
      <path d="M140 112c-6-10-2-18 8-20" />
      {/* 斗拱层 */}
      <path d="M180 138h280" strokeDasharray="4 11" />
      {/* 柱身与门窗 */}
      <path d="M186 138v142" />
      <path d="M454 138v142" />
      <path d="M286 138v142" />
      <path d="M354 138v142" />
      <path d="M286 200h68" />
      <path d="M242 138v142" strokeDasharray="4 10" />
      <path d="M398 138v142" strokeDasharray="4 10" />
      {/* 柱础 */}
      <path d="M176 280h20v16h-20z" />
      <path d="M444 280h20v16h-20z" />
      {/* 台基 */}
      <path d="M160 296h320v20H160z" />
      <path d="M144 316h352" />
      {/* 地面 */}
      <path d="M120 336h400" strokeDasharray="3 9" />
    </svg>
  );
}

/** 分类 → 图解规格（art + 热点） */
export const DIAGRAM_SPECS = {
  roof: {
    art: RoofArt,
    title: '屋顶形制与等级',
    caption: '庑殿顶各部位名称 — 悬停热点查看构件',
    hotspots: [
      { id: 'ridge', label: '正脊', note: '屋面最高一条脊，两端设鸱吻', x: 50, y: 17 },
      { id: 'eave', label: '檐口', note: '出檐深远，保护屋身与台基', x: 50, y: 49 },
      { id: 'bracket', label: '檐下斗拱', note: '承托出檐，等级越高层数越多', x: 26, y: 53 },
      { id: 'base', label: '台基', note: '三大殿共用三层汉白玉须弥座', x: 50, y: 85 },
    ],
  },
  dougong: {
    kind: 'dougong3d',
    art: DougongArt,
    title: '斗拱三维拆解',
    caption: '自下而上：檐柱 → 栌斗 → 泥道拱/华拱 → 散斗 → 下昂 → 罗汉枋',
    hotspots: [],
  },
  dragon: {
    art: DragonArt,
    title: '龙纹纹样分解',
    caption: '和玺彩画中的行龙与火焰珠 — 悬停查看寓意',
    hotspots: [
      { id: 'head', label: '龙头', note: '居中为主体，象征帝王，等级最高', x: 72, y: 60 },
      { id: 'cloud', label: '祥云', note: '衬托龙身，寓意江山祥瑞', x: 22, y: 34 },
      { id: 'pearl', label: '火焰珠', note: '龙所戏宝珠，象征皇权与光明', x: 87, y: 50 },
      { id: 'body', label: '龙身鳞纹', note: '层层鳞片，行龙姿态随彩画形制变化', x: 36, y: 62 },
    ],
  },
  plan: {
    art: PlanArt,
    title: '三朝五门中轴布局',
    caption: '紫禁城中轴线由南至北 — 悬停查看位置',
    hotspots: [
      { id: 'wumen', label: '午门', note: '五门之末，宫城正门', x: 50, y: 83 },
      { id: 'taihemen', label: '太和门', note: '外朝正门，御门听政之所', x: 50, y: 70 },
      { id: 'taihedian', label: '太和殿', note: '三朝之首，大朝之所', x: 50, y: 57 },
      { id: 'zhonghedian', label: '中和殿', note: '三朝之二，休息受贺', x: 50, y: 48 },
      { id: 'baohedian', label: '保和殿', note: '三朝之三，殿试赐宴', x: 50, y: 40 },
    ],
  },
  assembly: {
    art: AssemblyArt,
    title: '古建筑构件分层',
    caption: '自下而上：台基 → 柱础 → 柱身 → 斗拱 → 屋顶',
    hotspots: [
      { id: 'roof', label: '屋顶层', note: '瓦面、脊饰与脊兽所在', x: 50, y: 22 },
      { id: 'dougong', label: '斗拱层', note: '柱顶与屋架之间的传力层', x: 30, y: 39 },
      { id: 'column', label: '柱身与门窗', note: '开间进深由柱网决定', x: 72, y: 58 },
      { id: 'plinth', label: '柱础', note: '承柱防潮，常作覆盆或鼓形', x: 28, y: 80 },
      { id: 'platform', label: '台基', note: '等级越高，层数与雕饰越盛', x: 50, y: 85 },
    ],
  },
};

/** 按词条决定使用哪张图解（返回 null 表示无配套图解） */
export function getDiagramSpec(term) {
  if (!term) return null;
  const id = (term.id || '').toLowerCase();
  const category = term.category || '';

  if (category === '屋顶' || id.includes('roof')) return DIAGRAM_SPECS.roof;
  if (category === '斗拱' || id.includes('dougong')) return DIAGRAM_SPECS.dougong;
  if (category === '彩画' || category === '纹饰' || id.includes('wen')) {
    return DIAGRAM_SPECS.dragon;
  }
  if (category === '建筑规制' || id.includes('sanchaodian')) return DIAGRAM_SPECS.plan;
  return DIAGRAM_SPECS.assembly;
}
