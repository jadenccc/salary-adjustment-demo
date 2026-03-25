/* === scatter.js === 散点图渲染 + 坐标计算 + 部门结构 */

function getMainDept(empDept) {
    const rdDepts = ['后端研发', '前端研发', '架构', '算法', '安全', '技术管理'];
    if (rdDepts.includes(empDept) || empDept.includes('研发')) return '研发部门';
    if (empDept === '测试') return '测试部门';
    if (empDept === '产品') return '产品部门';
    return '其他部门';  // 运维、数据等
}

const SLOT_WIDTH = 118;
const SLOT_HEIGHT = 180;  // 纵轴每个梯队/职级槽位的最小高度（加大以便同梯队卡片纵向错开）

/** 将 emp.tier 映射为 T0/T1/T2/T3（梯队模式用） */
function getEmpTier(emp) {
    if (!emp || !emp.tier) return 'T2';
    return (typeof LABEL_TO_TIER !== 'undefined' && LABEL_TO_TIER[emp.tier]) ? LABEL_TO_TIER[emp.tier] : 'T2';
}

// 根据筛选结果获取可见梯队/职级结构（扁平，不区分部门）
function getVisibleDeptStruct() {
    const filtered = getFilteredEmployees();
    return getVisibleDeptStructFromList(filtered);
}
// 根据指定员工列表计算可见梯队/职级结构（扁平，不区分部门）
function getVisibleDeptStructFromList(empList) {
    const isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
    // 扁平梯队/职级列表（不区分部门）
    const allLevels = isTier ? ['T0', 'T1', 'T2', 'T3'] : ['P5', 'P6', 'P7', 'P8', 'P9'];
    const slotsWithCards = new Set();
    if (empList && empList.length > 0) {
        empList.forEach(emp => {
            const slot = isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level;
            slotsWithCards.add(slot);
        });
    }
    // 拖拽残影中的原始槽位也需要保留
    var empIdSet = new Set((empList || []).map(function(e) { return e.id; }));
    Object.keys(cardGhosts || {}).forEach(function(empIdStr) {
        var empId = parseInt(empIdStr, 10);
        if (!empIdSet.has(empId)) return;
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return;
        var rec = cardGhosts[empIdStr];
        var origSlot = rec.originalLevel != null ? rec.originalLevel : (isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level);
        slotsWithCards.add(origSlot);
    });
    // 过滤出有卡片的槽位
    const visibleLevels = slotsWithCards.size > 0
        ? allLevels.filter(level => slotsWithCards.has(level))
        : allLevels;
    // 返回单段结构（兼容旧格式）
    return [{ dept: '_all', levels: visibleLevels.length > 0 ? visibleLevels : allLevels }];
}

// 在可见结构内计算Y位置百分比（纵轴为梯队/职级，不区分部门）
function getYPositionInVisible(mainDept, level, visibleStruct, empId) {
    // 扁平结构：只有一个段，直接在 levels 中查找
    const seg = visibleStruct[0];
    if (!seg) return 50;
    const totalSlots = seg.levels.length;
    let idx = seg.levels.indexOf(level);
    if (idx < 0) {
        idx = seg.levels.findIndex(l => parseInt(String(l).slice(1)) >= parseInt(String(level).slice(1)));
        idx = idx >= 0 ? idx : seg.levels.length - 1;
    }
    const centerPct = ((idx + 0.5) / totalSlots) * 100;
    // 基于 empId 在槽位内产生确定性 Y 偏移，让同梯队卡片纵向散开
    if (empId != null) {
        const slotSpanPct = (1 / totalSlots) * 100;  // 每个槽位占的百分比
        const jitterRange = slotSpanPct * 0.6;        // 偏移范围为槽位高度的 60%
        const hash = ((empId * 2654435761) >>> 0) / 4294967296; // 0~1 确定性哈希
        const offset = (hash - 0.5) * jitterRange;    // -jitterRange/2 ~ +jitterRange/2
        return Math.max(0, Math.min(100, centerPct + offset));
    }
    return centerPct;
}
// 兼容旧调用
function getXPositionInVisible(mainDept, level, visibleStruct) {
    return getYPositionInVisible(mainDept, level, visibleStruct);
}
/** 获取纵轴全范围（不再按部门限制） */
function getDeptYRange(mainDept, visibleStruct) {
    return { minPct: 0, maxPct: 100 };
}
// 兼容旧调用
function getDeptXRange(mainDept, visibleStruct) {
    return getDeptYRange(mainDept, visibleStruct);
}
/** 根据纵向位置百分比解析出对应的职级/梯队槽位（不区分部门） */
function topPctToLevelInDept(mainDept, topPct, visibleStruct) {
    const seg = visibleStruct && visibleStruct[0];
    if (!seg || !seg.levels.length) return null;
    const totalSlots = seg.levels.length;
    const slotIndex = Math.max(0, Math.min(totalSlots - 1, Math.floor((topPct / 100) * totalSlots)));
    return seg.levels[slotIndex] || seg.levels[0];
}
// 兼容旧调用
function leftPctToLevelInDept(mainDept, leftPct, visibleStruct) {
    return topPctToLevelInDept(mainDept, leftPct, visibleStruct);
}
// 未做任何调整时的位置（残影始终在此）
// 新布局：leftPct = 薪酬位置（横轴），topPct = 梯队位置（纵轴）
function getOriginalPositionForEmp(emp, visibleStruct, spanK, overrideLevel, overrideSalaryK) {
    var isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
    var level = overrideLevel != null ? overrideLevel : (isTier ? getEmpTier(emp) : emp.level);
    var topPct = getYPositionInVisible(null, level, visibleStruct, emp.id);
    var originalSalaryK = overrideSalaryK != null ? overrideSalaryK : (emp.salary / 1000);
    var leftPct = spanK <= 0 ? 50 : ((originalSalaryK - salaryAxisMinK) / spanK) * 100;
    return { leftPct: leftPct, topPct: topPct };
}

