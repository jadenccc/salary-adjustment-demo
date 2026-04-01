/* === data.js === 数据层：员工数据 + 常量配置 + 组织树 + 全局状态 */

/* ─────────────────────────────────────────────
 * 数据生成辅助函数
 * ───────────────────────────────────────────── */

/**
 * 随机生成两期绩效标签（用于员工初始化）
 * @returns {{ text: string, symbol: string }[]}
 */
function generatePerformanceTags() {
    const tags = ['达到', '略低', '低于', '略超', '超出'];
    const symbols = ['―', '↓', '↓↓', '↑', '↑↑'];
    const index1 = Math.floor(Math.random() * tags.length);
    let index2 = Math.floor(Math.random() * tags.length);
    while (index2 === index1) {
        index2 = Math.floor(Math.random() * tags.length);
    }
    return [
        { text: tags[index1], symbol: symbols[index1] },
        { text: tags[index2], symbol: symbols[index2] }
    ];
}

/* ─────────────────────────────────────────────
 * 员工数据（30人 Demo 数据集）
 * ───────────────────────────────────────────── */

const employees = [
    { id: 1,  name: '李四',   level: '3-1', dept: '后端研发',     salary: 35000, performance: 'A',  performanceScore: 4.2, tags: ['核心'],   tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 2 },
    { id: 2,  name: '王五',   level: '2-2', dept: '测试',         salary: 35000, performance: 'B+', performanceScore: 3.8, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), recentPromotion: true },
    { id: 3,  name: '赵六',   level: '3-2', dept: '测试',         salary: 52000, performance: 'A+', performanceScore: 4.5, tags: ['潜力'],   tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 4,  name: '孙七',   level: '3-1', dept: '前端研发',     salary: 48000, performance: 'A',  performanceScore: 4.1, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 5,  name: '周八',   level: '2-2', dept: '产品',         salary: 26000, performance: 'B',  performanceScore: 3.5, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 2 },
    { id: 6,  name: '吴九',   level: '3-1', dept: '算法',         salary: 40000, performance: 'A',  performanceScore: 4.3, tags: [],         tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 2 },
    { id: 7,  name: '郑十',   level: '2-2', dept: '运维',         salary: 22000, performance: 'B+', performanceScore: 3.9, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 8,  name: '陈十一', level: '3-1', dept: '测试',         salary: 35000, performance: 'B+', performanceScore: 3.7, tags: [],         tier: '绩效优秀', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 9,  name: '刘十二', level: '2-1', dept: '后端研发',     salary: 22000, performance: 'B+', performanceScore: 3.8, tags: [],         tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1 },
    { id: 10, name: '黄十三', level: '3-1', dept: '数据',         salary: 36000, performance: 'A',  performanceScore: 4.2, tags: ['激活'],   tier: '激活',     adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 11, name: '张十四', level: '2-2', dept: '前端研发',     salary: 30000, performance: 'A',  performanceScore: 4.0, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags(), recentPromotion: true },
    { id: 12, name: '林十五', level: '3-2', dept: '技术管理研发', salary: 52000, performance: 'A',  performanceScore: 4.6, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 13, name: '何十六', level: '2-2', dept: '测试',         salary: 29500, performance: 'B',  performanceScore: 3.4, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1 },
    { id: 14, name: '罗十七', level: '3-1', dept: '算法',         salary: 38000, performance: 'A',  performanceScore: 4.1, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 15, name: '高十八', level: '2-1', dept: '产品',         salary: 21000, performance: 'B',  performanceScore: 3.3, tags: [],         tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 2 },
    { id: 16, name: '钱十九', level: '2-2', dept: '后端研发',     salary: 31000, performance: 'B+', performanceScore: 3.9, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 17, name: '孙二十', level: '3-1', dept: '安全',         salary: 46000, performance: 'A',  performanceScore: 4.2, tags: [],         tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 1 },
    { id: 18, name: '李二一', level: '2-2', dept: '运维',         salary: 31500, performance: 'B+', performanceScore: 3.8, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 19, name: '周二二', level: '2-1', dept: '前端研发',     salary: 23000, performance: 'B+', performanceScore: 3.7, tags: [],         tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 20, name: '吴二三', level: '3-1', dept: '数据',         salary: 35500, performance: 'A',  performanceScore: 4.0, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 21, name: '郑二四', level: '2-2', dept: '测试',         salary: 27500, performance: 'B',  performanceScore: 3.5, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), recentPromotion: true },
    { id: 22, name: '王二五', level: '3-2', dept: '架构研发',     salary: 57000, performance: 'A+', performanceScore: 4.7, tags: ['潜力'],   tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 3 },
    { id: 23, name: '赵二六', level: '2-2', dept: '产品',         salary: 25000, performance: 'B',  performanceScore: 3.4, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 24, name: '刘二七', level: '3-1', dept: '产品',         salary: 34000, performance: 'A',  performanceScore: 4.1, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 25, name: '陈二八', level: '2-1', dept: '数据',         salary: 24000, performance: 'B+', performanceScore: 3.8, tags: [],         tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 26, name: '杨二九', level: '2-2', dept: '前端研发',     salary: 29500, performance: 'B+', performanceScore: 3.9, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 27, name: '黄三十', level: '3-1', dept: '产品',         salary: 38500, performance: 'A',  performanceScore: 4.2, tags: [],         tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 28, name: '徐三一', level: '2-2', dept: '运维',         salary: 28000, performance: 'B',  performanceScore: 3.6, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags() },
    { id: 29, name: '朱三二', level: '2-1', dept: '数据',         salary: 22500, performance: 'B',  performanceScore: 3.5, tags: ['激活'],   tier: '待提升',   adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1 },
    { id: 30, name: '马三三', level: '2-2', dept: '测试',         salary: 22000, performance: 'B',  performanceScore: 3.6, tags: [],         tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags() }
];

