/* === person-card.js === 人员卡片共享逻辑（散点图、抽屉列表等） */

/** 绩效标签文案映射：option 值 -> 卡片展示文案（超出/略超/达到/略低/未达） */
var PERF_DISPLAY_MAP = {
    '超出': '超出',
    '略超': '略超',
    '达到': '达到',
    '略低': '略低',
    '低于': '未达'
};

/** 绩效标签 CSS 类映射 */
var PERF_CLASS_MAP = {
    '达到': 'perf-met',
    '略低': 'perf-slight-below',
    '低于': 'perf-below',
    '略超': 'perf-slight-exceed',
    '超出': 'perf-exceed'
};

/**
 * 获取人员当前应展示的绩效标签（考虑待填报 + 绩效任务场景）
 * - 第一标签：已有绩效（不因 Leader 选择而改变）
 * - 第二标签：填报模式下显示「待填报」或 Leader 已选等级；普通模式下显示历史绩效
 * @param {Object} emp - 员工对象
 * @returns {Array<{text: string, displayText: string, cssClass: string}>} 最多 2 个标签
 */
function getEffectivePerformanceTags(emp) {
    var tags = emp.performanceTags || [{ text: '达到', symbol: '―' }, { text: '达到', symbol: '―' }];
    var isFillPerfMode = typeof activeTaskHasPerfStep === 'function' && activeTaskHasPerfStep();
    var isPending = isFillPerfMode && typeof perfFilledIds !== 'undefined' && !perfFilledIds.has(emp.id);

    if (isPending) {
        var tag1Text = tags[0] && tags[0].text || '达到';
        var tag1Display = PERF_DISPLAY_MAP[tag1Text] || tag1Text;
        var tag2Text = emp.leaderSummaryEval || '待填报';
        var tag2Display = tag2Text === '待填报' ? '待填报' : (PERF_DISPLAY_MAP[tag2Text] || tag2Text);
        var tag2Class = tag2Text === '待填报' ? 'perf-pending' : (PERF_CLASS_MAP[tag2Text] || 'perf-met');
        return [
            { text: tag1Text, displayText: tag1Display, cssClass: PERF_CLASS_MAP[tag1Text] || 'perf-met' },
            { text: tag2Text, displayText: tag2Display, cssClass: tag2Class }
        ];
    }
    return [
        {
            text: tags[0] && tags[0].text || '达到',
            displayText: PERF_DISPLAY_MAP[tags[0] && tags[0].text] || (tags[0] && tags[0].text) || '达到',
            cssClass: PERF_CLASS_MAP[tags[0] && tags[0].text] || 'perf-met'
        },
        {
            text: tags[1] && tags[1].text || '达到',
            displayText: PERF_DISPLAY_MAP[tags[1] && tags[1].text] || (tags[1] && tags[1].text) || '达到',
            cssClass: PERF_CLASS_MAP[tags[1] && tags[1].text] || 'perf-met'
        }
    ];
}

/**
 * 构建人员卡片内容 HTML（散点图与抽屉列表复用）
 * @param {Object} emp - 员工对象
 * @param {Object} [opts] - 渲染选项
 * @param {boolean} [opts.compact=false] - 是否紧凑模式（抽屉列表用）
 * @param {boolean} [opts.showDelta=true] - 是否显示调薪增幅
 * @param {boolean} [opts.showOriginalLine=true] - 是否显示原薪资行
 * @returns {string} 卡片内容 HTML 字符串
 */
function buildPersonCardContent(emp, opts) {
    opts = opts || {};
    var compact = !!opts.compact;
    var showDelta = opts.showDelta !== false;
    var showOriginalLine = opts.showOriginalLine !== false;

    var effTags = getEffectivePerformanceTags(emp);
    var t1 = effTags[0];
    var t2 = effTags[1];

    var perfHtml =
        '<span class="scatter-card-perf ' + (t1.cssClass || '') + '" title="' + (t1.text || '') + '">' + (t1.displayText || '') + '</span>' +
        '<span class="scatter-card-perf ' + (t2.cssClass || '') + '" title="' + (t2.text || '') + '">' + (t2.displayText || '') + '</span>';

    var salary = emp.salary * (1 + (emp.adjustment || 0) / 100) / 1000;
    var deltaStr = '';
    var deltaClass = 'zero';
    if (showDelta && emp.adjustment !== 0) {
        var baseK = emp.salary / 1000;
        var deltaK = baseK * emp.adjustment / 100;
        deltaStr = (deltaK >= 0 ? '+' : '') + deltaK.toFixed(1) + 'K ' + (emp.adjustment >= 0 ? '+' : '') + emp.adjustment + '%';
        deltaClass = deltaK > 0 ? 'positive' : 'negative';
    }

    var originalLineHtml = '';
    if (showOriginalLine && !compact && emp.adjustment !== 0 && typeof cardGhosts !== 'undefined') {
        var origK = (emp.salary / 1000).toFixed(1);
        var isTier = typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier';
        var currTier = isTier && typeof getEmpTier === 'function' ? getEmpTier(emp) : String(emp.level || '');
        var origTier = (cardGhosts[emp.id] && cardGhosts[emp.id].originalLevel != null)
            ? String(cardGhosts[emp.id].originalLevel)
            : currTier;
        if (currTier !== origTier) {
            originalLineHtml = '<div class="scatter-card-original-line">原' + origK + 'k ' + origTier + '</div>';
        } else {
            originalLineHtml = '<div class="scatter-card-original-line">原' + origK + 'k</div>';
        }
    }

    return '<div class="scatter-card-name-row">' +
        '<span class="name">' + (emp.name || '') + '</span>' +
        '<div class="scatter-card-perfs">' + perfHtml + '</div>' +
        '</div>' +
        '<div class="scatter-card-main">' +
        '<span class="salary">' + salary.toFixed(1) + 'K</span>' +
        (showDelta ? '<span class="scatter-card-delta ' + deltaClass + '" data-delta>' + deltaStr + '</span>' : '') +
        originalLineHtml +
        '</div>';
}
