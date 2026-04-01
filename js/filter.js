/* === filter.js === 筛选、统计、轴筛选 */

/**
 * 根据当前 filters / axisFilterMode / axisFilterTarget 过滤员工列表
 * @returns {Array} 过滤后的员工数组
 */
function getFilteredEmployees() {
    return employees.filter(emp => {
        // 绩效筛选
        if (filters.performance !== 'all') {
            const hasMatchingTag = emp.performanceTags.some(tag => tag.text === filters.performance);
            if (!hasMatchingTag) return false;
        }
        // 轴筛选（职级/梯队 only/hide）
        if (axisFilterMode === 'levelOnly' || axisFilterMode === 'levelHide') {
            var levelMatch = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier')
                ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') === axisFilterTarget
                : emp.level === axisFilterTarget;
            if (axisFilterMode === 'levelOnly' && !levelMatch) return false;
            if (axisFilterMode === 'levelHide' && levelMatch) return false;
        }
        if (axisFilterMode === 'deptOnly' && getMainDept(emp.dept) !== axisFilterTarget) return false;
        if (axisFilterMode === 'deptHide' && getMainDept(emp.dept) === axisFilterTarget) return false;
        if (filters.tag !== 'all' && !emp.tags.includes(filters.tag)) return false;
        if (filters.adjusted === 'yes' && emp.adjustment === 0) return false;
        if (filters.adjusted === 'no' && emp.adjustment > 0) return false;
        if (filters.circleGroup !== 'all') {
            const grp = circleGroups.find(g => g.name === filters.circleGroup);
            if (!grp || !grp.empIds.includes(emp.id)) return false;
        }
        return true;
    });
}

/**
 * 切换筛选 chip 激活状态并重新渲染当前视图
 * @param {HTMLElement} chip - 被点击的 chip 元素
 * @param {string} type - 筛选类型（performance / tag / adjusted / circleGroup）
 * @param {string} value - 筛选值
 */
function toggleFilter(chip, type, value) {
    chip.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filters[type] = value;
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}

/**
 * 更新顶部统计栏（总人数、已调整人数、平均涨幅、预算使用率）
 */
function updateStats() {
    const filtered = getFilteredEmployees();
    const adjusted = filtered.filter(emp => emp.adjustment > 0);
    const totalIncrease = adjusted.reduce((sum, emp) => sum + emp.adjustment, 0);
    const avgIncrease = adjusted.length > 0 ? (totalIncrease / adjusted.length).toFixed(1) : 0;

    const totalBudget = employees.reduce((sum, emp) => {
        return sum + (emp.salary * emp.adjustment / 100);
    }, 0);
    const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const budgetPercent = ((totalBudget / totalSalary) * 100).toFixed(1);

    const totalEl = document.getElementById('totalEmployees');
    const adjustedEl = document.getElementById('adjustedCount');
    const avgEl = document.getElementById('avgIncrease');
    if (totalEl) totalEl.textContent = filtered.length;
    if (adjustedEl) adjustedEl.textContent = adjusted.length;
    if (avgEl) avgEl.textContent = avgIncrease + '%';
    const budgetEl = document.getElementById('budgetUsage');
    if (budgetEl) budgetEl.textContent = budgetPercent + '%';
}

/**
 * 切换"隐藏已调薪卡片"复选框状态并刷新散点图
 */
function toggleHideAdjusted() {
    var el = document.getElementById('hideAdjustedCheckbox');
    hideAdjustedCards = el ? el.checked : hideAdjustedCards;
    if (currentView === 'scatter') renderScatterView();
}

/**
 * 直接设置"隐藏已调薪卡片"状态并刷新散点图
 * @param {boolean} value
 */
function setHideAdjusted(value) {
    hideAdjustedCards = !!value;
    if (currentView === 'scatter') renderScatterView();
}

/** 当前轴筛选浮层的关闭回调（用于点击外部关闭） */
let axisFilterPopoverClose = null;

/**
 * 在指定轴标签旁显示筛选浮层（只看/隐藏 当前部门或职级）
 * @param {HTMLElement} segmentEl - 触发点击的轴标签元素
 * @param {string} type - 'dept' | 'level'
 * @param {string} target - 目标部门名或职级名
 */
function showAxisFilterPopover(segmentEl, type, target) {
    const popover = document.getElementById('axisFilterPopover');
    if (!popover || !segmentEl) return;
    if (axisFilterPopoverClose) { axisFilterPopoverClose(); axisFilterPopoverClose = null; }
    const rect = segmentEl.getBoundingClientRect();
    popover.style.left = rect.left + 'px';
    popover.style.top = (type === 'dept' ? rect.bottom + 4 : rect.top - 60) + 'px';
    popover.dataset.type = type;
    popover.dataset.target = target;
    popover.querySelector('[data-mode="only"]').textContent = type === 'dept' ? '只看当前部门' : '只看当前职级';
    popover.querySelector('[data-mode="hide"]').textContent = type === 'dept' ? '隐藏当前部门' : '隐藏当前职级';
    popover.style.display = 'block';
    axisFilterPopoverClose = function() {
        popover.style.display = 'none';
        document.removeEventListener('click', axisFilterPopoverClose);
        axisFilterPopoverClose = null;
    };
    setTimeout(() => document.addEventListener('click', axisFilterPopoverClose), 0);
}

/**
 * 应用轴筛选（only / hide），关闭浮层并刷新所有视图
 * @param {string} mode - 'only' | 'hide'
 */
function applyAxisFilter(mode) {
    const popover = document.getElementById('axisFilterPopover');
    if (!popover) return;
    const type = popover.dataset.type;
    const target = popover.dataset.target;
    if (axisFilterPopoverClose) { axisFilterPopoverClose(); axisFilterPopoverClose = null; }
    popover.style.display = 'none';
    axisFilterMode = (mode === 'only' ? (type === 'dept' ? 'deptOnly' : 'levelOnly') : (type === 'dept' ? 'deptHide' : 'levelHide'));
    axisFilterTarget = target;
    updateAxisFilterCancelVisibility();
    renderScatterView();
    renderTableView();
    renderGridView();
    updateStats();
}

/**
 * 清除轴筛选并刷新所有视图
 */
function clearAxisFilter() {
    axisFilterMode = 'none';
    axisFilterTarget = '';
    updateAxisFilterCancelVisibility();
    renderScatterView();
    renderTableView();
    renderGridView();
    updateStats();
}

/**
 * 根据当前 axisFilterMode 显示/隐藏"取消轴筛选"按钮
 */
function updateAxisFilterCancelVisibility() {
    const el = document.getElementById('axisFilterCancel');
    if (el) el.style.display = axisFilterMode !== 'none' ? 'inline-flex' : 'none';
}