// 初始化员工扩展字段
employees.forEach(e => {
    e.adjustmentReason = e.adjustmentReason || '';
    e.managerNote = e.managerNote || '';
});
employees[5].managerNote = 'TL 关注，适度倾斜';

/** 当前审批人ID（demo 中林十五 id=12 作为审批人，用于「只看汇报给我」筛选） */
var APPROVAL_CURRENT_USER_ID = 12;

// 为 demo 添加汇报关系：id 1-9 的员工汇报给当前审批人
[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function(id) {
    var e = employees.find(function(x) { return x.id === id; });
    if (e) e.managerId = APPROVAL_CURRENT_USER_ID;
});

/* ─────────────────────────────────────────────
 * 常量配置
 * ───────────────────────────────────────────── */

/** 信息点类型配置（颜色、图标、名称） */
const INFO_POINT_TYPES = {
    active:       { color: '#2E9E6A', icon: '●', name: '人员状态' },
    personTag:    { color: '#3B6FCC', icon: '◆', name: '人员标签' },
    noRaiseTwice: { color: '#D94F2B', icon: '！', name: '异常历史记录' },
    note:         { color: '#7352B2', icon: '✎', name: '批注' }
};

/** 各职级调薪上限（%） */
const LEVEL_RAISE_CAP = { '2-1': 15, '2-2': 12, '3-1': 10, '3-2': 8 };

/** 默认隐藏的信息点类型集合 */
let infoPointHidden = new Set();
(function() { infoPointHidden.add('note'); })();

/** 人员激活状态映射（empId → 状态描述） */
var ACTIVE_STATUS_MAP = { 1: '人员处于激活中', 2: '人员处于激活中', 30: '人员内部流转中', 4: '人员离职交接中' };

/** 人员标签映射（empId → 标签文字） */
var PERSON_TAG_MAP = { 5: '2024年校招生', 6: '2024年校招生', 7: '2023年校招生', 3: '模块负责人' };

/** 事项池（用于 getMatters 伪随机生成员工事项列表） */
const MATTERS_POOL = ['五星角色', '新地图', 'boss战斗', '星铁活动', '角色技能', '剧情线推进', '版本大世界内容', '多语言本地化', '角色立绘与动效', '玩法系统迭代', '新手引导优化', '联机玩法设计'];

/**
 * 获取员工当前负责的事项列表（基于 id 伪随机）
 * @param {Object} emp - 员工对象
 * @returns {string[]}
 */
