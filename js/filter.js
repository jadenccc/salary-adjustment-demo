/* === filter.js === 筛选、统计、轴筛选 */

function getFilteredEmployees() {
    return employees.filter(emp => {
        // 绩效筛选逻辑
        if (filters.performance !== 'all') {
            // 根据绩效标签筛选
            const hasMatchingTag = emp.performanceTags.some(tag => tag.text === filters.performance);
            if (!hasMatchingTag) return false;
        }
        
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

function toggleFilter(chip, type, value) {
    // 更新筛选器状态
    chip.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    filters[type] = value;
    
    // 重新渲染当前视图
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    
    updateStats();
}

// 更新统计

function updateStats() {
    const filtered = getFilteredEmployees();
    const adjusted = filtered.filter(emp => emp.adjustment > 0);
    const totalIncrease = adjusted.reduce((sum, emp) => sum + emp.adjustment, 0);
    const avgIncrease = adjusted.length > 0 ? (totalIncrease / adjusted.length).toFixed(1) : 0;
    
    // 计算预算使用
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


function toggleHideAdjusted() {
    var el = document.getElementById('hideAdjustedCheckbox');
    hideAdjustedCards = el ? el.checked : hideAdjustedCards;
    if (currentView === 'scatter') renderScatterView();
}
function setHideAdjusted(value) {
    hideAdjustedCards = !!value;
    if (currentView === 'scatter') renderScatterView();
}

let axisFilterPopoverClose = null;

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


function clearAxisFilter() {
    axisFilterMode = 'none';
    axisFilterTarget = '';
    updateAxisFilterCancelVisibility();
    renderScatterView();
    renderTableView();
    renderGridView();
    updateStats();
}


function updateAxisFilterCancelVisibility() {
    const el = document.getElementById('axisFilterCancel');
    if (el) el.style.display = axisFilterMode !== 'none' ? 'inline-flex' : 'none';
}