function renderScatterView() {
    removeDragUndoHintVisual();
    const canvas = document.getElementById('chartCanvas');
    let filtered = getFilteredEmployees();
    if (hideAdjustedCards) filtered = filtered.filter(emp => !emp.adjustment || emp.adjustment === 0);
    // 聚焦任务时：只展示该任务包含的卡片；审批模式下展示所有「到此节点」的人员（不区分部门/任务）
    if (activeTask && activeTask.role === 'approve') {
        const taskIdSet = new Set(getApprovalModePeopleIds());
        if (taskIdSet.size > 0) filtered = filtered.filter(emp => taskIdSet.has(emp.id));
    } else if (activeTask && (activeTask.peopleIds || []).length > 0) {
        const taskIdSet = new Set(activeTask.peopleIds);
        filtered = filtered.filter(emp => taskIdSet.has(emp.id));
    }
    const visibleStruct = getVisibleDeptStructFromList(filtered);
    
    const totalSlots = visibleStruct.reduce((s, seg) => s + seg.levels.length, 0);
    // 新布局：纵轴为梯队，画布最小高度按槽位数计算；横轴为薪酬，不再设 minWidth
    const canvasMinHeight = totalSlots * SLOT_HEIGHT;
    canvas.style.minWidth = '';
    canvas.style.minHeight = canvasMinHeight + 'px';
    
    canvas.innerHTML = '';
    
    // 纵轴标签：「部门·梯队/职级」下拉切换（放在左侧）
    var yLabelText = axisXLabelType === 'level' ? '职级' : '梯队';
    var axisYWrap = document.createElement('div');
    axisYWrap.className = 'axis-label-y';
    axisYWrap.innerHTML = '<span class="axis-y-trigger"><span class="axis-y-current">' + yLabelText + '</span><span class="axis-y-arrow">▾</span></span><div class="axis-y-dropdown"><button type="button" class="axis-y-dropdown-option' + (axisXLabelType === 'level' ? ' active' : '') + '" data-type="level">职级</button><button type="button" class="axis-y-dropdown-option' + (axisXLabelType === 'tier' ? ' active' : '') + '" data-type="tier">梯队</button></div>';
    var yTrigger = axisYWrap.querySelector('.axis-y-trigger');
    yTrigger.onclick = function(e) {
        e.stopPropagation();
        var open = axisYWrap.classList.toggle('open');
        if (open) {
            setTimeout(function() {
                document.addEventListener('click', function closeAxisYDropdown(ev) {
                    if (!axisYWrap.contains(ev.target)) {
                        axisYWrap.classList.remove('open');
                        document.removeEventListener('click', closeAxisYDropdown);
                    }
                });
            }, 0);
        }
    };
    axisYWrap.querySelectorAll('.axis-y-dropdown-option').forEach(function(btn) {
        btn.onclick = function(e) {
            e.stopPropagation();
            var t = btn.dataset.type;
            if (axisXLabelType === t) { axisYWrap.classList.remove('open'); return; }
            axisXLabelType = t;
            axisYWrap.querySelector('.axis-y-current').textContent = t === 'level' ? '职级' : '梯队';
            axisYWrap.querySelectorAll('.axis-y-dropdown-option').forEach(function(b) { b.classList.toggle('active', b.dataset.type === t); });
            axisYWrap.classList.remove('open');
            if (typeof renderScatterView === 'function') renderScatterView();
        };
    });
    canvas.appendChild(axisYWrap);
    
    // 顶部横轴标签：薪酬 (K)
    var axisXLabel = document.createElement('div');
    axisXLabel.className = 'axis-label-x';
    axisXLabel.textContent = '薪酬 (K)';
    canvas.appendChild(axisXLabel);
    
    // 左侧纵轴：扁平梯队/职级标签（不区分部门）
    const axisLeft = document.createElement('div');
    axisLeft.className = 'axis-left';
    const flatLevels = visibleStruct[0] ? visibleStruct[0].levels : [];
    flatLevels.forEach(level => {
        const isTierMode = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
        const displayLabel = isTierMode && typeof TIER_TO_LABEL !== 'undefined' && TIER_TO_LABEL[level]
            ? level + ' ' + TIER_TO_LABEL[level]
            : level;
        const isLevelOnly = axisFilterMode === 'levelOnly' && axisFilterTarget === level;
        const isLevelHide = axisFilterMode === 'levelHide' && axisFilterTarget === level;
        const levelDiv = document.createElement('div');
        levelDiv.className = 'level-segment-y' + (isLevelOnly ? ' active-only' : '') + (isLevelHide ? ' collapsed' : '');
        levelDiv.style.flex = '1';
        levelDiv.style.minHeight = SLOT_HEIGHT + 'px';
        levelDiv.dataset.level = level;
        levelDiv.innerHTML = '<span class="level-segment-y-label">' + displayLabel + '</span>';
        levelDiv.onclick = function(e) {
            e.stopPropagation();
            showAxisFilterPopover(e.target.closest('.level-segment-y'), 'level', level);
        };
        axisLeft.appendChild(levelDiv);
    });
    canvas.appendChild(axisLeft);
    
    // 横轴（薪酬）根据当前可见人员薪资自适应
    const displaySalariesK = filtered.map(emp => emp.salary * (1 + (emp.adjustment || 0) / 100) / 1000);
    let rangeMinK = displaySalariesK.length ? Math.min(...displaySalariesK) : 20;
    let rangeMaxK = displaySalariesK.length ? Math.max(...displaySalariesK) : 60;
    const paddingFactor = activeTask ? 0.18 : 0.1;
    const padding = Math.max(2, (rangeMaxK - rangeMinK) * paddingFactor);
    if (rangeMaxK - rangeMinK < 1) { rangeMinK = Math.floor(rangeMinK) - 2; rangeMaxK = Math.ceil(rangeMaxK) + 2; }
    else { rangeMinK = Math.max(0, rangeMinK - padding); rangeMaxK = rangeMaxK + padding; }
    salaryAxisMinK = rangeMinK;
    salaryAxisMaxK = rangeMaxK;
    const spanK = salaryAxisMaxK - salaryAxisMinK;
    window._lastVisibleStruct = visibleStruct;
    window._lastSpanK = spanK;
    window._lastSalaryAxisMinK = salaryAxisMinK;
    const gridSteps = 5;
    
    // 顶部薪酬刻度标签 + 垂直网格线（薪酬方向）
    const axisTop = document.createElement('div');
    axisTop.className = 'axis-top';
    for (let i = 0; i <= gridSteps; i++) {
        const pct = (i / gridSteps) * 100;
        // 垂直网格线
        const line = document.createElement('div');
        line.className = 'grid-line-v';
        line.style.left = pct + '%';
        canvas.appendChild(line);
        // 顶部刻度标签
        const label = document.createElement('div');
        label.className = 'salary-tick-label';
        label.style.left = pct + '%';
        const valueK = salaryAxisMinK + (i / gridSteps) * spanK;
        label.textContent = (valueK >= 1000 ? (valueK/1000).toFixed(1) + 'M' : valueK.toFixed(0) + 'K');
        axisTop.appendChild(label);
    }
    canvas.appendChild(axisTop);
    
    // 水平网格线（梯队之间）
    for (let i = 1; i < totalSlots; i++) {
        const line = document.createElement('div');
        line.className = 'grid-line-h';
        line.style.top = (i / totalSlots * 100) + '%';
        canvas.appendChild(line);
    }
    
    // 连接线 SVG
    const connectorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connectorSvg.className = 'info-connector-svg';
    connectorSvg.setAttribute('viewBox', '0 0 100 100');
    connectorSvg.setAttribute('preserveAspectRatio', 'none');
    connectorSvg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;';
    canvas.appendChild(connectorSvg);
    
    // 绘制散点（收起分组内的成员不渲染卡片）
    filtered.forEach(emp => {
        const inCollapsed = circleGroups.some(g => circleGroupsCollapsed.has(g.name) && g.empIds.includes(emp.id));
        if (inCollapsed) return;
        const card = createScatterCard(emp, visibleStruct);
        canvas.appendChild(card);
    });
    
    // 初始位置阴影：首次拖动后显示，点击可复原卡片到初始位置
    var filteredIds = new Set(filtered.map(function(e) { return e.id; }));
    Object.keys(empInitialShadows || {}).forEach(function(empIdStr) {
        var empId = parseInt(empIdStr, 10);
        if (!filteredIds.has(empId)) return;
        var rec = empInitialShadows[empIdStr];
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp || !rec) return;
        var shadow = document.createElement('div');
        shadow.className = 'initial-position-shadow';
        shadow.dataset.empId = empIdStr;
        shadow.style.left = rec.leftPct + '%';
        shadow.style.top = rec.topPct + '%';
        var origK = (rec.origSalaryK != null ? rec.origSalaryK : emp.salary / 1000).toFixed(1);
        shadow.innerHTML = '<div class="initial-position-shadow-inner"><span class="initial-position-shadow-name">' + (rec.name || emp.name || '').replace(/</g, '&lt;') + '</span><span class="initial-position-shadow-salary">' + origK + 'K</span></div><div class="initial-position-shadow-hint">点击复原</div>';
        shadow.title = '点击复原到初始位置';
        shadow.onclick = function(e) {
            e.stopPropagation();
            restoreCardFromInitialShadow(empId);
        };
        canvas.appendChild(shadow);
    });
    
    // 信息点气泡与连接线
    drawInfoBubbles(canvas, filtered, connectorSvg, spanK);
    
    // 磁力排斥：构建重叠簇并设置 hover/拖拽展开
    setupMagneticRepulsion(canvas, filtered);
    
    // 圈选后绘制选中区域矩形，可拖动实现整体调薪
    const oldRect = canvas.querySelector('.selection-rect');
    if (oldRect) oldRect.remove();
    canvas.querySelectorAll('.circle-group-box,.circle-group-label-collapsed').forEach(el => el.remove());
    if (selectedForCompare.size > 0) addSelectionRect(canvas);
    drawCircleGroupBoxes(canvas);
}


