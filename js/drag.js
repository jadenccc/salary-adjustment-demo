/* === drag.js === 拖拽调薪 + 残影 + 撤销 + 磁力排斥 */

/** 拖拽调薪浮层元素（鱼眼放大镜） */
var _dragOverlayEl = null;
/** 拖拽调薪浮层元素（鱼眼镜片） */
var _dragLensEl = null;

/* ── 撤销提示条 ── */

/**
 * 移除工具栏区域的撤销提示条 DOM
 */
function removeDragUndoHintVisual() {
    var infoBar = document.getElementById('infoFilterBar');
    var toolsRow = infoBar && infoBar.parentElement;
    if (toolsRow) toolsRow.querySelectorAll('.drag-undo-bar-wrap').forEach(function(el) { el.remove(); });
}

/**
 * 清除撤销提示条（别名，供外部调用）
 */
function clearDragUndoHint() {
    removeDragUndoHintVisual();
}

/**
 * 在工具栏区域显示"已调整 N 人薪酬 · 撤销"提示条
 */
function showDragUndoHint() {
    var infoBar = document.getElementById('infoFilterBar');
    if (!infoBar) return;
    var toolsRow = infoBar.parentElement;
    if (toolsRow) toolsRow.querySelectorAll('.drag-undo-bar-wrap').forEach(function(el) { el.remove(); });
    var n = undoStack.reduce(function(s, e) { return s + (e.entries ? e.entries.length : 0); }, 0);
    if (n === 0) return;
    var bar = document.createElement('div');
    bar.className = 'drag-undo-bar';
    bar.innerHTML = '<span>已调整 ' + n + ' 人薪酬</span><button class="undo-btn" type="button">撤销</button>';
    var btn = bar.querySelector('.undo-btn');
    if (btn) btn.onclick = function(e) { e.stopPropagation(); undoLastDrag(); };
    var wrap = document.createElement('div');
    wrap.className = 'drag-undo-bar-wrap';
    wrap.appendChild(bar);
    (toolsRow || infoBar).appendChild(wrap);
}

/* ── 撤销 / 复原 ── */

/**
 * 撤销最近一次拖拽调薪操作（从 undoStack 弹出并还原员工数据）
 */
function undoLastDrag() {
    if (undoStack.length === 0) return;
    var entry = undoStack.pop();
    (entry.entries || []).forEach(function(ent) {
        var emp = employees.find(function(e) { return e.id === ent.empId; });
        if (emp) {
            emp.adjustment = ent.origAdjustment;
            if (ent.origLevel != null) {
                if (typeof TIER_TO_LABEL !== 'undefined' && TIER_TO_LABEL[ent.origLevel]) emp.tier = TIER_TO_LABEL[ent.origLevel];
                else emp.level = ent.origLevel;
            }
        }
        delete cardGhosts[ent.empId];
        delete empInitialShadows[ent.empId];
    });
    clearDragUndoHint();
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
    if (undoStack.length > 0) showDragUndoHint();
}

/**
 * 点击初始位置阴影时，将员工薪酬/职级复原到页面打开时的初始状态
 * @param {number} empId - 员工 ID
 */
function restoreCardFromInitialShadow(empId) {
    var emp = employees.find(function(e) { return e.id === empId; });
    if (!emp) return;
    var rec = empInitialShadows && empInitialShadows[empId];
    if (!rec) return;
    emp.adjustment = 0;
    if (rec.origLevel != null) {
        if (typeof TIER_TO_LABEL !== 'undefined' && TIER_TO_LABEL[rec.origLevel]) emp.tier = TIER_TO_LABEL[rec.origLevel];
        else emp.level = rec.origLevel;
    }
    delete cardGhosts[empId];
    delete empInitialShadows[empId];
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
    updateStats();
    showDragUndoHint();
}

/* ── 选区整体拖拽 ── */

/**
 * 使圈选矩形可拖拽，拖拽时同步移动矩形内所有卡片并更新薪酬
 * @param {HTMLElement} rect - 选区矩形 DOM 元素
 * @param {HTMLElement[]} cards - 矩形内的散点卡片数组
 */
