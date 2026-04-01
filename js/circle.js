/* === circle.js === 圈选/分组功能 */

/**
 * 切换圈选模式（开启/关闭），同步按钮状态和比较面板
 */
function toggleCircleSelect() {
    circleSelectMode = !circleSelectMode;
    var btn = document.getElementById('circleSelectBtn') || document.getElementById('sideToolCircle');
    if (btn) btn.classList.toggle('active', circleSelectMode);
    var circlePanel = document.getElementById('sideToolbarCirclePanel');
    if (circlePanel) circlePanel.classList.toggle('open', circleSelectMode);
    updateSideToolbarActiveState();
    if (!circleSelectMode) {
        selectedForCompare.clear();
        updateComparePanel();
        if (currentView === 'scatter') renderScatterView();
    }
    if (currentView === 'scatter') renderScatterView();
}

/**
 * 完成圈选：将当前选中人员保存为新分组，退出圈选模式并刷新视图
 */
function finishCircleSelect() {
    if (selectedForCompare.size === 0) return;
    const name = '分组' + circleGroupNextId++;
    var empIds = Array.from(selectedForCompare);
    circleGroups.push({ id: circleGroups.length + 1, name: name, empIds: empIds });
    selectedForCompare.clear();
    circleSelectMode = false;
    var btn = document.getElementById('circleSelectBtn') || document.getElementById('sideToolCircle');
    if (btn) btn.classList.remove('active');
    var circlePanel = document.getElementById('sideToolbarCirclePanel');
    if (circlePanel) circlePanel.classList.remove('open');
    updateSideToolbarActiveState();
    updateComparePanel();
    renderCircleGroupFilters();
    renderSideToolbarCircleList();
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}

/**
 * 渲染圈选分组筛选 chip 列表（全部 + 各分组）
 */
function renderCircleGroupFilters() {
    const container = document.getElementById('circleGroupFilterChips');
    if (!container) return;
    if (circleGroups.length === 0) {
        container.innerHTML = '';
        return;
    }
    const isAll = filters.circleGroup === 'all';
    let html = '<div class="chip' + (isAll ? ' active' : '') + '" onclick="toggleFilter(this, \'circleGroup\', \'all\')">全部</div>';
    circleGroups.forEach(g => {
        const active = filters.circleGroup === g.name;
        const nameEsc = g.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        html += '<div class="chip chip-with-close' + (active ? ' active' : '') + '" onclick="toggleFilter(this, \'circleGroup\', \'' + nameEsc + '\')">';
        html += '<span>' + g.name + '</span>';
        html += '<span class="chip-close" data-group-name="' + g.name.replace(/"/g, '&quot;') + '" onclick="event.stopPropagation(); removeCircleGroup(this.dataset.groupName);" title="删除该分组">×</span>';
        html += '</div>';
    });
    container.innerHTML = html;
}

/**
 * 删除指定圈选分组，若当前筛选为该分组则重置为"全部"
 * @param {string} groupName - 分组名称
 */
function removeCircleGroup(groupName) {
    circleGroups = circleGroups.filter(g => g.name !== groupName);
    if (filters.circleGroup === groupName) filters.circleGroup = 'all';
    renderCircleGroupFilters();
    renderSideToolbarCircleList();
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}

/**
 * 根据分组内员工的当前位置计算包围盒（用于收起态定位）
 * @param {Object} grp - 圈选分组对象 { empIds: number[] }
 * @param {Array} visibleStruct - 当前可见梯队/职级结构
 * @returns {{ minL, maxL, minT, maxT } | null}
 */
function getGroupBoundsFromEmps(grp, visibleStruct) {
    const spanK = salaryAxisMaxK - salaryAxisMinK;
    let minL = 100, maxL = 0, minT = 100, maxT = 0;
    let count = 0;
    grp.empIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        const mainDept = getMainDept(emp.dept);
        const isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
        const slot = isTier && typeof getEmpTier === 'function' ? getEmpTier(emp) : emp.level;
        const yPercent = getYPositionInVisible(mainDept, slot, visibleStruct, empId);
        const displaySalaryK = emp.salary * (1 + (emp.adjustment || 0) / 100) / 1000;
        const xPercent = spanK <= 0 ? 50 : ((displaySalaryK - salaryAxisMinK) / spanK) * 100;
        if (xPercent < minL) minL = xPercent; if (xPercent > maxL) maxL = xPercent;
        if (yPercent < minT) minT = yPercent; if (yPercent > maxT) maxT = yPercent;
        count++;
    });
    if (count === 0) return null;
    return { minL, maxL, minT, maxT };
}

/**
 * 切换圈选分组的收起/展开状态并刷新所有视图
 * @param {string} groupName - 分组名称
 */
function toggleCircleGroupCollapsed(groupName) {
    if (circleGroupsCollapsed.has(groupName)) circleGroupsCollapsed.delete(groupName);
    else circleGroupsCollapsed.add(groupName);
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}

/**
 * 重命名圈选分组（同步筛选状态和收起记录）
 * @param {string} oldName - 原分组名
 * @param {string} newName - 新分组名
 */
