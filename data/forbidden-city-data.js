var forbiddenCityData = {
  metadata: {
    version: "1.0",
    lastUpdated: "2026-04-19",
    description: "北京故宫10座宫殿模型可视化数据"
  },
  
  axisPositions: {
    description: "按中轴线真实位置排列 (从南到北)",
    spacing: 3
  },

  palaces: [
    {
      id: "wumen",
      name: "午门",
      nameEnglish: "Meridian Gate",
      order: 1,
      axisPosition: 0,
      description: "故宫的正南门,是故宫的正门,始建于明永乐十八年(1420年),是中国现存最大的宫门",
      model: "models/forbidden-city/wumen.glb",
      images: [
        "images/forbidden-city/wumen/exterior-1.jpg",
        "images/forbidden-city/wumen/exterior-2.jpg",
        "images/forbidden-city/wumen/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "37.95米",
        area: "约2500平方米",
        style: "凹字形城楼",
        significance: "故宫正门,颁诏之地"
      },
      timeline: [
        { year: "1420", event: "午门建成,作为紫禁城的正门" },
        { year: "1644", event: "李自成攻入北京,从午门进入紫禁城" },
        { year: "1925", event: "故宫博物院成立,午门成为入口" },
        { year: "2019", event: "午门城楼举办'千秋佳节'展览" }
      ],
      funFacts: [
        "午门并非只有五个门洞,实际有三个门洞和两个掖门,共五个入口",
        "古代'推出午门斩首'的说法并不准确,午门是颁诏之地,并非刑场",
        "午门城楼上的钟楼和鼓楼在重大典礼时会鸣响"
      ],
      audioGuide: "午门是故宫的正门,始建于1420年,高37.95米,是中国现存最大的宫门。每逢皇帝出郊祭祀或大典,都要从午门出入。",
      hasVideo: false
    },
    {
      id: "taihemen",
      name: "太和门",
      nameEnglish: "Gate of Supreme Harmony",
      order: 2,
      axisPosition: 1,
      description: "故宫外朝的正门,是紫禁城内最大的宫门,始建于明永乐十八年(1420年)",
      model: "models/forbidden-city/taihemeng.glb",
      images: [
        "images/forbidden-city/taihemen/exterior-1.jpg",
        "images/forbidden-city/taihemen/exterior-2.jpg",
        "images/forbidden-city/taihemen/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "23.8米",
        area: "约1300平方米",
        style: "重檐歇山顶",
        significance: "外朝正门,御门听政之地"
      },
      timeline: [
        { year: "1420", event: "太和门初建,原名奉天门" },
        { year: "1557", event: "改名皇极门" },
        { year: "1645", event: "清顺治帝改名太和门" },
        { year: "1888", event: "光绪年间火灾后重建" }
      ],
      funFacts: [
        "太和门前的铜狮是紫禁城内最大的铜狮",
        "清代皇帝曾在太和门'御门听政',即在此接见群臣处理朝政",
        "光绪大婚时,太和门曾遭火灾,扎彩匠用芦席扎成假太和门以假乱真"
      ],
      audioGuide: "太和门是故宫外朝的正门,高23.8米,是紫禁城内最大的宫门。清代皇帝曾在此御门听政,接见群臣。",
      hasVideo: false
    },
    {
      id: "taihedian",
      name: "太和殿",
      nameEnglish: "Hall of Supreme Harmony",
      order: 3,
      axisPosition: 2,
      description: "又称'金銮宝殿',是故宫中等级最高的建筑,皇帝举行重大典礼的场所",
      model: "models/forbidden-city/taihedian.glb",
      images: [
        "images/forbidden-city/taihedian/exterior-1.jpg",
        "images/forbidden-city/taihedian/exterior-2.jpg",
        "images/forbidden-city/taihedian/interior-1.jpg",
        "images/forbidden-city/taihedian/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "35.05米",
        area: "2377平方米",
        style: "重檐庑殿顶,十一开间",
        significance: "举行登基、大婚、命将出征等重大典礼"
      },
      timeline: [
        { year: "1420", event: "太和殿初建,原名奉天殿" },
        { year: "1695", event: "康熙年间重建,改名太和殿" },
        { year: "1915", event: "袁世凯称帝,在太和殿举行登基大典" },
        { year: "2008", event: "太和殿完成大规模修缮,重新对外开放" }
      ],
      funFacts: [
        "太和殿屋脊上有10个脊兽,是中国古建筑中脊兽数量最多的",
        "太和殿内的龙椅上方悬挂着'建极绥猷'匾额,为乾隆帝御笔",
        "太和殿前有三层汉白玉须弥座台基,高8.13米",
        "太和殿并非'金銮殿',民间俗称金銮殿,但正式名称一直是太和殿"
      ],
      audioGuide: "太和殿又称金銮宝殿,高35.05米,面积2377平方米,是故宫中等级最高的建筑。皇帝登基、大婚、命将出征等重大典礼都在此举行。",
      hasVideo: false
    },
    {
      id: "zhonghedian",
      name: "中和殿",
      nameEnglish: "Hall of Central Harmony",
      order: 4,
      axisPosition: 3,
      description: "位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方",
      model: "models/forbidden-city/zhonghedian.glb",
      images: [
        "images/forbidden-city/zhonghedian/exterior-1.jpg",
        "images/forbidden-city/zhonghedian/interior-1.jpg",
        "images/forbidden-city/zhonghedian/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约23米",
        area: "约580平方米",
        style: "单檐四角攒尖顶",
        significance: "大典前休息、演习礼仪"
      },
      timeline: [
        { year: "1420", event: "中和殿初建,原名华盖殿" },
        { year: "1562", event: "改名中极殿" },
        { year: "1645", event: "清顺治帝改名中和殿" },
        { year: "1765", event: "乾隆年间重修" }
      ],
      funFacts: [
        "中和殿平面呈正方形,在故宫中较为独特",
        "皇帝在此接受执事官员的朝拜,并审阅奏章",
        "殿内保存有乾隆帝御笔'允执厥中'匾额"
      ],
      audioGuide: "中和殿位于太和殿和保和殿之间,是皇帝去太和殿大典之前休息和演习礼仪的地方,平面呈正方形,在故宫中较为独特。",
      hasVideo: false
    },
    {
      id: "baohedian",
      name: "保和殿",
      nameEnglish: "Hall of Preserving Harmony",
      order: 5,
      axisPosition: 4,
      description: "故宫外朝三大殿之一,明代用于皇帝更衣,清代用于举行宴会和殿试",
      model: "models/forbidden-city/baohedian.glb",
      images: [
        "images/forbidden-city/baohedian/exterior-1.jpg",
        "images/forbidden-city/baohedian/interior-1.jpg",
        "images/forbidden-city/baohedian/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约29.5米",
        area: "约1240平方米",
        style: "重檐歇山顶,九开间",
        significance: "举行宴会、殿试科举"
      },
      timeline: [
        { year: "1420", event: "保和殿初建,原名谨身殿" },
        { year: "1562", event: "改名建极殿" },
        { year: "1645", event: "清顺治帝改名保和殿" },
        { year: "1789", event: "乾隆帝将殿试移至保和殿" }
      ],
      funFacts: [
        "保和殿后的云龙石雕是紫禁城内最大的一块石雕,重达200多吨",
        "清代殿试(科举考试最高级别)在此举行,状元、榜眼、探花由此诞生",
        "每年除夕、元宵,皇帝在此宴请少数民族首领和王公大臣"
      ],
      audioGuide: "保和殿是故宫外朝三大殿之一,清代用于举行宴会和殿试。殿后的云龙石雕重达200多吨,是紫禁城内最大的石雕。",
      hasVideo: false
    },
    {
      id: "qianqingmen",
      name: "乾清门",
      nameEnglish: "Gate of Heavenly Purity",
      order: 6,
      axisPosition: 5,
      description: "故宫内廷的正门,是外朝与内廷的分界线",
      model: "models/forbidden-city/qianqingmen.glb",
      images: [
        "images/forbidden-city/qianqingmen/exterior-1.jpg",
        "images/forbidden-city/qianqingmen/exterior-2.jpg",
        "images/forbidden-city/qianqingmen/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约16米",
        area: "约600平方米",
        style: "单檐歇山顶",
        significance: "内廷正门,外朝与内廷分界"
      },
      timeline: [
        { year: "1420", event: "乾清门初建" },
        { year: "1655", event: "清顺治年间重修" },
        { year: "1813", event: "天理教起义,曾攻入乾清门" },
        { year: "2010", event: "完成修缮,恢复历史风貌" }
      ],
      funFacts: [
        "乾清门是皇帝'御门听政'的场所之一",
        "门前的琉璃影壁是故宫内最具特色的建筑之一",
        "乾清门是外朝和内廷的分界线,文武官员非召不得入内"
      ],
      audioGuide: "乾清门是故宫内廷的正门,高约16米,是外朝与内廷的分界线。清代皇帝曾在此御门听政,处理朝政。",
      hasVideo: false
    },
    {
      id: "qianqinggong",
      name: "乾清宫",
      nameEnglish: "Palace of Heavenly Purity",
      order: 7,
      axisPosition: 6,
      description: "内廷后三宫之首,明代皇帝的寝宫,清代改为处理日常政务和接见臣工的地方",
      model: "models/forbidden-city/qianqinggong.glb",
      images: [
        "images/forbidden-city/qianqinggong/exterior-1.jpg",
        "images/forbidden-city/qianqinggong/interior-1.jpg",
        "images/forbidden-city/qianqinggong/interior-2.jpg",
        "images/forbidden-city/qianqinggong/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约20米",
        area: "约1400平方米",
        style: "重檐庑殿顶,九开间",
        significance: "明代皇帝寝宫,清代理政之所"
      },
      timeline: [
        { year: "1420", event: "乾清宫初建" },
        { year: "1514", event: "明正德年间大火,后重建" },
        { year: "1669", event: "康熙帝重建乾清宫" },
        { year: "1798", event: "嘉庆年间重修,沿用至今" },
        { year: "2020", event: "举办'往昔世相'故宫珍本古籍展" }
      ],
      funFacts: [
        "乾清宫正殿高悬'正大光明'匾,康熙帝御笔,背后曾是存放秘密立储诏书的地方",
        "明代有14位皇帝在此居住和处理朝政",
        "清代自雍正起,皇帝移居养心殿,乾清宫改为举行内廷典礼之所",
        "乾清宫前的月台上陈列有日晷和嘉量,象征皇帝掌握时间和度量衡"
      ],
      audioGuide: "乾清宫是内廷后三宫之首,明代皇帝寝宫,清代改为处理日常政务之所。殿内高悬'正大光明'匾,背后曾是存放秘密立储诏书的地方。",
      hasVideo: true,
      videoUrl: "videos/forbidden-city/qiangqinggong_growth.mp4",
      videoTitle: "乾清宫建筑生长动画",
      videoDescription: "展示乾清宫从地基到完工的完整建筑过程"
    },
    {
      id: "jiaotaidian",
      name: "交泰殿",
      nameEnglish: "Hall of Union",
      order: 8,
      axisPosition: 7,
      description: "位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方",
      model: "models/forbidden-city/jiaotaidian.glb",
      images: [
        "images/forbidden-city/jiaotaidian/exterior-1.jpg",
        "images/forbidden-city/jiaotaidian/interior-1.jpg",
        "images/forbidden-city/jiaotaidian/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约17米",
        area: "约400平方米",
        style: "单檐四角攒尖顶",
        significance: "存放宝玺、举行婚礼"
      },
      timeline: [
        { year: "1420", event: "交泰殿初建" },
        { year: "1798", event: "嘉庆年间重修" },
        { year: "1908", event: "宣统帝大婚在此举行" },
        { year: "2019", event: "修复完成,对外开放" }
      ],
      funFacts: [
        "交泰殿内存放着清代二十五方宝玺,象征皇权",
        "殿内还有一座铜壶滴漏,是古代计时器",
        "皇帝大婚时,皇后要在此接受册宝"
      ],
      audioGuide: "交泰殿位于乾清宫和坤宁宫之间,是皇帝举行婚礼和存放宝玺的地方。殿内存放着清代二十五方宝玺,象征皇权。",
      hasVideo: false
    },
    {
      id: "kunninggong",
      name: "坤宁宫",
      nameEnglish: "Palace of Earthly Tranquility",
      order: 9,
      axisPosition: 8,
      description: "内廷后三宫之一,明代是皇后的寝宫,清代改为萨满教祭祀和皇帝大婚的场所",
      model: "models/forbidden-city/kunninggong.glb",
      images: [
        "images/forbidden-city/kunninggong/exterior-1.jpg",
        "images/forbidden-city/kunninggong/interior-1.jpg",
        "images/forbidden-city/kunninggong/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "约20米",
        area: "约1300平方米",
        style: "重檐庑殿顶,九开间",
        significance: "明代皇后寝宫,清代祭祀和大婚之所"
      },
      timeline: [
        { year: "1420", event: "坤宁宫初建" },
        { year: "1655", event: "清顺治年间改建为萨满祭祀场所" },
        { year: "1674", event: "康熙帝大婚在此举行" },
        { year: "1922", event: "溥仪大婚,是最后一次在坤宁宫举行的皇家婚礼" }
      ],
      funFacts: [
        "坤宁宫在清代被改建为萨满教祭祀场所,殿内设有祭神的大锅",
        "清代皇帝大婚时,洞房设在坤宁宫东暖阁",
        "光绪帝和溥仪大婚时都在坤宁宫举行了隆重仪式",
        "坤宁宫与乾清宫对应,乾为阳,坤为阴,象征天地"
      ],
      audioGuide: "坤宁宫是内廷后三宫之一,明代皇后寝宫,清代改为萨满教祭祀和皇帝大婚的场所。殿内设有祭神的大锅,是满族特色的体现。",
      hasVideo: false
    },
    {
      id: "shenwumen",
      name: "神武门",
      nameEnglish: "Gate of Divine Might",
      order: 10,
      axisPosition: 9,
      description: "故宫的北门,始建于明永乐十八年(1420年),是故宫的出口",
      model: "models/forbidden-city/shenwumen.glb",
      images: [
        "images/forbidden-city/shenwumen/exterior-1.jpg",
        "images/forbidden-city/shenwumen/exterior-2.jpg",
        "images/forbidden-city/shenwumen/detail-1.jpg"
      ],
      basicInfo: {
        builtYear: "1420",
        dynasty: "明永乐年间",
        height: "31.6米",
        area: "约1500平方米",
        style: "重檐庑殿顶城楼",
        significance: "故宫北门,皇帝出巡、选秀女出入之门"
      },
      timeline: [
        { year: "1420", event: "神武门初建,原名玄武门" },
        { year: "1683", event: "清康熙年间改名神武门" },
        { year: "1925", event: "故宫博物院成立,神武门成为主要出口" },
        { year: "2015", event: "神武门完成修缮" }
      ],
      funFacts: [
        "神武门原名玄武门,因避康熙帝玄烨名讳而改名神武门",
        "清代选秀女时,秀女们从神武门进入紫禁城",
        "皇帝出巡时也从神武门出入",
        "神武门城楼上设有钟表,是故宫的报时中心"
      ],
      audioGuide: "神武门是故宫的北门,高31.6米,原名玄武门,因避康熙帝名讳改名。清代选秀女时,秀女们从此门进入紫禁城。",
      hasVideo: false
    }
  ]
};