function makeSelectionRectDraggable(rect, cards) {
    let startX, startY, startRectLeft, startRectTop, startCardPositions, startCardAdjustments;
    let moveHandler, upHandler;

    rect.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX; startY = e.clientY;
        startRectLeft = parseFloat(rect.style.left);
        startRectTop = parseFloat(rect.style.top);
        startCardPositions = cards.map(c => ({ left: parseFloat(c.style.left), top: parseFloat(c.style.top) }));
        startCardAdjustments = cards.map(c => {
            const emp = employees.find(em => em.id === parseInt(c.dataset.empId));
            return emp ? (emp.adjustment || 0) : 0;
        });
        rect.style.cursor = 'grabbing';

        moveHandler = function(e) {
            const canvas = document.getElementById('chartCanvas');
            const rectCanvas = canvas.getBoundingClientRect();
            const dx = (e.clientX - startX) / rectCanvas.width * 100;
            const dy = (e.clientY - startY) / rectCanvas.height * 100;
            let newRectLeft = Math.max(0, Math.min(100 - parseFloat(rect.style.width), startRectLeft + dx));
            let newRectTop = Math.max(0, Math.min(100 - parseFloat(rect.style.height), startRectTop + dy));
            rect.style.left = newRectLeft + '%';
            rect.style.top = newRectTop + '%';
            cards.forEach((c, i) => {
                let newLeft = Math.max(0, Math.min(100, startCardPositions[i].left + dx));
                let newTop = Math.max(0, Math.min(100, startCardPositions[i].top + dy));
                c.style.left = newLeft + '%';
                c.style.top = newTop + '%';
                updateBubbleAndLineForCard(c);
                const emp = employees.find(em => em.id === parseInt(c.dataset.empId));
                if (emp) {
                    const baseSalaryK = emp.salary / 1000;
                    const newSalaryK = xToSalaryK(newLeft);
                    const pct = baseSalaryK ? ((newSalaryK - baseSalaryK) / baseSalaryK * 100) : 0;
                    emp.adjustment = Math.round(pct);
                    const deltaEl = c.querySelector('[data-delta]');
                    if (deltaEl) {
                        const deltaK = newSalaryK - baseSalaryK;
                        deltaEl.textContent = (deltaK >= 0 ? '+' : '') + deltaK.toFixed(1) + 'K ' + (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
                        deltaEl.className = 'scatter-card-delta ' + (deltaK > 0 ? 'positive' : deltaK < 0 ? 'negative' : 'zero');
                    }
                }
            });
        };

        upHandler = function() {
            rect.style.cursor = 'move';
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            var isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
            var undoEntries = cards.map(function(c, i) {
                var empId = parseInt(c.dataset.empId, 10);
                var emp = employees.find(function(e) { return e.id === empId; });
                var origLeft = startCardPositions[i].left;
                var origTop = startCardPositions[i].top;
                var origSalaryK = emp ? emp.salary / 1000 : 0;
                var origLevel = emp ? (isTier && typeof getEmpTier === 'function' ? getEmpTier(emp) : emp.level) : undefined;
                cardGhosts[empId] = { originalSalaryK: origSalaryK, originalLevel: origLevel };
                if (emp && !empInitialShadows[empId] && window._lastVisibleStruct && window._lastSpanK != null && typeof getOriginalPositionForEmp === 'function') {
                    var origPos = getOriginalPositionForEmp(emp, window._lastVisibleStruct, window._lastSpanK, origLevel, origSalaryK);
                    empInitialShadows[empId] = { leftPct: origPos.leftPct, topPct: origPos.topPct, name: emp.name || '', origSalaryK: origSalaryK, origLevel: origLevel };
                }
                return { empId: empId, origLeft: origLeft, origTop: origTop, origAdjustment: startCardAdjustments[i], origLevel: origLevel };
            });
            undoStack.push({ entries: undoEntries });
            if (currentView === 'scatter') renderScatterView();
            updateStats();
            setTimeout(function() { showDragUndoHint(); }, 0);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    });
}

/* ── 磁力排斥（重叠卡片 hover 展开） ── */

/**
 * 为散点图中重叠的卡片簇设置磁力排斥效果：
 * hover 时展开簇内卡片，离开时收回；拖拽时也触发展开
 * @param {HTMLElement} canvas - 散点图画布元素
 * @param {Array} filtered - 当前可见员工数组
 */