function getCardTopEdgePoint(card, canvas, bubbleLeft, bubbleTop) {
    const rect = canvas.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        const left = parseFloat(card.style.left), top = parseFloat(card.style.top);
        return { x1: left, y1: top };
    }
    const cardLeftPct = (cardRect.left - rect.left) / rect.width * 100;
    const cardRightPct = (cardRect.right - rect.left) / rect.width * 100;
    const cardTopPct = (cardRect.top - rect.top) / rect.height * 100;
    const x1 = Math.max(cardLeftPct, Math.min(cardRightPct, bubbleLeft));
    return { x1, y1: cardTopPct };
}


function updateBubbleAndLineForCard(card) {
    const canvas = card.closest('#chartCanvas') || card.parentElement;
    if (!canvas) return;
    const empId = card.dataset.empId;
    const bubble = canvas.querySelector('.info-bubble[data-emp-id="' + empId + '"]');
    const connectorSvg = canvas.querySelector('.info-connector-svg');
    if (!bubble || !connectorSvg) return;
    const line = connectorSvg.querySelector('line[data-emp-id="' + empId + '"]');
    if (!line) return;
    const left = parseFloat(card.style.left);
    const top = parseFloat(card.style.top);
    const offsetX = parseFloat(bubble.dataset.offsetX) || 0;
    const offsetY = parseFloat(bubble.dataset.offsetY) || -6;
    const bubbleLeft = Math.max(2, Math.min(92, left + offsetX));
    const bubbleTop = Math.max(2, Math.min(98, top + offsetY));
    bubble.style.left = bubbleLeft + '%';
    bubble.style.top = bubbleTop + '%';
    const edge = getCardTopEdgePoint(card, canvas, bubbleLeft, bubbleTop);
    line.setAttribute('x1', edge.x1);
    line.setAttribute('y1', edge.y1);
    line.setAttribute('x2', bubbleLeft);
    line.setAttribute('y2', bubbleTop);
}


