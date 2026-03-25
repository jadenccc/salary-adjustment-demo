/* === circle.js === 圈选/分组功能 */

function toggleCircleSelect() {
    circleSelectMode = !circleSelectMode;
    var btn = document.getElementById('circleSelectBtn') || document.getElementById('sideToolCircle');
    if (btn) btn.classList.toggle('active', circleSelectMode);
    var circlePanel = document.getElementById('sideToolbarCirclePanel');
    if (circlePanel) circlePanel.classList.toggle('open', circleSelectMode);
    updateSideToolbarActiveState();
    if (!circleSelectMode) { selectedForCompare.clear(); updateComparePanel(); if (currentView === 'scatter') renderScatterView(); }
    if (currentView === 'scatter') renderScatterView();
}


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

var TASK_POOL = ['原神五星角色设计', '新版本地图规划', 'Boss战斗机制', '星铁活动策划', '角色技能平衡', '剧情线推进', '版本大世界内容', '多语言本地化', '角色立绘与动效', '玩法系统迭代', '新手引导优化', '联机玩法设计'];

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
        // 新布局：纵轴=梯队，横轴=薪酬
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


function toggleCircleGroupCollapsed(groupName) {
    if (circleGroupsCollapsed.has(groupName)) circleGroupsCollapsed.delete(groupName);
    else circleGroupsCollapsed.add(groupName);
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
}


function renameCircleGroup(oldName, newName) {
    const g = circleGroups.find(x => x.name === oldName);
    if (!g || !newName || newName.trim() === '') return;
    newName = newName.trim();
    if (circleGroups.some(x => x.name === newName && x !== g)) return;
    if (filters.circleGroup === oldName) filters.circleGroup = newName;
    if (circleGroupsCollapsed.has(oldName)) { circleGroupsCollapsed.delete(oldName); circleGroupsCollapsed.add(newName); }
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


function drawCircleGroupBoxes(canvas) {
    const filtered = getFilteredEmployees();
    const filteredIds = new Set(filtered.map(e => e.id));
    const visibleStruct = getVisibleDeptStruct();
    circleGroups.forEach((grp, idx) => {
        const isCollapsed = circleGroupsCollapsed.has(grp.name);
        const color = CIRCLE_GROUP_COLORS[idx % CIRCLE_GROUP_COLORS.length];
        if (isCollapsed) {
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
        if (left + w > 100) w = 100 - left; if (top + h > 100) h = 100 - top;
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