function setupMagneticRepulsion(canvas, filtered) {
    const cards = Array.from(canvas.querySelectorAll('.scatter-card'));
    const empMap = {};
    filtered.forEach(emp => { empMap[emp.id] = emp; });

    /* 按"部门|职级"分组，检测横向重叠 */
    const groups = {};
    cards.forEach(c => {
        const key = (c.dataset.mainDept || '') + '|' + (c.dataset.level || '');
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    });

    const clusters = [];
    Object.keys(groups).forEach(key => {
        const list = groups[key].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
        let i = 0;
        while (i < list.length) {
            const cluster = [list[i]];
            let j = i + 1;
            while (j < list.length && Math.abs(parseFloat(list[j].style.left) - parseFloat(cluster[cluster.length - 1].style.left)) < OVERLAP_THRESHOLD) {
                cluster.push(list[j]);
                j++;
            }
            if (cluster.length >= 2) {
                clusters.push({ cards: cluster, origLefts: cluster.map(c => parseFloat(c.style.left)), key: key });
            }
            i = j;
        }
    });

    clusters.forEach(clu => { clu.cards.forEach(c => { c._cluster = clu; }); });

    /** 获取卡片当前展示薪酬（含调薪） */
    function getDisplaySalary(card) {
        const emp = empMap[parseInt(card.dataset.empId)];
        if (!emp) return 0;
        return emp.salary * (1 + (emp.adjustment || 0) / 100);
    }

    /** 展开簇内卡片（排除正在拖拽的卡片） */
    function spreadCluster(clu, excludeCard) {
        const toSpread = clu.cards.filter(c => c !== excludeCard);
        if (toSpread.length < 2) return;
        const sorted = toSpread.slice().sort((a, b) => getDisplaySalary(a) - getDisplaySalary(b));
        const center = clu.origLefts.reduce((s, l) => s + l, 0) / clu.origLefts.length;
        const n = sorted.length;
        const gap = getSpreadGap(canvas);
        const halfSpan = ((n - 1) * gap) / 2;
        sorted.forEach((c, i) => {
            const newLeft = Math.max(2, Math.min(98, center - halfSpan + i * gap));
            c.style.left = newLeft + '%';
            updateBubbleAndLineForCard(c);
        });
    }

    /** 收回簇内卡片到原始位置 */
    function collapseCluster(clu) {
        clu.cards.forEach((c, i) => {
            c.style.left = clu.origLefts[i] + '%';
            updateBubbleAndLineForCard(c);
        });
    }

    /* 绑定 hover 事件 */
    clusters.forEach(clu => {
        clu.cards.forEach(c => {
            c.addEventListener('mouseenter', function() {
                if (clusterCollapseTid) { clearTimeout(clusterCollapseTid); clusterCollapseTid = null; }
                spreadCluster(clu);
            });
            c.addEventListener('mouseleave', function() {
                if (isDraggingAnyCard) return;
                clusterCollapseTid = setTimeout(() => collapseCluster(clu), 300);
            });
        });
    });

    /* 拖拽时触发邻近簇展开 */
    window._onDragMoveForCluster = function(draggedCard, newLeft, newTop) {
        const otherCards = cards.filter(c => c !== draggedCard);
        for (const c of otherCards) {
            const clu = c._cluster;
            if (!clu) continue;
            const l = parseFloat(c.style.left), t = parseFloat(c.style.top);
            if (Math.abs(t - newTop) > 15) continue;
            if (Math.abs(l - newLeft) < OVERLAP_THRESHOLD * 1.5) {
                spreadCluster(clu, draggedCard);
                break;
            }
        }
    };
    window._onDragEndForCluster = function() {
        clusters.forEach(clu => collapseCluster(clu));
    };
}

/* ── 拖拽调薪浮层（鱼眼 + 金额/百分比显示） ── */

/**
 * 创建拖拽调薪浮层（鱼眼镜片 + 金额/百分比显示层）
 * @param {HTMLElement} card - 被拖拽的散点卡片
 * @param {Object} emp - 员工对象
 */
function createDragOverlay(card, emp) {
    removeDragOverlay();
    var canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    var diameter = Math.max(256, (card.offsetWidth || 128) * 2);

    var lens = document.createElement('div');
    lens.className = 'drag-fisheye-lens';
    lens.style.width = diameter + 'px';
    lens.style.height = diameter + 'px';
    canvas.appendChild(lens);
    _dragLensEl = lens;

    var overlay = document.createElement('div');
    overlay.className = 'drag-salary-overlay';
    overlay.innerHTML =
        '<div class="drag-salary-line drag-salary-line-left" id="dragOverlayLineLeft"><span class="drag-salary-value" id="dragOverlayAmount">0</span></div>' +
        '<div class="drag-salary-line drag-salary-line-right" id="dragOverlayLineRight"><span class="drag-salary-value" id="dragOverlayPct">0%</span></div>';
    overlay.style.width = diameter + 'px';
    overlay.style.height = diameter + 'px';
    canvas.appendChild(overlay);
    _dragOverlayEl = overlay;
}