function drawInfoBubbles(canvas, filtered, connectorSvg, spanK) {
    const cards = canvas.querySelectorAll('.scatter-card');
    const cardMap = {};
    cards.forEach(c => {
        const id = parseInt(c.dataset.empId);
        if (id) cardMap[id] = c;
    });
    filtered.forEach(emp => {
        const points = getInfoPoints(emp);
        const pt = points.find(p => !infoPointHidden.has(p.type));
        if (!pt) return;
        const card = cardMap[emp.id];
        if (!card) return;
        const left = parseFloat(card.style.left);
        const top = parseFloat(card.style.top);
        const sameLevel = filtered.filter(e => e.level === emp.level && getInfoPoints(e).length > 0);
        const localIdx = sameLevel.findIndex(e => e.id === emp.id);
        const goRight = localIdx % 2 === 0;
        const offsetY = -6;
        const offsetX = goRight ? 4 : -4;
        let bubbleTop = Math.max(2, Math.min(98, top + offsetY));
        let bubbleLeft = Math.max(2, Math.min(92, left + offsetX));
        const edge = getCardTopEdgePoint(card, canvas, bubbleLeft, bubbleTop);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', edge.x1);
        line.setAttribute('y1', edge.y1);
        line.setAttribute('x2', bubbleLeft);
        line.setAttribute('y2', bubbleTop);
        line.setAttribute('stroke', INFO_POINT_TYPES[pt.type].color);
        line.setAttribute('stroke-width', '0.1');
        line.setAttribute('opacity', '0.4');
        line.setAttribute('stroke-dasharray', '1.2,1.2');
        line.setAttribute('data-info-type', pt.type);
        line.setAttribute('data-emp-id', String(emp.id));
        connectorSvg.appendChild(line);
        const bubble = document.createElement('div');
        bubble.className = 'info-bubble info-bubble-' + pt.type;
        bubble.dataset.infoType = pt.type;
        bubble.dataset.empId = String(emp.id);
        bubble.dataset.offsetX = String(offsetX);
        bubble.dataset.offsetY = String(offsetY);
        bubble.style.left = bubbleLeft + '%';
        bubble.style.top = bubbleTop + '%';
        bubble.style.transform = 'translate(-50%, -50%)';
        bubble.innerHTML = '<div class="info-bubble-inner"><span class="lb-icon">' + INFO_POINT_TYPES[pt.type].icon + '</span><span class="lb-text">' + pt.text + '</span></div>';
        canvas.appendChild(bubble);
    });
}

