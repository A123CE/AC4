// 数据可视化图表

// 初始化所有图表
function initCharts() {
    initTechTrendChart();
    initTechTimelineChart();
    initTechDistributionChart();
    initLayoutPlanChart();
    initLayoutLevelChart();
    initAchievementRadarChart();
    initAchievementContributionChart();
}

// 建筑技术发展趋势图表
function initTechTrendChart() {
    const chartDom = document.getElementById('techTrendChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '建筑技术发展趋势',
            left: 'left',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['木构架技术', '砖瓦技术', '斗拱技术', '榫卯技术'],
            textStyle: {
                color: '#7C5F3A'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['原始社会', '夏商周', '秦汉', '魏晋南北朝', '隋唐', '宋元', '明清'],
            axisLabel: {
                color: '#7C5F3A',
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        series: [
            {
                name: '木构架技术',
                type: 'line',
                data: [10, 30, 60, 75, 90, 95, 98],
                lineStyle: {
                    color: '#B5655D'
                },
                itemStyle: {
                    color: '#B5655D'
                }
            },
            {
                name: '砖瓦技术',
                type: 'line',
                data: [5, 20, 45, 60, 75, 85, 90],
                lineStyle: {
                    color: '#7C5F3A'
                },
                itemStyle: {
                    color: '#7C5F3A'
                }
            },
            {
                name: '斗拱技术',
                type: 'line',
                data: [0, 15, 40, 65, 85, 90, 92],
                lineStyle: {
                    color: '#FFD700'
                },
                itemStyle: {
                    color: '#FFD700'
                }
            },
            {
                name: '榫卯技术',
                type: 'line',
                data: [5, 25, 50, 70, 85, 90, 95],
                lineStyle: {
                    color: '#8B4513'
                },
                itemStyle: {
                    color: '#8B4513'
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 技术发展时间线图表
function initTechTimelineChart() {
    const chartDom = document.getElementById('techTimelineChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '技术发展时间线',
            left: 'center',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        yAxis: {
            type: 'category',
            data: ['榫卯技术', '木构架技术', '砖瓦技术', '斗拱技术', '《营造法式》', '园林技术', '建筑标准化'],
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        series: [
            {
                name: '技术发展',
                type: 'custom',
                renderItem: function(params, api) {
                    const categoryIndex = api.value(0);
                    const start = api.coord([api.value(1), categoryIndex]);
                    const end = api.coord([api.value(2), categoryIndex]);
                    const height = api.size([0, 1])[1] * 0.6;
                    
                    const rectShape = echarts.graphic.clipRectByRect({
                        x: start[0],
                        y: start[1] - height / 2,
                        width: end[0] - start[0],
                        height: height
                    }, {
                        x: params.coordSys.x,
                        y: params.coordSys.y,
                        width: params.coordSys.width,
                        height: params.coordSys.height
                    });
                    
                    return rectShape && {
                        type: 'rect',
                        shape: rectShape,
                        style: api.style()
                    };
                },
                itemStyle: {
                    color: function(params) {
                        const colors = ['#B5655D', '#7C5F3A', '#D4B483', '#E6D7C4', '#FFD700', '#8B4513', '#9A5048'];
                        return colors[params.dataIndex];
                    }
                },
                encode: {
                    x: [1, 2],
                    y: 0
                },
                data: [
                    [0, new Date(-8000, 0, 1), new Date(1911, 0, 1)],
                    [1, new Date(-3000, 0, 1), new Date(1911, 0, 1)],
                    [2, new Date(-1000, 0, 1), new Date(1911, 0, 1)],
                    [3, new Date(-500, 0, 1), new Date(1911, 0, 1)],
                    [4, new Date(1100, 0, 1), new Date(1911, 0, 1)],
                    [5, new Date(300, 0, 1), new Date(1911, 0, 1)],
                    [6, new Date(1100, 0, 1), new Date(1911, 0, 1)]
                ]
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 技术应用分布图表
function initTechDistributionChart() {
    const chartDom = document.getElementById('techDistributionChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '技术应用分布',
            left: 'center',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            position: 'top'
        },
        grid: {
            height: '50%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: ['宫殿', '宗教', '民居', '园林', '桥梁', '陵墓'],
            axisLabel: {
                color: '#7C5F3A',
                rotate: 45
            }
        },
        yAxis: {
            type: 'category',
            data: ['木构架', '斗拱', '榫卯', '砖瓦', '园林', '桥梁'],
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
                color: ['#E6D7C4', '#D4B483', '#7C5F3A', '#B5655D']
            }
        },
        series: [
            {
                name: '应用程度',
                type: 'heatmap',
                data: [
                    [0, 0, 95], [0, 1, 90], [0, 2, 85], [0, 3, 70], [0, 4, 50], [0, 5, 80],
                    [1, 0, 90], [1, 1, 85], [1, 2, 70], [1, 3, 60], [1, 4, 40], [1, 5, 75],
                    [2, 0, 70], [2, 1, 60], [2, 2, 95], [2, 3, 50], [2, 4, 30], [2, 5, 40],
                    [3, 0, 60], [3, 1, 50], [3, 2, 40], [3, 3, 95], [3, 4, 20], [3, 5, 30],
                    [4, 0, 30], [4, 1, 20], [4, 2, 30], [4, 3, 10], [4, 4, 95], [4, 5, 20],
                    [5, 0, 80], [5, 1, 75], [5, 2, 60], [5, 3, 40], [5, 4, 30], [5, 5, 90]
                ],
                label: {
                    show: true,
                    color: '#2F2E2E'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 典型布局平面图
function initLayoutPlanChart() {
    const chartDom = document.getElementById('layoutPlanChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '典型布局平面图',
            left: 'center',
            top: 5,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}'
        },
        series: [
            {
                type: 'graph',
                layout: 'none',
                symbolSize: 50,
                roam: true,
                label: {
                    show: true,
                    color: '#2F2E2E'
                },
                edgeSymbol: ['circle', 'arrow'],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    fontSize: 12,
                    color: '#7C5F3A'
                },
                data: [
                    { name: '正门', x: 300, y: 100, itemStyle: { color: '#B5655D' } },
                    { name: '前殿', x: 300, y: 200, itemStyle: { color: '#7C5F3A' } },
                    { name: '中殿', x: 300, y: 300, itemStyle: { color: '#7C5F3A' } },
                    { name: '后殿', x: 300, y: 400, itemStyle: { color: '#7C5F3A' } },
                    { name: '东配殿', x: 200, y: 300, itemStyle: { color: '#D4B483' } },
                    { name: '西配殿', x: 400, y: 300, itemStyle: { color: '#D4B483' } },
                    { name: '东厢房', x: 200, y: 200, itemStyle: { color: '#E6D7C4' } },
                    { name: '西厢房', x: 400, y: 200, itemStyle: { color: '#E6D7C4' } }
                ],
                links: [
                    { source: '正门', target: '前殿' },
                    { source: '前殿', target: '中殿' },
                    { source: '中殿', target: '后殿' },
                    { source: '中殿', target: '东配殿' },
                    { source: '中殿', target: '西配殿' },
                    { source: '前殿', target: '东厢房' },
                    { source: '前殿', target: '西厢房' }
                ],
                lineStyle: {
                    opacity: 0.9,
                    width: 2,
                    curveness: 0,
                    color: '#7C5F3A'
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 规制等级对比图表
function initLayoutLevelChart() {
    const chartDom = document.getElementById('layoutLevelChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '规制等级对比',
            left: 'left',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: ['建筑规模', '装饰等级', '屋顶等级', '台基高度'],
            textStyle: {
                color: '#7C5F3A'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['帝王', '诸侯', '官员', '平民'],
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#7C5F3A'
            }
        },
        series: [
            {
                name: '建筑规模',
                type: 'bar',
                data: [100, 80, 60, 30],
                itemStyle: {
                    color: '#B5655D'
                }
            },
            {
                name: '装饰等级',
                type: 'bar',
                data: [100, 75, 50, 20],
                itemStyle: {
                    color: '#7C5F3A'
                }
            },
            {
                name: '屋顶等级',
                type: 'bar',
                data: [100, 70, 40, 10],
                itemStyle: {
                    color: '#FFD700'
                }
            },
            {
                name: '台基高度',
                type: 'bar',
                data: [100, 60, 30, 0],
                itemStyle: {
                    color: '#8B4513'
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 成就影响评估雷达图
function initAchievementRadarChart() {
    const chartDom = document.getElementById('achievementRadarChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '成就影响评估',
            left: 'left',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {},
        legend: {
            data: ['结构成就', '艺术成就', '技术成就', '文化价值'],
            textStyle: {
                color: '#7C5F3A'
            }
        },
        radar: {
            indicator: [
                { name: '历史影响', max: 100 },
                { name: '技术创新', max: 100 },
                { name: '文化传承', max: 100 },
                { name: '艺术价值', max: 100 },
                { name: '现代启示', max: 100 }
            ],
            axisName: {
                color: '#7C5F3A'
            }
        },
        series: [
            {
                name: '成就评估',
                type: 'radar',
                data: [
                    {
                        value: [95, 90, 85, 80, 85],
                        name: '结构成就',
                        areaStyle: {
                            color: 'rgba(181, 101, 93, 0.3)'
                        },
                        lineStyle: {
                            color: '#B5655D'
                        },
                        itemStyle: {
                            color: '#B5655D'
                        }
                    },
                    {
                        value: [90, 80, 85, 95, 90],
                        name: '艺术成就',
                        areaStyle: {
                            color: 'rgba(124, 95, 58, 0.3)'
                        },
                        lineStyle: {
                            color: '#7C5F3A'
                        },
                        itemStyle: {
                            color: '#7C5F3A'
                        }
                    },
                    {
                        value: [85, 95, 90, 75, 95],
                        name: '技术成就',
                        areaStyle: {
                            color: 'rgba(255, 215, 0, 0.3)'
                        },
                        lineStyle: {
                            color: '#FFD700'
                        },
                        itemStyle: {
                            color: '#FFD700'
                        }
                    },
                    {
                        value: [95, 85, 95, 90, 85],
                        name: '文化价值',
                        areaStyle: {
                            color: 'rgba(139, 69, 19, 0.3)'
                        },
                        lineStyle: {
                            color: '#8B4513'
                        },
                        itemStyle: {
                            color: '#8B4513'
                        }
                    }
                ]
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 历史贡献度分析图表
function initAchievementContributionChart() {
    const chartDom = document.getElementById('achievementContributionChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '历史贡献度分析',
            left: 'center',
            top: 10,
            textStyle: {
                color: '#B5655D'
            }
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: {
                color: '#7C5F3A'
            }
        },
        series: [
            {
                name: '历史贡献度',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2,
                    color: function(params) {
                        const colors = ['#B5655D', '#7C5F3A', '#D4B483', '#E6D7C4', '#FFD700', '#8B4513', '#9A5048'];
                        return colors[params.dataIndex];
                    }
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold',
                        color: '#2F2E2E'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: 30, name: '木构架体系' },
                    { value: 20, name: '斗拱技术' },
                    { value: 15, name: '榫卯技术' },
                    { value: 10, name: '园林艺术' },
                    { value: 10, name: '建筑礼制' },
                    { value: 15, name: '其他技术' }
                ]
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}