/**
 * 更新拖拽调薪浮层的位置和显示数值
 * @param {HTMLElement} card - 被拖拽的散点卡片
 * @param {number} pctStepped - 已取整的调薪百分比
 * @param {number} deltaKStepped - 已取整的调薪金额（K）
 */
function updateDragOverlay(card, pctStepped, deltaKStepped) {
    if (!_dragOverlayEl) return;
    var cardLeft = parseFloat(card.style.left);
    var cardTop = parseFloat(card.style.top);
    if (_dragLensEl) {
        _dragLensEl.style.left = cardLeft + '%';
        _dragLensEl.style.top = cardTop + '%';
    }
    _dragOverlayEl.style.left = cardLeft + '%';
    _dragOverlayEl.style.top = cardTop + '%';
    var lineClass = (deltaKStepped || 0) > 0 ? 'positive' : (deltaKStepped || 0) < 0 ? 'negative' : 'zero';
    var amountEl = document.getElementById('dragOverlayAmount');
    if (amountEl) {
        var dk = deltaKStepped || 0;
        amountEl.textContent = (dk >= 0 ? '+' : '') + dk.toFixed(1) + 'K';
        amountEl.className = 'drag-salary-value ' + lineClass;
    }
    var leftLine = document.getElementById('dragOverlayLineLeft');
    if (leftLine) leftLine.className = 'drag-salary-line drag-salary-line-left ' + lineClass;
    var pctEl = document.getElementById('dragOverlayPct');
    if (pctEl) {
        pctEl.textContent = (pctStepped >= 0 ? '+' : '') + pctStepped + '%';
        pctEl.className = 'drag-salary-value ' + lineClass;
    }
    var rightLine = document.getElementById('dragOverlayLineRight');
    if (rightLine) rightLine.className = 'drag-salary-line drag-salary-line-right ' + lineClass;
}

/**
 * 移除拖拽调薪浮层（鱼眼镜片 + 金额层）
 */
function removeDragOverlay() {
    if (_dragLensEl && _dragLensEl.parentNode) {
        _dragLensEl.parentNode.removeChild(_dragLensEl);
        _dragLensEl = null;
    }
    if (_dragOverlayEl && _dragOverlayEl.parentNode) {
        _dragOverlayEl.parentNode.removeChild(_dragOverlayEl);
        _dragOverlayEl = null;
    }
}

/* ── 单卡片拖拽 ── */

/**
 * 为散点卡片绑定拖拽调薪交互：
 * - 横向拖拽 → 调整薪酬（5% 步进取整）
 * - 纵向拖拽 → 切换梯队/职级（吸附到对应行）
 * - 拖拽距离 < CANCEL_DIST_PCT 时视为取消，还原数据
 * - 松手后写入 undoStack，显示撤销提示条
 * @param {HTMLElement} card - 散点卡片 DOM 元素
 * @param {Object} emp - 对应员工对象
 */
