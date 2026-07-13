// 历史时期和建筑类型数据

const historyData = [
    {
        period: "pre-qin",
        name: "先秦",
        timeRange: "~221 BCE",
        description: "早期建筑形式，夯土技术成熟",
        buildings: [
            {
                type: "palace",
                name: "河南偃师二里头宫殿",
                description: "二里头宫殿遗址是中国最早的宫殿建筑之一，体现了当时的政治制度和建筑技术。夯土台基技术的应用，为后世建筑奠定了基础。",
                images: [
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (1).png.jpeg",
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (2).png.jpeg",
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (3).png.jpeg",
                    "images/palace/二里头/二里地遗址平面图 (1).jpeg.jpeg",
                    "images/palace/二里头/二里地遗址平面图 (2).jpeg.jpeg"
                ]
            },
            {
                type: "residential",
                name: "半地穴式、干栏式萌芽",
                description: "原始人类利用天然洞穴作为居住场所，后来逐渐发展为人工挖掘的洞穴。干栏式建筑是人类在树上搭建的居住结构，以避免地面的危险。",
                images: [
                    "images/residence/半地穴式/半地穴式、干栏式萌芽画作 (1).png.jpeg",
                    "images/residence/半地穴式/半地穴式、干栏式萌芽画作 (2).png.jpeg",
                    "images/residence/半地穴式/半地穴式、干栏式萌芽画作 (3).png.jpeg",
                    "images/residence/半地穴式/半地穴式、干栏式萌芽画作 (4).png.jpeg",
                    "images/residence/半地穴式/半地穴式、干栏式萌芽画作 (5).png.jpeg"
                ]
            },
            {
                type: "bridge",
                name: "木梁桥出现",
                description: "先秦时期，木梁桥开始出现，是中国古代桥梁建筑的早期形式。木梁桥的出现，为交通提供了便利。",
                images: [
                    "images/bridge/桥梁/桥梁（1）.png.jpeg",
                    "images/bridge/桥梁/桥梁（2）.png.png",
                    "images/bridge/桥梁/桥梁 (4).png.png"
                ]
            },
            {
                type: "other",
                name: "夯土台基 · 早期礼制雏形",
                description: "先秦时期，夯土台基技术成熟，早期礼制雏形开始形成。夯土台基是中国古代建筑的重要基础形式。",
                images: [
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (1).png.jpeg",
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (2).png.jpeg",
                    "images/palace/二里头/河南偃师二里头宫殿遗址图片 (3).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "qin-han",
        name: "秦汉",
        timeRange: "221 BCE – 220 CE",
        description: "木构架体系形成，规模宏大",
        buildings: [
            {
                type: "palace",
                name: "未央宫、建章宫",
                description: "汉代宫殿，规模宏大，是当时世界上最大的宫殿建筑群之一。未央宫和建章宫体现了汉代建筑的宏伟气势和技术水平。",
                images: [
                    "images/palace/未央宫、建章/未央宫 (1).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (2).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (3).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (4).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (5).png.jpeg"
                ]
            },
            {
                type: "defense",
                name: "秦长城、汉长安城",
                description: "秦汉时期，长城建筑得到发展，汉长安城是当时世界上最大的城市之一。秦长城和汉长安城体现了当时的军事技术和城市规划水平。",
                images: [
                    "images/defense/秦汉长城/秦汉长城、长安城 (1).png.jpeg",
                    "images/defense/秦汉长城/秦汉长城、长安城 (2).png.jpeg",
                    "images/defense/秦汉长城/秦汉长城、长安城 (3).png.jpeg",
                    "images/defense/秦汉长城/秦汉长城、长安城 (4).png.jpeg",
                    "images/defense/秦汉长城/秦汉长城、长安城 (5).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "庭院式住宅成熟",
                description: "秦汉时期，庭院式住宅开始成熟，是中国古代住宅的重要形式。庭院式住宅体现了中国传统的居住文化和家庭观念。",
                images: [
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (1).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (2).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (3).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (4).png.jpeg"
                ]
            },
            {
                type: "other",
                name: "高台建筑 · 斗拱雏形",
                description: "秦汉时期，高台建筑盛行，斗拱技术开始出现雏形。高台建筑和斗拱技术是中国古代建筑的重要特征。",
                images: [
                    "images/palace/未央宫、建章/未央宫 (1).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (2).png.jpeg",
                    "images/palace/未央宫、建章/未央宫 (3).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "wei-jin",
        name: "魏晋南北朝",
        timeRange: "220 – 589",
        description: "园林艺术发展，民居建筑多样化",
        buildings: [
            {
                type: "garden",
                name: "私家园林兴起",
                description: "魏晋南北朝时期，私家园林开始兴起，是中国园林艺术的重要发展阶段。私家园林体现了当时的审美观念和生活方式。",
                images: [
                    "images/garden/私家园林/魏晋南北朝私家园林建筑三视图 (1).png.jpeg",
                    "images/garden/私家园林/魏晋南北朝私家园林建筑三视图 (2).png.jpeg",
                    "images/garden/私家园林/魏晋南北朝私家园林建筑三视图 (3).png.jpeg",
                    "images/garden/私家园林/魏晋南北朝私家园林建筑三视图 (4).png.jpeg",
                    "images/garden/私家园林/魏晋南北朝私家园林建筑三视图 (5).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "坞堡建筑",
                description: "魏晋南北朝时期，坞堡建筑盛行，是一种防御性的居住建筑。坞堡建筑体现了当时的社会动荡和防御需求。",
                images: [
                    "images/residence/坞堡建筑/坞堡建筑 (1).png.jpeg",
                    "images/residence/坞堡建筑/坞堡建筑 (2).png.jpeg",
                    "images/residence/坞堡建筑/坞堡建筑 (3).png.jpeg",
                    "images/residence/坞堡建筑/坞堡建筑 (4).png.jpeg",
                    "images/residence/坞堡建筑/坞堡建筑 (5).png.jpeg",
                    "images/residence/坞堡建筑/坞堡建筑 (6).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "sui-tang",
        name: "隋唐",
        timeRange: "581 – 907",
        description: "建筑技术成熟，规模宏大",
        buildings: [
            {
                type: "palace",
                name: "大明宫含元殿",
                description: "唐代宫殿，规模宏大，是当时世界上最大的宫殿建筑群之一。大明宫含元殿体现了唐代建筑的宏伟气势和技术水平。",
                images: [
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (1).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (2).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (3).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (4).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (5).png.jpeg"
                ]
            },
            {
                type: "bridge",
                name: "赵州桥（隋）",
                description: "隋代石拱桥，是世界上最早的敞肩拱桥，至今仍在使用。赵州桥体现了隋代桥梁建筑的技术成就。",
                images: [
                    "images/bridge/赵州桥/隋唐佛光寺东大殿三视图设计 (1).png.jpeg",
                    "images/bridge/赵州桥/隋唐佛光寺东大殿三视图设计 (2).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "里坊制住宅",
                description: "隋唐时期，里坊制住宅盛行，是中国古代城市住宅的重要形式。里坊制住宅体现了当时的城市规划和居住文化。",
                images: [
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (1).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (2).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (3).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (4).png.jpeg"
                ]
            },
            {
                type: "other",
                name: "木构巅峰 · 斗拱雄大",
                description: "隋唐时期，木构建筑技术达到巅峰，斗拱雄大，结构合理。这一时期的建筑技术对后世产生了深远影响。",
                images: [
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (1).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (2).png.jpeg",
                    "images/palace/大明宫含元殿/隋唐与大明宫含元殿 (3).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "song-liao-jin",
        name: "宋辽金",
        timeRange: "960 – 1279",
        description: "《营造法式》问世，建筑规范化",
        buildings: [
            {
                type: "palace",
                name: "北宋东京城",
                description: "宋代都城，规模宏大，布局严谨。北宋东京城体现了宋代城市规划和建筑技术的成就。",
                images: [
                    "images/palace/北宋东京城/隋唐佛光寺东大殿三视图设计 (1).png.jpeg",
                    "images/palace/北宋东京城/隋唐佛光寺东大殿三视图设计 (2).png.jpeg",
                    "images/palace/北宋东京城/隋唐佛光寺东大殿三视图设计 (3).png.jpeg"
                ]
            },
            {
                type: "garden",
                name: "艮岳、沧浪亭",
                description: "宋代园林的代表作，艮岳是皇家园林，沧浪亭是私家园林。宋代园林艺术达到了很高的水平。",
                images: [
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (1).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (2).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (3).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (4).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (5).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (6).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (7).png.jpeg"
                ]
            },
            {
                type: "bridge",
                name: "泉州洛阳桥、虹桥",
                description: "宋代桥梁建筑的代表作，泉州洛阳桥是石梁桥，虹桥是木拱桥。宋代桥梁建筑技术达到了很高的水平。",
                images: [
                    "images/bridge/泉州洛阳桥 虹桥/泉州洛阳桥 虹桥 (1).png.jpeg",
                    "images/bridge/泉州洛阳桥 虹桥/泉州洛阳桥 虹桥 (2).png.jpeg",
                    "images/bridge/泉州洛阳桥 虹桥/泉州洛阳桥 虹桥 (3).png.jpeg",
                    "images/bridge/泉州洛阳桥 虹桥/泉州洛阳桥 虹桥 (4).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "《清明上河图》描绘丰富",
                description: "《清明上河图》描绘了宋代城市生活的丰富多彩，其中包括各种类型的建筑。这些建筑体现了宋代建筑的特点和风格。",
                images: [
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (1).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (2).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (3).png.jpeg",
                    "images/residence/里坊制住宅/隋唐佛光寺东大殿三视图设计 (4).png.jpeg"
                ]
            },
            {
                type: "other",
                name: "《营造法式》 · 结构规范化",
                description: "宋代李诫编著的《营造法式》是中国古代建筑的重要著作，规范了建筑结构和施工方法。《营造法式》的问世，标志着中国古代建筑的规范化。",
                images: [
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (1).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (2).png.jpeg",
                    "images/garden/艮岳、沧浪亭/艮岳、沧浪亭 (3).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "yuan",
        name: "元",
        timeRange: "1271 – 1368",
        description: "减柱法应用，大跨度木构发展",
        buildings: [
            {
                type: "palace",
                name: "元大都",
                description: "元代都城，规模宏大，布局严谨。元大都体现了元代城市规划和建筑技术的成就。",
                images: [
                    "images/palace/元大都/元大都 (1).png.jpeg",
                    "images/palace/元大都/元大都 (2).png.jpeg",
                    "images/palace/元大都/元大都 (3).png.jpeg",
                    "images/palace/元大都/元大都 (4).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "北京四合院雏形",
                description: "元代，北京四合院开始出现雏形，是中国北方传统民居的重要形式。北京四合院体现了中国传统的居住文化和家庭观念。",
                images: [
                    "images/residence/北京四合院/北京四合院 (1).png.jpeg",
                    "images/residence/北京四合院/北京四合院 (2).png.jpeg",
                    "images/residence/北京四合院/北京四合院 (3).png.jpeg"
                ]
            },
            {
                type: "other",
                name: "减柱法 · 大跨度木构",
                description: "元代，减柱法开始应用，使木构建筑能够实现更大的跨度。减柱法的应用，是中国古代建筑技术的重要创新。",
                images: [
                    "images/palace/元大都/元大都 (1).png.jpeg",
                    "images/palace/元大都/元大都 (2).png.jpeg",
                    "images/palace/元大都/元大都 (3).png.jpeg"
                ]
            }
        ]
    },
    {
        period: "ming-qing",
        name: "明清",
        timeRange: "1368 – 1911",
        description: "建筑高度成熟，紫禁城建成",
        buildings: [
            {
                type: "palace",
                name: "北京故宫",
                description: "明清两代的皇宫，是中国古代宫殿建筑的巅峰之作。北京故宫体现了中国古代建筑的技术和艺术成就。",
                images: [
                    "images/palace/北京故宫/北京故宫 (1).png.jpeg",
                    "images/palace/北京故宫/北京故宫 (2).png.jpeg",
                    "images/palace/北京故宫/北京故宫 (3).png.jpeg"
                ]
            },
            {
                type: "garden",
                name: "颐和园、拙政园",
                description: "明清时期园林的代表作，颐和园是皇家园林，拙政园是私家园林。明清园林艺术达到了很高的水平。",
                images: [
                    "images/garden/颐和园/颐和园 拙政园 (1).png.jpeg",
                    "images/garden/颐和园/颐和园 拙政园 (2).png.jpeg",
                    "images/garden/颐和园/颐和园 拙政园 (3).png.jpeg"
                ]
            },
            {
                type: "defense",
                name: "明长城、西安城墙",
                description: "明清时期，防御建筑得到发展，明长城和西安城墙是这一时期的代表作。这些建筑体现了当时的军事技术和工程水平。",
                images: [
                    "images/defense/明长城 西安城墙/明长城 (1).png.jpeg",
                    "images/defense/明长城 西安城墙/明长城 (2).png.jpeg",
                    "images/defense/明长城 西安城墙/明长城 (3).png.jpeg",
                    "images/defense/明长城 西安城墙/明长城 (4).png.jpeg",
                    "images/defense/明长城 西安城墙/明长城 (5).png.jpeg",
                    "images/defense/明长城 西安城墙/明长城 (6).png.jpeg"
                ]
            },
            {
                type: "residential",
                name: "福建土楼、徽派建筑",
                description: "明清时期民居的代表作，福建土楼是南方民居的代表，徽派建筑是徽州地区的传统建筑。这些建筑体现了中国传统的居住文化和建筑艺术。",
                images: [
                    "images/residence/福建土楼 徽派建筑/福建土楼 徽派建筑 (1).png.jpeg",
                    "images/residence/福建土楼 徽派建筑/福建土楼 徽派建筑 (2).png.jpeg",
                    "images/residence/福建土楼 徽派建筑/福建土楼 徽派建筑 (3).png.jpeg"
                ]
            },
            {
                type: "bridge",
                name: "卢沟桥、十七孔桥",
                description: "明清时期桥梁建筑的代表作，卢沟桥以其精美的石狮雕刻闻名，十七孔桥是颐和园中的著名桥梁。这些桥梁体现了明清时期桥梁建筑的技术和艺术成就。",
                images: [
                    "images/bridge/卢沟桥 十七孔桥/卢沟桥 (2).png.jpeg",
                    "images/bridge/卢沟桥 十七孔桥/卢沟桥 (3).png.jpeg",
                    "images/bridge/卢沟桥 十七孔桥/十七孔桥.png.jpeg"
                ]
            },
            {
                type: "other",
                name: "琉璃瓦普及 · 斗拱装饰化",
                description: "明清时期，琉璃瓦开始普及，斗拱逐渐装饰化。这些变化体现了明清时期建筑的特点和风格。",
                images: [
                    "images/palace/北京故宫/北京故宫 (1).png.jpeg",
                    "images/palace/北京故宫/北京故宫 (2).png.jpeg",
                    "images/palace/北京故宫/北京故宫 (3).png.jpeg"
                ]
            }
        ]
    }
];

// 各时期的综合信息（用于横向时间轴展示）
const eraSummaryData = [
    {
        period: "pre-qin",
        title: "先秦",
        timeRange: "~前221年",
        icon: "🏛️",
        color: "#8B7355",
        tagline: "建筑起源，夯土为基，木骨泥墙初现文明曙光",
        innovations: [
            "夯土台基技术成熟，奠定中国建筑基础体系",
            "干栏式与半地穴式两种居住形态并存",
            "木骨泥墙结构出现，原始榫卯萌芽"
        ],
        history: [
            "河姆渡遗址发现距今7000年前的干栏式建筑遗迹",
            "仰韶文化出现夯土技术，为后世宫殿奠基",
            "二里头遗址发现中国最早的宫殿建筑群",
            "《考工记》记载早期营建制度雏形"
        ],
        heritage: [
            "河南偃师二里头宫殿遗址 — 中国最早宫殿",
            "浙江河姆渡干栏式建筑遗迹 — 7000年木构智慧",
            "西安半坡遗址 — 半地穴式聚落布局"
        ]
    },
    {
        period: "qin-han",
        title: "秦汉",
        timeRange: "前221 – 220年",
        icon: "🏯",
        color: "#B5655D",
        tagline: "大一统气象，高台盛行，木构架体系基本形成",
        innovations: [
            "木构架体系基本形成，抬梁式和穿斗式并行发展",
            "斗拱技术出现雏形，成为重要结构构件",
            "砖瓦大规模应用，琉璃瓦诞生",
            "高台建筑盛行，体现皇权至上理念"
        ],
        history: [
            "秦始皇统一六国后营建阿房宫、骊山陵",
            "汉长安城规模宏大，设九市十六闾",
            "张骞通西域后，中外建筑文化交流开始",
            "《汉书·食货志》记载城市营建制度"
        ],
        heritage: [
            "阿房宫遗址 — 天下第一宫的宏伟规划",
            "汉长安城遗址 — 当时世界最大都城",
            "秦始皇陵兵马俑 — 地下军阵的营造奇迹",
            "霍去病墓石刻 — 汉代陵墓雕刻艺术巅峰"
        ]
    },
    {
        period: "wei-jin",
        title: "魏晋南北朝",
        timeRange: "220 – 589年",
        icon: "🎋",
        color: "#2E8B57",
        tagline: "佛教东传，园林兴起，民族融合催生新风格",
        innovations: [
            "佛教传入带来佛塔、寺庙等新建筑类型",
            "私家园林兴起，山水审美融入建筑",
            "坞堡建筑发展，体现防御性民居特色",
            "石窟寺建筑达到高峰（云冈、龙门）"
        ],
        history: [
            "佛教经丝绸之路传入，掀起建寺热潮",
            "洛阳白马寺成为中国第一座佛寺",
            "士族阶层推动园林艺术从实用向审美转变",
            "北魏孝文帝迁都洛阳，促进南北建筑融合"
        ],
        heritage: [
            "云冈石窟 — 北魏皇家石窟建筑典范",
            "龙门石窟 — 北魏至唐代石刻艺术宝库",
            "南朝建康台城遗址 — 六朝都城遗存",
            "嵩岳寺塔 — 中国现存最早砖塔"
        ]
    },
    {
        period: "sui-tang",
        title: "隋唐",
        timeRange: "581 – 907年",
        icon: "🌟",
        color: "#DAA520",
        tagline: "木构巅峰，气势恢宏，东方建筑文明黄金时代",
        innovations: [
            "木构技术达到巅峰，斗拱雄大有力",
            "里坊制城市规划成熟，长安城为世界最大都市",
            "石拱桥技术突破（赵州桥）",
            "彩画、雕刻等装饰艺术高度发展"
        ],
        history: [
            "隋代李春设计赵州桥，开创敞肩拱先河",
            "唐长安城面积达84平方公里，布局严整",
            "大明宫含元殿展现盛唐气象",
            "日本遣唐使将唐风建筑带回日本（唐招提寺）"
        ],
        heritage: [
            "佛光寺东大殿 — 现存最早木构殿堂",
            "南禅寺大殿 — 唐代木构精品",
            "赵州桥 — 世界最古敞肩石拱桥",
            "大雁塔与小雁塔 — 唐代佛塔双璧"
        ]
    },
    {
        period: "song-liao-jin",
        title: "宋辽金",
        timeRange: "960 – 1279年",
        icon: "📚",
        color: "#4682B4",
        tagline: "营造法式，精致典雅，江南园林与北方雄浑并立",
        innovations: [
            "《营造法式》颁布，建筑标准化、模数化",
            "园林艺术从皇家扩展到文人阶层",
            "桥梁技术多样化（石梁桥、木拱桥）",
            "彩画体系完善（和玺、旋子、苏式）"
        ],
        history: [
            "李诫编著《营造法式》，确立材分制标准",
            "艮岳建造代表宋代皇家园林最高水平",
            "清明上河图记录汴京城市建筑风貌",
            "泉州洛阳桥开创筏形基础筑桥法"
        ],
        heritage: [
            "应县木塔 — 世界最高最古木塔",
            "晋祠圣母殿 — 宋代建筑艺术杰作",
            "苏州沧浪亭 — 中国现存最古老园林",
            "泉州洛阳桥 — 中国古代四大名桥之一"
        ]
    },
    {
        period: "yuan",
        title: "元",
        timeRange: "1271 – 1368年",
        icon: "⚔️",
        color: "#8B4513",
        tagline: "减柱革新，多元交融，草原文化与中原建筑碰撞",
        innovations: [
            "减柱法和移柱法广泛应用，扩大室内空间",
            "出现铺作层代替梁架的新趋势",
            "元大都规划影响明清北京城布局",
            "宗教建筑多元发展（藏传佛教、伊斯兰建筑）"
        ],
        history: [
            "刘秉忠规划元大都，确立中轴线布局",
            "四合院形式在元代趋于成熟",
            "西藏萨迦寺等藏式建筑传入中原",
            "泉州港贸易繁荣带来异域建筑风格"
        ],
        heritage: [
            "元大都城墙遗址 — 北京城规划源头",
            "永乐宫 — 元代道教建筑与壁画瑰宝",
            "北京四合院 — 传统民居形态定型",
            "泉州清净寺 — 中国最古老清真寺之一"
        ]
    },
    {
        period: "ming-qing",
        title: "明清",
        timeRange: "1368 – 1911年",
        icon: "👑",
        color: "#9A5048",
        tagline: "紫禁巍峨，规制森严，中国古代营造技艺集大成",
        innovations: [
            "琉璃瓦全面普及，色彩等级制度完备",
            "斗拱装饰化，结构功能减弱",
            "园林艺术登峰造极（皇家+私家）",
            "建筑彩画体系高度规范化"
        ],
        history: [
            "明成祖营建北京紫禁城，动用百万工匠",
            "清《工程做法则例》进一步规范建筑制度",
            "颐和园、圆明园代表皇家园林最高成就",
            "福建土楼、徽派建筑等地域民居百花齐放"
        ],
        heritage: [
            "北京故宫 — 世界最大宫殿建筑群",
            "颐和园 — 中国现存最大皇家园林",
            "拙政园 — 江南园林典范",
            "明十三陵 — 明代帝陵建筑群",
            "福建土楼 — 世界文化遗产，东方城堡"
        ]
    }
];

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = historyData;
} else if (typeof window !== 'undefined') {
    window.historyData = historyData;
    window.eraSummaryData = eraSummaryData;
}