const CIRCLE_GROUP_COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#0891b2', '#dc2626'];


function addSelectionRect(canvas) {
    const cards = Array.from(canvas.querySelectorAll('.scatter-card')).filter(c => selectedForCompare.has(parseInt(c.dataset.empId)));
    if (cards.length === 0) return;
    let minL = 100, maxL = 0, minT = 100, maxT = 0;
    cards.forEach(c => {
        const l = parseFloat(c.style.left), t = parseFloat(c.style.top);
        if (l < minL) minL = l; if (l > maxL) maxL = l;
        if (t < minT) minT = t; if (t > maxT) maxT = t;
    });
    const pad = 4;
    let left = minL - pad, top = minT - pad, w = maxL - minL + pad * 2, h = maxT - minT + pad * 2;
    left = Math.max(0, left); top = Math.max(0, top);
    if (left + w > 100) w = 100 - left; if (top + h > 100) h = 100 - top;
    const rect = document.createElement('div');
    rect.className = 'selection-rect';
    rect.style.left = left + '%'; rect.style.top = top + '%'; rect.style.width = w + '%'; rect.style.height = h + '%';
    rect.title = '拖动矩形可整体调薪';
    if (circleSelectMode) {
        const hint = document.createElement('div');
        hint.className = 'selection-rect-hint';
        hint.textContent = '按Tab键完成当前圈人过程';
        hint.style.color = 'var(--primary)';
        rect.appendChild(hint);
    }
    canvas.appendChild(rect);
    makeSelectionRectDraggable(rect, cards);
}