function makeDraggable(card, emp) {
    var isDragging = false;
    var pending = false;
    var startX, startY, startLeft, startTop, startAdjustment, startLevel;
    var baseSalaryK = emp.salary / 1000;
    var DRAG_THRESHOLD = 5;       // 像素：超过此距离才触发拖拽
    var CANCEL_DIST_PCT = 2;      // 百分比：松手距离小于此值视为取消

    card.addEventListener('mousedown', function(e) {
        if (e.button !== 0 || circleSelectMode) return;
        pending = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(card.style.left);
        startTop = parseFloat(card.style.top);
        startAdjustment = emp.adjustment || 0;
        startLevel = emp.level;
    });

    document.addEventListener('mousemove', function(e) {
        if (pending && !isDragging) {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
                isDragging = true;
                isDraggingAnyCard = true;
                if (clusterCollapseTid) { clearTimeout(clusterCollapseTid); clusterCollapseTid = null; }
                card.classList.add('scatter-card-dragging');
                card.style.cursor = 'grabbing';
                createDragOverlay(card, emp);
            }
        }
        if (isDragging) {
            var canvas = document.getElementById('chartCanvas');
            var rect = canvas.getBoundingClientRect();
            var dx = (e.clientX - startX) / rect.width * 100;
            var dy = (e.clientY - startY) / rect.height * 100;
            /* 横向：薪酬（自由移动）；纵向：梯队（限制在本部门范围内） */
            var newLeft = Math.max(0, Math.min(100, startLeft + dx));
            var newTop = startTop + dy;
            var mainDept = card.dataset.mainDept;
            if (mainDept && window._lastVisibleStruct) {
                var range = getDeptYRange(mainDept, window._lastVisibleStruct);
                newTop = Math.max(range.minPct, Math.min(range.maxPct, newTop));
            } else {
                newTop = Math.max(0, Math.min(100, newTop));
            }
            card.style.left = newLeft + '%';
            card.style.top = newTop + '%';
            updateBubbleAndLineForCard(card);
            /* 横向位置对应薪酬，5% 步进取整 */
            var newSalaryK = xToSalaryK(newLeft);
            var deltaK = newSalaryK - baseSalaryK;
            var pct = baseSalaryK ? ((deltaK / baseSalaryK) * 100) : 0;
            var pctStepped = Math.round(pct / 5) * 5;
            var deltaKStepped = baseSalaryK * (pctStepped / 100);
            var deltaEl = card.querySelector('[data-delta]');
            if (deltaEl) {
                deltaEl.textContent = (deltaKStepped >= 0 ? '+' : '') + deltaKStepped.toFixed(1) + 'K ' + (pctStepped >= 0 ? '+' : '') + pctStepped + '%';
                deltaEl.className = 'scatter-card-delta ' + (deltaKStepped > 0 ? 'positive' : deltaKStepped < 0 ? 'negative' : 'zero');
            }
            updateDragOverlay(card, pctStepped, deltaKStepped);
            if (window._onDragMoveForCluster) window._onDragMoveForCluster(card, newLeft, newTop);
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            var newLeft = parseFloat(card.style.left);
            var newTop = parseFloat(card.style.top);
            var distPct = Math.hypot(newLeft - startLeft, newTop - startTop);
            isDragging = false;
            isDraggingAnyCard = false;
            card.classList.remove('scatter-card-dragging');
            card.style.cursor = '';
            removeDragOverlay();
            if (window._onDragEndForCluster) window._onDragEndForCluster();

            var mainDept = card.dataset.mainDept;
            var levelChanged = false;
            var isTier = (typeof axisXLabelType !== 'undefined' && axisXLabelType === 'tier');
            var startLevelSnap = isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level;
            var startTier = emp.tier;

            /* 纵向位置对应梯队/职级 */
            if (mainDept && window._lastVisibleStruct) {
                var newSlot = topPctToLevelInDept(mainDept, newTop, window._lastVisibleStruct);
                if (newSlot && newSlot !== startLevelSnap) {
                    if (isTier && typeof TIER_TO_LABEL !== 'undefined') {
                        emp.tier = TIER_TO_LABEL[newSlot] || emp.tier;
                    } else {
                        emp.level = newSlot;
                    }
                    levelChanged = true;
                }
            }

            if (distPct < CANCEL_DIST_PCT) {
                /* 拖拽距离过短：视为取消，还原数据 */
                emp.adjustment = startAdjustment;
                if (levelChanged) {
                    if (isTier) emp.tier = startTier;
                    else emp.level = startLevel;
                    levelChanged = false;
                }
                if (currentView === 'scatter') renderScatterView();
                updateStats();
            } else {
                /* 正常拖拽结束：更新薪酬、记录残影、写入撤销栈 */
                if (levelChanged) {
                    var slotForSnap = isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level;
                    card.dataset.level = slotForSnap;
                    var snapTop = getYPositionInVisible(mainDept, slotForSnap, window._lastVisibleStruct);
                    card.style.top = snapTop + '%';
                }
                var newSalaryK = xToSalaryK(newLeft);
                var pct = baseSalaryK ? ((newSalaryK - baseSalaryK) / baseSalaryK * 100) : 0;
                emp.adjustment = Math.round(pct / 5) * 5;
                cardGhosts[emp.id] = { originalSalaryK: baseSalaryK, originalLevel: startLevel };
                if (!empInitialShadows[emp.id] && window._lastVisibleStruct && window._lastSpanK != null) {
                    var origPos = getOriginalPositionForEmp(emp, window._lastVisibleStruct, window._lastSpanK, startLevel, baseSalaryK);
                    empInitialShadows[emp.id] = { leftPct: origPos.leftPct, topPct: origPos.topPct, name: emp.name || '', origSalaryK: baseSalaryK, origLevel: startLevel };
                }
                undoStack.push({ entries: [{ empId: emp.id, origLeft: startLeft, origTop: startTop, origAdjustment: startAdjustment, origLevel: startLevel }] });
                if (currentView === 'scatter') renderScatterView();
                updateStats();
                setTimeout(function() { showDragUndoHint(); }, 0);
            }
            card._dragJustEnded = true;
        }
        pending = false;
    });
}