function getMatters(emp) {
    const n = 2 + (emp.id % 4);
    const list = [];
    for (let i = 0; i < n; i++) {
        const idx = (emp.id * 3 + i * 7) % MATTERS_POOL.length;
        list.push(MATTERS_POOL[idx]);
    }
    return list;
}

/* ─────────────────────────────────────────────
 * 全局 UI 状态
 * ───────────────────────────────────────────── */

/** 当前视图：'table' | 'scatter' | 'grid' */
let currentView = 'table';

/** 是否处于圈选模式 */
let circleSelectMode = false;

/** 圈选对比中的员工 ID 集合 */
let selectedForCompare = new Set();

/** 异常滑出框自动隐藏定时器 ID */
let slideOutHideTid = null;

/** 是否隐藏已调薪卡片 */
let hideAdjustedCards = false;

/** 当前在抽屉中展示的员工对象 */
let selectedEmployee = null;

/** 筛选条件 */
let filters = {
    performance: 'all',
    tag: 'all',
    adjusted: 'all',
    circleGroup: 'all'
};

/** 轴筛选模式：'none' | 'include' | 'exclude' */
let axisFilterMode = 'none';

/** 轴筛选目标值 */
let axisFilterTarget = '';

/** 横轴标题展示类型：'level'（职级）| 'tier'（梯队），默认梯队 */
let axisXLabelType = 'tier';

/** 圈人分组列表：{ id, name: string, empIds: number[] }[] */
let circleGroups = [];

/** 下一个圈人分组 ID */
let circleGroupNextId = 1;

/** 收起的分组名集合 */
let circleGroupsCollapsed = new Set();

/** 分组收起时保留的位置：{ groupName: { left, top } } */
let circleGroupLastPositions = {};

/** 调薪后卡片显示「原xxk T1」的原始数据：{ empId: { originalSalaryK, originalLevel } } */
let cardGhosts = {};

/** 首次拖动后在初始位置显示的可点击阴影：{ empId: { leftPct, topPct, name, origSalaryK, origLevel } } */
let empInitialShadows = {};

/** 撤销栈：每项 { entries: [{ empId, origLeft, origTop, origAdjustment }] } */
let undoStack = [];

/** 薪资轴最小值（K），由当前可见人员自适应 */
let salaryAxisMinK = 20;

/** 薪资轴最大值（K），由当前可见人员自适应 */
let salaryAxisMaxK = 60;

/** 填报模式下已填报绩效的人员 ID 集合（用于去除卡片遮罩、恢复可拖动） */
var perfFilledIds = new Set();

/* ─────────────────────────────────────────────
 * 组织树配置
 * ───────────────────────────────────────────── */

/** 实体组织树末级节点（快照），用于人员视角切换 */
const ENTITY_ORG_LEAFS = [
    { id: 'leaf1', name: '项目组·原神', leaders: ['李四', '王五', '赵六', '孙七'] },
    { id: 'leaf2', name: '项目组·星铁', leaders: ['周八', '吴九', '郑十'] },
    { id: 'leaf3', name: '项目组·未定', leaders: ['陈十一', '刘十二'] },
    { id: 'leaf4', name: '技术中台',     leaders: ['黄十三', '张十四', '林十五'] }
];

/** 当前选中的 Leader ID（人员视角），null 表示全部 */
let currentPerspectiveLeaderId = null;

/* ─────────────────────────────────────────────
 * 任务类型配置
 * ───────────────────────────────────────────── */