function createScatterCard(emp, visibleStruct) {
    const inGroup = circleGroups.some(g => g.empIds.includes(emp.id));
    var isDimmed = false;
    var isRejected = false;
    var isLocked = false;
    if (activeTask) {
        var taskIds = activeTask.role === 'approve' ? getApprovalModePeopleIds() : (activeTask.peopleIds || []);
        var isInTask = taskIds.indexOf(emp.id) !== -1;
        isDimmed = !isInTask;
        if (isInTask && activeTask.rejected) {
            isRejected = ((activeTask.rejectedIds || []).indexOf(emp.id) !== -1);
            isLocked = !isRejected;
        }
    } else if (selectedTodo && selectedTodo.empIds && selectedTodo.empIds.indexOf(emp.id) === -1) {
        isDimmed = true;
    }
    var isPerfPending = false;
    if (activeTask && activeTask.type === 'perf' && isInTask && typeof perfFilledIds !== 'undefined' && !perfFilledIds.has(emp.id)) {
        isPerfPending = true;
    }
    const card = document.createElement('div');
    card.className = 'scatter-card'
        + (selectedForCompare.has(emp.id) ? ' circle-selected' : '')
        + (inGroup ? ' in-circle-group' : '')
        + (isDimmed ? ' scatter-card-dimmed' : '')
        + (isRejected ? ' scatter-card-rejected' : '')
        + (isLocked ? ' scatter-card-locked' : '')
        + (isPerfPending ? ' scatter-card-perf-pending' : '')
        + (activeTask && activeTask.role === 'approve' && emp.id === activePersonId ? ' approval-highlight' : '');
    card.dataset.empId = emp.id;
    card.dataset.mainDept = getMainDept(emp.dept);
    card.dataset.level = emp.level;
    
    const mainDept = getMainDept(emp.dept);
    const isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
    const vs = visibleStruct || (isTier ? DEPT_TIER_STRUCT : DEPT_LEVEL_STRUCT);
    const slot = isTier ? getEmpTier(emp) : emp.level;
    // 新布局：纵轴为梯队/职级，横轴为薪酬
    const yPercent = getYPositionInVisible(mainDept, slot, vs, emp.id);
    
    // 计算横坐标位置：按当前横轴范围 salaryAxisMinK ~ salaryAxisMaxK 映射到 0% ~ 100%
    const displaySalaryK = emp.salary * (1 + (emp.adjustment || 0) / 100) / 1000;
    const spanK = salaryAxisMaxK - salaryAxisMinK;
    const xPercent = spanK <= 0 ? 50 : ((displaySalaryK - salaryAxisMinK) / spanK) * 100;
    
    card.style.left = xPercent + '%';
    card.style.top = yPercent + '%';
    card.style.transform = 'translate(-50%, -50%)';
    
    const baseSalaryK = emp.salary / 1000;
    const deltaK = baseSalaryK * emp.adjustment / 100;
    const deltaStr = emp.adjustment !== 0 ? (deltaK >= 0 ? '+' : '') + deltaK.toFixed(1) + 'K ' + (emp.adjustment >= 0 ? '+' : '') + emp.adjustment + '%' : '';
    const deltaClass = deltaK > 0 ? 'positive' : deltaK < 0 ? 'negative' : 'zero';
    const anomalies = getAnomalies(emp);
    const hasAnomaly = anomalies.length > 0;
    if (hasAnomaly) card.classList.add('anomaly');
    else card.classList.remove('anomaly');
    
    const hasAdjustment = (emp.adjustment || 0) !== 0;
    if (hasAdjustment) card.classList.add('scatter-card-adjusted');
    const needReasonIcon = hasAdjustment && !(emp.adjustmentReason || '').trim();
    if (needReasonIcon) card.classList.add('has-reason-icon');
    const reasonPenClass = needReasonIcon ? (hasAnomaly ? 'reason-pen-anomaly' : 'reason-pen-normal') : '';
    const reasonIconHtml = needReasonIcon ? `<div class="scatter-card-reason-icon ${reasonPenClass}" aria-hidden="true">✎</div>` : '';
    const infoPoints = getInfoPoints(emp);
    const firstInfoType = infoPoints.find(p => !infoPointHidden.has(p.type))?.type ?? null;
    const infoBarHtml = firstInfoType ? `<div class="scatter-card-info-bar" style="background:${INFO_POINT_TYPES[firstInfoType].color}"></div>` : '';
    if (firstInfoType) card.classList.add('has-info-bar');
    var cardContent = typeof buildPersonCardContent === 'function' ? buildPersonCardContent(emp, { showDelta: true, showOriginalLine: true, compact: false }) : '';
    card.innerHTML = infoBarHtml + reasonIconHtml + cardContent;
    if (isPerfPending) {
        var overlay = document.createElement('div');
        overlay.className = 'scatter-card-perf-overlay';
        overlay.innerHTML = '<span class="scatter-card-perf-overlay-text">点击填报绩效</span>';
        card.appendChild(overlay);
    }
    
    const hasReasonFilled = !!(emp.adjustmentReason || '').trim();
    const showSlideOutOnHover = hasAdjustment && (hasAnomaly || hasReasonFilled);
    if (showSlideOutOnHover) {
        card.classList.add('scatter-card-has-slideout');
        const anomalyText = hasAnomaly ? anomalies.join('；') : '';
        const reasonText = (emp.adjustmentReason || '').trim();
        const isYellow = hasAnomaly;
        const yellowEl = document.getElementById('anomalySlideOut');
        const blueEl = document.getElementById('reasonSlideOut');
        card.addEventListener('mouseenter', function() {
            if (slideOutHideTid) { clearTimeout(slideOutHideTid); slideOutHideTid = null; }
            let html = '';
            if (isYellow) {
                html = anomalyText.replace(/;/g, '；<br>');
                if (reasonText) html += '<br><br><strong>调薪原因：</strong><br>' + reasonText.replace(/\n/g, '<br>');
                yellowEl.innerHTML = html;
                yellowEl.classList.add('visible');
                blueEl.classList.remove('visible');
                positionSlideOut(card, yellowEl);
            } else {
                html = '<strong>调薪原因：</strong><br>' + reasonText.replace(/\n/g, '<br>');
                blueEl.innerHTML = html;
                blueEl.classList.add('visible');
                yellowEl.classList.remove('visible');
                positionSlideOut(card, blueEl);
            }
        });
        card.addEventListener('mousemove', function() {
            const el = isYellow ? yellowEl : blueEl;
            if (el.classList.contains('visible')) positionSlideOut(card, el);
        });
        card.addEventListener('mouseleave', function() {
            if (slideOutHideTid) clearTimeout(slideOutHideTid);
            slideOutHideTid = setTimeout(function() {
                yellowEl.classList.remove('visible');
                blueEl.classList.remove('visible');
                slideOutHideTid = null;
            }, 200);
        });
    }
    
    // 单击打开员工详情（调薪后定位到薪酬填报理由区域）；审批模式下联动表格与审批抽屉；填报模式下绩效待填时定位绩效 tab
    const needScrollToReason = hasAdjustment;
    card.addEventListener('click', function(ev) {
        if (circleSelectMode) return;
        if (ev.target.closest('.scatter-card-perfs')) return;
        if (ev.currentTarget._dragJustEnded) { ev.currentTarget._dragJustEnded = false; return; }
        if (activeTask && activeTask.role === 'approve') {
            setActivePersonId(emp.id);
            return;
        }
        if (isPerfPending) {
            showDetail(emp, false, false, 'performance');
        } else {
            showDetail(emp, needScrollToReason);
        }
    });
    
    if (circleSelectMode) {
        card.addEventListener('click', function(ev) {
            if (ev.target.closest('.scatter-card-anomaly-badge')) return;
            if (!selectedForCompare.has(emp.id)) {
                selectedForCompare.add(emp.id);
                card.classList.add('circle-selected');
            }
            updateComparePanel();
            if (currentView === 'scatter') renderScatterView();
        });
        card.addEventListener('dblclick', function(ev) {
            ev.preventDefault();
            if (ev.target.closest('.scatter-card-anomaly-badge')) return;
            selectedForCompare.delete(emp.id);
            card.classList.remove('circle-selected');
            updateComparePanel();
            if (currentView === 'scatter') renderScatterView();
        });
    }
    
    if (!isPerfPending) makeDraggable(card, emp);
    
    // 右键点击显示调薪输入框（卡片右侧）
    card.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (circleSelectMode || isPerfPending) return;
        showSalaryAdjustPopover(card, emp);
    });
    
    return card;
}

