/* === data.js === 数据层：员工数据 + 常量配置 + 组织树 + 全局状态 */

function generatePerformanceTags() {
    const tags = ['达到', '略低', '低于', '略超', '超出'];
    const symbols = ['―', '↓', '↓↓', '↑', '↑↑'];

    // 随机选择两个不同的标签
    const index1 = Math.floor(Math.random() * tags.length);
    let index2 = Math.floor(Math.random() * tags.length);
    while (index2 === index1) {
        index2 = Math.floor(Math.random() * tags.length);
    }

    return [
        {text: tags[index1], symbol: symbols[index1]},
        {text: tags[index2], symbol: symbols[index2]}
    ];
}

// 员工数据
const employees = [
    {id: 1, name: '李四', level: 'P7', dept: '后端研发', salary: 35000, performance: 'A', performanceScore: 4.2, tags: ['核心'], tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 2},
    {id: 2, name: '王五', level: 'P6', dept: '测试', salary: 35000, performance: 'B+', performanceScore: 3.8, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), recentPromotion: true},
    {id: 3, name: '赵六', level: 'P8', dept: '测试', salary: 52000, performance: 'A+', performanceScore: 4.5, tags: ['潜力'], tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 4, name: '孙七', level: 'P7', dept: '前端研发', salary: 48000, performance: 'A', performanceScore: 4.1, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 5, name: '周八', level: 'P6', dept: '产品', salary: 26000, performance: 'B', performanceScore: 3.5, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 2},
    {id: 6, name: '吴九', level: 'P7', dept: '算法', salary: 40000, performance: 'A', performanceScore: 4.3, tags: [], tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 2},
    {id: 7, name: '郑十', level: 'P6', dept: '运维', salary: 22000, performance: 'B+', performanceScore: 3.9, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 8, name: '陈十一', level: 'P7', dept: '测试', salary: 35000, performance: 'B+', performanceScore: 3.7, tags: [], tier: '绩效优秀', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 9, name: '刘十二', level: 'P5', dept: '后端研发', salary: 22000, performance: 'B+', performanceScore: 3.8, tags: [], tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1},
    {id: 10, name: '黄十三', level: 'P7', dept: '数据', salary: 36000, performance: 'A', performanceScore: 4.2, tags: ['激活'], tier: '激活', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 11, name: '张十四', level: 'P6', dept: '前端研发', salary: 30000, performance: 'A', performanceScore: 4.0, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags(), recentPromotion: true},
    {id: 12, name: '林十五', level: 'P8', dept: '技术管理研发', salary: 52000, performance: 'A', performanceScore: 4.6, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 13, name: '何十六', level: 'P6', dept: '测试', salary: 29500, performance: 'B', performanceScore: 3.4, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1},
    {id: 14, name: '罗十七', level: 'P7', dept: '算法', salary: 38000, performance: 'A', performanceScore: 4.1, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 15, name: '高十八', level: 'P5', dept: '产品', salary: 21000, performance: 'B', performanceScore: 3.3, tags: [], tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags(),consecutiveNoRaise: 2},
    {id: 16, name: '钱十九', level: 'P6', dept: '后端研发', salary: 31000, performance: 'B+', performanceScore: 3.9, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 17, name: '孙二十', level: 'P7', dept: '安全', salary: 46000, performance: 'A', performanceScore: 4.2, tags: [], tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(), coreProjectSoleOwnerCount: 1},
    {id: 18, name: '李二一', level: 'P6', dept: '运维', salary: 31500, performance: 'B+', performanceScore: 3.8, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 19, name: '周二二', level: 'P5', dept: '前端研发', salary: 23000, performance: 'B+', performanceScore: 3.7, tags: [], tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 20, name: '吴二三', level: 'P7', dept: '数据', salary: 35500, performance: 'A', performanceScore: 4.0, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 21, name: '郑二四', level: 'P6', dept: '测试', salary: 27500, performance: 'B', performanceScore: 3.5, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags(),recentPromotion: true},
    {id: 22, name: '王二五', level: 'P8', dept: '架构研发', salary: 57000, performance: 'A+', performanceScore: 4.7, tags: ['潜力'], tier: '明星员工', adjustment: 0, performanceTags: generatePerformanceTags(),coreProjectSoleOwnerCount: 3},
    {id: 23, name: '赵二六', level: 'P6', dept: '产品', salary: 25000, performance: 'B', performanceScore: 3.4, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 24, name: '刘二七', level: 'P7', dept: '产品', salary: 34000, performance: 'A', performanceScore: 4.1, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 25, name: '陈二八', level: 'P5', dept: '数据', salary: 24000, performance: 'B+', performanceScore: 3.8, tags: [], tier: '潜力新人', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 26, name: '杨二九', level: 'P6', dept: '前端研发', salary: 29500, performance: 'B+', performanceScore: 3.9, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 27, name: '黄三十', level: 'P7', dept: '产品', salary: 38500, performance: 'A', performanceScore: 4.2, tags: [], tier: '核心骨干', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 28, name: '徐三一', level: 'P6', dept: '运维', salary: 28000, performance: 'B', performanceScore: 3.6, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags()},
    {id: 29, name: '朱三二', level: 'P5', dept: '数据', salary: 22500, performance: 'B', performanceScore: 3.5, tags: ['激活'], tier: '待提升', adjustment: 0, performanceTags: generatePerformanceTags(), consecutiveNoRaise: 1},
    {id: 30, name: '马三三', level: 'P6', dept: '测试', salary: 22000, performance: 'B', performanceScore: 3.6, tags: [], tier: '稳定发展', adjustment: 0, performanceTags: generatePerformanceTags()}
];