/** 任务步骤类型配置（标签、颜色） */
const TYPE_CFG = {
    sal:  { label: '薪酬回顾', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
    perf: { label: '绩效回顾', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
    lvl:  { label: '职级回顾', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
    ttp:  { label: 'TTP提报',  color: '#c2410c', bg: 'rgba(194, 65, 12, 0.12)' },
    int:  { label: '面谈反馈', color: '#0e7490', bg: 'rgba(14, 116, 144, 0.12)' }
};

/** 步骤展示顺序 */
var STEP_ORDER = ['perf', 'sal', 'lvl'];

/** 步骤标签文字 */
var STEP_LABELS = { perf: '绩效填报', sal: '薪酬回顾', lvl: '职级回顾' };

/** 填报截止日期 */
const FILL_DDL = { perf: '03-05', sal: '03-15' };

/** 填报任务涉及的员工 ID 列表 */
var FILL_TASK_PEOPLE_IDS = [1, 2, 3, 4, 6, 8, 9, 13, 16, 17, 19, 21, 22, 30];

/**
 * 当前用户待办任务列表
 * Demo 采用多任务场景：显示待填报优先，首次打开自动进入任务态
 */
const MY_TASKS = {
    fill: [
        {
            id: 'fill1', role: 'fill', title: '2026年7月绩效+薪酬回顾', tagLabel: '待填报',
            steps: [
                { type: 'perf', ddl: '03-05', daysLeft: 1,  filled: 0, total: 14, peopleIds: FILL_TASK_PEOPLE_IDS.slice(), rejected: false },
                { type: 'sal',  ddl: '03-15', daysLeft: 11, filled: 4, total: 14, peopleIds: FILL_TASK_PEOPLE_IDS.slice(), rejected: false }
            ]
        }
    ],
    approve: [
        {
            id: 'approve1', role: 'approve', dept: '技术中台', title: '2026年7月绩效+薪酬回顾',
            tagLabel: '待审批', currentNodeLabel: '待我审批', isMyNode: true,
            steps: [
                { type: 'lvl', ddl: '03-10', daysLeft: 4, filled: 5, total: 5, peopleIds: [5, 15, 23, 24, 27], rejected: false }
            ]
        },
        {
            id: 'approve2', role: 'approve', dept: '项目组·星铁', title: '2026年6月绩效+薪酬回顾',
            tagLabel: '待审批', currentNodeLabel: 'Leader 审批中', isMyNode: false,
            steps: [
                { type: 'perf', ddl: '03-05', daysLeft: 1, filled: 3, total: 3, peopleIds: [10, 11, 12], rejected: false }
            ]
        },
        {
            id: 'approve3', role: 'approve', dept: '项目组·原神', title: '2026年5月薪酬回顾',
            tagLabel: '待审批', currentNodeLabel: '待我审批', isMyNode: true,
            steps: [
                { type: 'sal', ddl: '03-15', daysLeft: 11, filled: 0, total: 8, peopleIds: [1, 2, 3, 4, 6, 7, 8, 9], rejected: false }
            ]
        }
    ]
};

/* ─────────────────────────────────────────────
 * 散点图轴结构配置
 * ───────────────────────────────────────────── */

/** 部门-职级结构（用于散点图纵轴分组） */
const DEPT_LEVEL_STRUCT = [
    { dept: '研发部门', levels: ['3-2', '3-1', '2-2', '2-1'] },
    { dept: '测试部门', levels: ['3-2', '3-1', '2-2', '2-1'] },
    { dept: '产品部门', levels: ['3-2', '3-1', '2-2', '2-1'] },
    { dept: '其他部门', levels: ['3-2', '3-1', '2-2', '2-1'] }
];

/** 部门-梯队结构（用于散点图纵轴分组，默认使用） */
const DEPT_TIER_STRUCT = [
    { dept: '研发部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '测试部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '产品部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '其他部门', levels: ['T0', 'T1', 'T2', 'T3'] }
];

/** 梯队代号 → 展示标签 */
const TIER_TO_LABEL = { T0: '明星员工', T1: '核心骨干', T2: '稳定发展', T3: '潜力新人' };

/** 展示标签 → 梯队代号 */
const LABEL_TO_TIER = { '明星员工': 'T0', '核心骨干': 'T1', '稳定发展': 'T2', '潜力新人': 'T3', '待提升': 'T3', '激活': 'T2', '绩效优秀': 'T1' };

/* ─────────────────────────────────────────────
 * 绩效评级辅助
 * ───────────────────────────────────────────── */

/** 绩效评级选项列表 */
var PERF_RATING_OPTIONS = ['达到预期', '略低于预期', '低于预期', '略超出预期', '超出预期'];

/**
 * 根据种子值伪随机返回一个绩效评级
 * @param {number} seed
 * @returns {string}
 */
function randomPerfRating(seed) {
    return PERF_RATING_OPTIONS[Math.abs(seed) % PERF_RATING_OPTIONS.length];
}