/** 在人员卡片右侧显示调薪输入框（人民币 + 百分比双区域） */
function showSalaryAdjustPopover(card, emp) {
    // 移除已存在的调薪浮层
    var existing = document.getElementById('salaryAdjustPopover');
    if (existing) existing.remove();
    
    var popover = document.createElement('div');
    popover.id = 'salaryAdjustPopover';
    popover.className = 'salary-adjust-popover';
    
    var baseSalary = emp.salary || 0;
    var adj = (emp.adjustment != null ? emp.adjustment : 0);
    var amountRmb = Math.round(baseSalary * (adj / 100));
    
    popover.innerHTML = '<div class="salary-adjust-popover-title">快速调薪</div>' +
        '<div class="salary-adjust-popover-row">' +
        '<input type="number" id="salaryAdjustAmount" class="salary-adjust-input" placeholder="调薪金额" value="' + (amountRmb !== 0 ? amountRmb : '') + '" step="100">' +
        '<span class="salary-adjust-unit">元</span>' +
        '</div>' +
        '<div class="salary-adjust-popover-row">' +
        '<input type="number" id="salaryAdjustPct" class="salary-adjust-input" placeholder="调薪比例" value="' + (adj !== 0 ? adj : '') + '" step="0.5">' +
        '<span class="salary-adjust-unit">%</span>' +
        '</div>' +
        '<div class="salary-adjust-popover-hint">输入任一数值，二者将联动</div>';
    
    document.body.appendChild(popover);
    
    var inputAmount = document.getElementById('salaryAdjustAmount');
    var inputPct = document.getElementById('salaryAdjustPct');
    
    function applyAdjustment() {
        var pctVal = parseFloat(inputPct.value);
        emp.adjustment = isNaN(pctVal) ? 0 : Math.round(pctVal * 10) / 10;
        if (typeof renderScatterView === 'function') renderScatterView();
        if (typeof updateStats === 'function') updateStats();
    }
    
    function syncFromAmount() {
        var val = parseFloat(inputAmount.value);
        if (isNaN(val) || baseSalary <= 0) {
            inputPct.value = '';
            emp.adjustment = 0;
            return;
        }
        var pct = (val / baseSalary) * 100;
        inputPct.value = Math.round(pct * 10) / 10;
        emp.adjustment = Math.round(pct * 10) / 10;
    }
    
    function syncFromPct() {
        var val = parseFloat(inputPct.value);
        if (isNaN(val)) {
            inputAmount.value = '';
            emp.adjustment = 0;
            return;
        }
        var amt = Math.round(baseSalary * (val / 100));
        inputAmount.value = amt;
        emp.adjustment = Math.round(val * 10) / 10;
    }
    
    inputAmount.addEventListener('input', function() {
        syncFromAmount();
        applyAdjustment();
    });
    inputAmount.addEventListener('change', function() { syncFromAmount(); applyAdjustment(); });
    
    inputPct.addEventListener('input', function() {
        syncFromPct();
        applyAdjustment();
    });
    inputPct.addEventListener('change', function() { syncFromPct(); applyAdjustment(); });
    
    inputAmount.focus();
    
    // 定位：卡片右侧，留出间隙
    var cardRect = card.getBoundingClientRect();
    var gap = 12;
    popover.style.left = (cardRect.right + gap) + 'px';
    popover.style.top = cardRect.top + 'px';
    
    // 防止超出视口
    var popRect = popover.getBoundingClientRect();
    if (popRect.right > window.innerWidth) {
        popover.style.left = (cardRect.left - popRect.width - gap) + 'px';
    }
    if (popRect.bottom > window.innerHeight) {
        popover.style.top = (window.innerHeight - popRect.height - 16) + 'px';
    }
    
    function closePopover() {
        if (popover.parentNode) popover.parentNode.removeChild(popover);
        document.removeEventListener('click', closeOnClickOutside);
    }
    
    function closeOnClickOutside(e) {
        if (!popover.parentNode) return;
        if (popover.contains(e.target) || card.contains(e.target)) return;
        closePopover();
    }
    
    setTimeout(function() { document.addEventListener('click', closeOnClickOutside); }, 0);
}

// X坐标转薪资(K)：按当前横轴范围 salaryAxisMinK ~ salaryAxisMaxK

function xToSalaryK(xPercent) {
    const t = Math.max(0, Math.min(100, xPercent)) / 100;
    return salaryAxisMinK + t * (salaryAxisMaxK - salaryAxisMinK);
}
// 兼容旧调用
function yToSalaryK(yPercent) {
    return xToSalaryK(yPercent);
}

const OVERLAP_THRESHOLD = 8;
const SPREAD_GAP_BASE = 8;
let clusterCollapseTid = null;
let isDraggingAnyCard = false;


function getSpreadGap(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.height) return SPREAD_GAP_BASE;
    const cardSample = canvas.querySelector('.scatter-card');
    const cardHeight = cardSample ? cardSample.offsetHeight : 70;
    const minGapPct = (cardHeight / rect.height) * 100 * 1.05;
    return Math.max(SPREAD_GAP_BASE, Math.min(18, minGapPct));
}

// 磁力排斥：构建重叠簇，hover/拖拽时展开