employees.forEach(e => {
    e.adjustmentReason = e.adjustmentReason || '';
    e.managerNote = e.managerNote || '';
});
employees[5].managerNote = 'TL 关注，适度倾斜';
/** 当前审批人ID（用于「只看汇报给我」筛选，demo 中林十五 id=12 作为审批人） */
var APPROVAL_CURRENT_USER_ID = 12;
/** 为 demo 添加汇报关系：部分员工汇报给当前审批人 */
[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function(id) {
    var e = employees.find(function(x) { return x.id === id; });
    if (e) e.managerId = APPROVAL_CURRENT_USER_ID;
});


const INFO_POINT_TYPES = {
    active:      { color: '#2E9E6A', icon: '●', name: '人员状态' },
    personTag:   { color: '#3B6FCC', icon: '◆', name: '人员标签' },
    noRaiseTwice:{ color: '#D94F2B', icon: '！', name: '异常历史记录' },
    note:        { color: '#7352B2', icon: '✎', name: '批注' }
};
const LEVEL_RAISE_CAP = { P5: 15, P6: 12, P7: 10, P8: 8, P9: 6 };
let infoPointHidden = new Set();
(function() { infoPointHidden.add('note'); })();

var ACTIVE_STATUS_MAP = { 1: '人员处于激活中', 2: '人员处于激活中', 30: '人员内部流转中', 4: '人员离职交接中' };
var PERSON_TAG_MAP = { 5: '2024年校招生', 6: '2024年校招生', 7: '2023年校招生', 3: '模块负责人' };

const MATTERS_POOL = ['五星角色', '新地图', 'boss战斗', '星铁活动', '角色技能', '剧情线推进', '版本大世界内容', '多语言本地化', '角色立绘与动效', '玩法系统迭代', '新手引导优化', '联机玩法设计'];
function getMatters(emp) {
    const n = 2 + (emp.id % 4);
    const list = [];
    for (let i = 0; i < n; i++) {
        const idx = (emp.id * 3 + i * 7) % MATTERS_POOL.length;
        list.push(MATTERS_POOL[idx]);
    }
    return list;
}


let currentView = 'table';
let circleSelectMode = false;
let selectedForCompare = new Set();
let slideOutHideTid = null;
let hideAdjustedCards = false;
let selectedEmployee = null;
let filters = {
    performance: 'all',
    tag: 'all',
    adjusted: 'all',
    circleGroup: 'all'
};
let axisFilterMode = 'none';
let axisFilterTarget = '';
let axisXLabelType = 'tier';   // 'level' | 'tier'，横轴标题展示「部门·职级」或「部门·梯队」，默认梯队
// 圈人分组：{ id, name: '分组1', empIds: number[] }
let circleGroups = [];
let circleGroupNextId = 1;
let circleGroupsCollapsed = new Set();  // 收起的分组名集合
let circleGroupLastPositions = {};      // 分组收起时保留的位置 { groupName: { left, top } }
let cardGhosts = {};                     // empId -> { originalSalaryK, originalLevel } 调薪后用于卡片显示「原xxk T1」
let empInitialShadows = {};              // empId -> { leftPct, topPct, name, origSalaryK, origLevel } 首次拖动后在初始位置显示的可点击阴影
let undoStack = [];                      // 撤销栈，每项 { entries: [{ empId, origLeft, origTop, origAdjustment }] }
// 纵轴薪资范围（由当前可见人员自适应，供散点图与拖拽使用）
let salaryAxisMinK = 20;
let salaryAxisMaxK = 60;
/** 填报模式下已填报绩效的人员ID集合（用于去除卡片遮罩、恢复可拖动） */
var perfFilledIds = new Set();


// 模拟游戏公司实体组织树（快照）：当前用户可见的 Leader 范围对应的末级组织
const ENTITY_ORG_LEAFS = [
    { id: 'leaf1', name: '项目组·原神', leaders: ['李四', '王五', '赵六', '孙七'] },
    { id: 'leaf2', name: '项目组·星铁', leaders: ['周八', '吴九', '郑十'] },
    { id: 'leaf3', name: '项目组·未定', leaders: ['陈十一', '刘十二'] },
    { id: 'leaf4', name: '技术中台', leaders: ['黄十三', '张十四', '林十五'] }
];
let currentPerspectiveLeaderId = null;  // 当前选中的 Leader（人员视角）