function renameCircleGroup(oldName, newName) {
    const g = circleGroups.find(x => x.name === oldName);
    if (!g || !newName || newName.trim() === '') return;
    newName = newName.trim();
    if (circleGroups.some(x => x.name === newName && x !== g)) return;
    if (filters.circleGroup === oldName) filters.circleGroup = newName;
    if (circleGroupsCollapsed.has(oldName)) {
        circleGroupsCollapsed.delete(oldName);
        circleGroupsCollapsed.add(newName);
    }
    if (circleGroupLastPositions[oldName]) {
        circleGroupLastPositions[newName] = circleGroupLastPositions[oldName];
        delete circleGroupLastPositions[oldName];
    }
    g.name = newName;
    renderCircleGroupFilters();
    renderSideToolbarCircleList();
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}

/**
 * 在散点图画布上绘制所有圈选分组的包围框和标签
 * 收起态：显示折叠标签（单击展开，双击改名）
 * 展开态：显示包围框 + 标签（单击收起，双击改名）
 * @param {HTMLElement} canvas - 散点图画布元素
 */
function drawCircleGroupBoxes(canvas) {
    const filtered = getFilteredEmployees();
    const filteredIds = new Set(filtered.map(e => e.id));
    const visibleStruct = getVisibleDeptStruct();

    circleGroups.forEach((grp, idx) => {
        const isCollapsed = circleGroupsCollapsed.has(grp.name);
        const color = CIRCLE_GROUP_COLORS[idx % CIRCLE_GROUP_COLORS.length];

        if (isCollapsed) {
            /* 收起态：显示折叠标签 */
            const stored = circleGroupLastPositions[grp.name];
            const bounds = !stored ? getGroupBoundsFromEmps(grp, visibleStruct) : null;
            if (!stored && !bounds) return;
            const pad = 4;
            const left = stored ? stored.left : Math.max(0, bounds.minL - pad);
            const top = stored ? stored.top : Math.max(0, bounds.minT - pad);
            const tag = document.createElement('div');
            tag.className = 'circle-group-label-collapsed';
            tag.textContent = grp.name;
            tag.style.cssText = 'left:' + left + '%;top:' + top + '%;transform:translateY(-22px);color:' + color + ';background:' + color + '22;border-color:' + color + ';';
            tag.title = '单击展开 · 双击改名';
            (function(gname) {
                let clickTimer = null;
                tag.onclick = function(e) {
                    e.stopPropagation();
                    if (clickTimer) return;
                    clickTimer = setTimeout(function() {
                        clickTimer = null;
                        toggleCircleGroupCollapsed(gname);
                    }, 250);
                };
                tag.ondblclick = function(e) {
                    e.stopPropagation();
                    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                    const n = prompt('分组名称', gname);
                    if (n != null && n.trim() !== '') renameCircleGroup(gname, n.trim());
                };
            })(grp.name);
            canvas.appendChild(tag);
            return;
        }

        /* 展开态：计算包围框并绘制 */
        const cards = Array.from(canvas.querySelectorAll('.scatter-card')).filter(c => grp.empIds.includes(parseInt(c.dataset.empId)));
        const visibleCards = cards.filter(c => filteredIds.has(parseInt(c.dataset.empId)));
        if (visibleCards.length === 0) return;

        let minL = 100, maxL = 0, minT = 100, maxT = 0;
        visibleCards.forEach(c => {
            const l = parseFloat(c.style.left), t = parseFloat(c.style.top);
            if (l < minL) minL = l; if (l > maxL) maxL = l;
            if (t < minT) minT = t; if (t > maxT) maxT = t;
        });
        const pad = 4;
        let left = minL - pad, top = minT - pad, w = maxL - minL + pad * 2, h = maxT - minT + pad * 2;
        left = Math.max(0, left); top = Math.max(0, top);
        if (left + w > 100) w = 100 - left;
        if (top + h > 100) h = 100 - top;
        circleGroupLastPositions[grp.name] = { left: left, top: top };

        const box = document.createElement('div');
        box.className = 'circle-group-box';
        box.dataset.groupName = grp.name;
        box.style.cssText = 'position:absolute;left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%;pointer-events:none;z-index:85;box-sizing:border-box;background:' + color + '22;border:1px solid ' + color + ';border-radius:var(--radius);';
        canvas.appendChild(box);

        const lbl = document.createElement('div');
        lbl.className = 'circle-group-box-label';
        lbl.textContent = grp.name;
        lbl.style.cssText = 'position:absolute;left:' + left + '%;top:' + top + '%;transform:translateY(-22px);font-size:11px;font-weight:600;color:' + color + ';white-space:nowrap;';
        lbl.title = '单击收起 · 双击改名';
        (function(gname) {
            let clickTimer = null;
            lbl.onclick = function(e) {
                e.stopPropagation();
                if (clickTimer) return;
                clickTimer = setTimeout(function() {
                    clickTimer = null;
                    toggleCircleGroupCollapsed(gname);
                }, 250);
            };
            lbl.ondblclick = function(e) {
                e.stopPropagation();
                if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                const n = prompt('分组名称', gname);
                if (n != null && n.trim() !== '') renameCircleGroup(gname, n.trim());
            };
        })(grp.name);
        canvas.appendChild(lbl);
    });
}