// 当前用户待办任务：每个按钮一条任务，任务下分步骤，步骤顺序【绩效填报-薪酬回顾-职级回顾】

const TYPE_CFG = {
    sal:  { label: '薪酬回顾', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
    perf: { label: '绩效回顾', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
    lvl:  { label: '职级回顾', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
    ttp:  { label: 'TTP提报',  color: '#c2410c', bg: 'rgba(194, 65, 12, 0.12)' },
    int:  { label: '面谈反馈', color: '#0e7490', bg: 'rgba(14, 116, 144, 0.12)' }
};
var STEP_ORDER = ['perf', 'sal', 'lvl'];
var STEP_LABELS = { perf: '绩效填报', sal: '薪酬回顾', lvl: '职级回顾' };
const FILL_DDL = { perf: '03-05', sal: '03-15' };
var FILL_TASK_PEOPLE_IDS = [1, 2, 3, 4, 6, 8, 9, 13, 16, 17, 19, 21, 22, 30];
/* Demo 采用第三种情况：多个任务，显示待填报优先，首次打开自动进入任务态 */
const MY_TASKS = {
    fill: [
        { id: 'fill1', role: 'fill', title: '2026年7月绩效+薪酬回顾', tagLabel: '待填报', steps: [
            { type: 'perf', ddl: '03-05', daysLeft: 1, filled: 0, total: 14, peopleIds: FILL_TASK_PEOPLE_IDS.slice(), rejected: false },
            { type: 'sal', ddl: '03-15', daysLeft: 11, filled: 4, total: 14, peopleIds: FILL_TASK_PEOPLE_IDS.slice(), rejected: false }
        ] }
    ],
    approve: [
        { id: 'approve1', role: 'approve', dept: '技术中台', title: '2026年7月绩效+薪酬回顾', tagLabel: '待审批', currentNodeLabel: '待我审批', isMyNode: true, steps: [ /* 与 fill1 同周期，用于多任务 demo */
            { type: 'lvl', ddl: '03-10', daysLeft: 4, filled: 5, total: 5, peopleIds: [5, 15, 23, 24, 27], rejected: false }
        ] },
        { id: 'approve2', role: 'approve', dept: '项目组·星铁', title: '2026年6月绩效+薪酬回顾', tagLabel: '待审批', currentNodeLabel: 'Leader 审批中', isMyNode: false, steps: [
            { type: 'perf', ddl: '03-05', daysLeft: 1, filled: 3, total: 3, peopleIds: [10, 11, 12], rejected: false }
        ] },
        { id: 'approve3', role: 'approve', dept: '项目组·原神', title: '2026年5月薪酬回顾', tagLabel: '待审批', currentNodeLabel: '待我审批', isMyNode: true, steps: [
            { type: 'sal', ddl: '03-15', daysLeft: 11, filled: 0, total: 8, peopleIds: [1, 2, 3, 4, 6, 7, 8, 9], rejected: false }
        ] }
    ]
};

const DEPT_LEVEL_STRUCT = [
    { dept: '研发部门', levels: ['P6', 'P7', 'P8'] },
    { dept: '测试部门', levels: ['P6', 'P7', 'P8', 'P9'] },
    { dept: '产品部门', levels: ['P5', 'P6', 'P7'] },
    { dept: '其他部门', levels: ['P5', 'P6', 'P7', 'P8'] }
];
/** 梯队结构：每个部门均为 T0、T1、T2、T3 */
const DEPT_TIER_STRUCT = [
    { dept: '研发部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '测试部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '产品部门', levels: ['T0', 'T1', 'T2', 'T3'] },
    { dept: '其他部门', levels: ['T0', 'T1', 'T2', 'T3'] }
];
/** 梯队代号与展示标签的双向映射 */
const TIER_TO_LABEL = { T0: '明星员工', T1: '核心骨干', T2: '稳定发展', T3: '潜力新人' };
const LABEL_TO_TIER = { '明星员工': 'T0', '核心骨干': 'T1', '稳定发展': 'T2', '潜力新人': 'T3', '待提升': 'T3', '激活': 'T2', '绩效优秀': 'T1' };


// 根据筛选结果获取可见部门结构（仅展示有卡片的部门/职级槽位，聚焦剩余人员，避免空白区域）

var PERF_RATING_OPTIONS = ['达到预期', '略低于预期', '低于预期', '略超出预期', '超出预期'];
function randomPerfRating(seed) {
    return PERF_RATING_OPTIONS[Math.abs(seed) % PERF_RATING_OPTIONS.length];
}
