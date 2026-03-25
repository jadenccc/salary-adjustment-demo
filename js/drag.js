/* === drag.js === 拖拽调薪 + 残影 + 撤销 + 磁力排斥 */

function removeDragUndoHintVisual() {
    var infoBar = document.getElementById('infoFilterBar');
    var toolsRow = infoBar && infoBar.parentElement;
    if (toolsRow) toolsRow.querySelectorAll('.drag-undo-bar-wrap').forEach(function(el) { el.remove(); });
}
function clearDragUndoHint() {
    removeDragUndoHintVisual();
}

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

function undoLastDrag() {
    if (undoStack.length === 0) return;
    var entry = undoStack.pop();
    var undoNames = [];
    (entry.entries || []).forEach(function(ent) {
        var emp = employees.find(function(e) { return e.id === ent.empId; });
        if (emp) {
            emp.adjustment = ent.origAdjustment;
            if (ent.origLevel != null) {
                if (typeof TIER_TO_LABEL !== 'undefined' && TIER_TO_LABEL[ent.origLevel]) emp.tier = TIER_TO_LABEL[ent.origLevel];
                else emp.level = ent.origLevel;
            }
            undoNames.push(emp.name);
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

/** 点击初始位置阴影时，将卡片复原到打开页面时的初始位置 */
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

function makeSelectionRectDraggable(rect, cards) {
    let startX, startY, startRectLeft, startRectTop, startCardPositions, startCardAdjustments;
    let moveHandler, upHandler;
    rect.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX; startY = e.clientY;
        startRectLeft = parseFloat(rect.style.left); startRectTop = parseFloat(rect.style.top);
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
            let newRectLeft = startRectLeft + dx, newRectTop = startRectTop + dy;
            newRectLeft = Math.max(0, Math.min(100 - parseFloat(rect.style.width), newRectLeft));
            newRectTop = Math.max(0, Math.min(100 - parseFloat(rect.style.height), newRectTop));
            rect.style.left = newRectLeft + '%'; rect.style.top = newRectTop + '%';
            cards.forEach((c, i) => {
                let newLeft = startCardPositions[i].left + dx, newTop = startCardPositions[i].top + dy;
                newLeft = Math.max(0, Math.min(100, newLeft)); newTop = Math.max(0, Math.min(100, newTop));
                c.style.left = newLeft + '%'; c.style.top = newTop + '%';
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
                var origLeft = startCardPositions[i].left, origTop = startCardPositions[i].top;
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


function setupMagneticRepulsion(canvas, filtered) {
    const cards = Array.from(canvas.querySelectorAll('.scatter-card'));
    const empMap = {};
    filtered.forEach(emp => { empMap[emp.id] = emp; });
    
    const groups = {};
    cards.forEach(c => {
        const key = (c.dataset.mainDept || '') + '|' + (c.dataset.level || '');
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    });
    
    const clusters = [];
    Object.keys(groups).forEach(key => {
        // 新布局：同一梯队槽位内，按横向（left/薪酬）排序检测重叠
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
                const origLefts = cluster.map(c => parseFloat(c.style.left));
                clusters.push({ cards: cluster, origLefts: origLefts, key: key });
            }
            i = j;
        }
    });
    
    clusters.forEach(clu => {
        clu.cards.forEach(c => { c._cluster = clu; });
    });
    
    function getDisplaySalary(card) {
        const emp = empMap[parseInt(card.dataset.empId)];
        if (!emp) return 0;
        const adj = emp.adjustment || 0;
        return emp.salary * (1 + adj / 100);
    }
    
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
    
    function collapseCluster(clu) {
        clu.cards.forEach((c, i) => {
            c.style.left = clu.origLefts[i] + '%';
            updateBubbleAndLineForCard(c);
        });
    }
    
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

// 拖拽调薪：拖拽调薪，松手后撤销或拖回原位可恢复

var _dragOverlayEl = null;
var _dragLensEl = null;

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
    overlay.innerHTML = '<div class="drag-salary-line drag-salary-line-left" id="dragOverlayLineLeft"><span class="drag-salary-value" id="dragOverlayAmount">0</span></div>' +
        '<div class="drag-salary-line drag-salary-line-right" id="dragOverlayLineRight"><span class="drag-salary-value" id="dragOverlayPct">0%</span></div>';
    overlay.style.width = diameter + 'px';
    overlay.style.height = diameter + 'px';
    canvas.appendChild(overlay);
    _dragOverlayEl = overlay;
}

function updateDragOverlay(card, pctStepped, deltaKStepped) {
    if (!_dragOverlayEl) return;
    var canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    var cardLeft = parseFloat(card.style.left);
    var cardTop = parseFloat(card.style.top);
    if (_dragLensEl) {
        _dragLensEl.style.left = cardLeft + '%';
        _dragLensEl.style.top = cardTop + '%';
    }
    _dragOverlayEl.style.left = cardLeft + '%';
    _dragOverlayEl.style.top = cardTop + '%';
    var amountEl = document.getElementById('dragOverlayAmount');
    var pctEl = document.getElementById('dragOverlayPct');
    var lineClass = (deltaKStepped || 0) > 0 ? 'positive' : (deltaKStepped || 0) < 0 ? 'negative' : 'zero';
    if (amountEl) {
        var dk = deltaKStepped || 0;
        amountEl.textContent = (dk >= 0 ? '+' : '') + dk.toFixed(1) + 'K';
        amountEl.className = 'drag-salary-value ' + lineClass;
    }
    var leftLine = document.getElementById('dragOverlayLineLeft');
    if (leftLine) { leftLine.className = 'drag-salary-line drag-salary-line-left ' + lineClass; }
    if (pctEl) {
        pctEl.textContent = (pctStepped >= 0 ? '+' : '') + pctStepped + '%';
        pctEl.className = 'drag-salary-value ' + lineClass;
    }
    var rightLine = document.getElementById('dragOverlayLineRight');
    if (rightLine) { rightLine.className = 'drag-salary-line drag-salary-line-right ' + lineClass; }
}

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

function makeDraggable(card, emp) {
    var isDragging = false;
    var pending = false;
    var startX, startY, startLeft, startTop, startAdjustment, startLevel;
    var baseSalaryK = emp.salary / 1000;
    var DRAG_THRESHOLD = 5;
    var CANCEL_DIST_PCT = 2;
    
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
            var dist = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (dist > DRAG_THRESHOLD) {
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
            // 新布局：横向=薪酬（自由移动），纵向=梯队（限制在本部门范围内）
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
            // 新布局：横向位置对应薪酬
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
            var startLevel = isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level;
            var startTier = emp.tier;
            // 新布局：纵向位置对应梯队/职级
            if (mainDept && window._lastVisibleStruct) {
                var newSlot = topPctToLevelInDept(mainDept, newTop, window._lastVisibleStruct);
                if (newSlot && newSlot !== startLevel) {
                    if (isTier && typeof TIER_TO_LABEL !== 'undefined') {
                        emp.tier = TIER_TO_LABEL[newSlot] || emp.tier;
                    } else {
                        emp.level = newSlot;
                    }
                    levelChanged = true;
                }
            }
            if (distPct < CANCEL_DIST_PCT) {
                emp.adjustment = startAdjustment;
                if (levelChanged) {
                    if (isTier) emp.tier = startTier;
                    else emp.level = startLevel;
                    levelChanged = false;
                }
                if (currentView === 'scatter') renderScatterView();
                updateStats();
            } else {
                if (levelChanged) {
                    var slotForSnap = isTier ? (typeof getEmpTier === 'function' ? getEmpTier(emp) : 'T2') : emp.level;
                    card.dataset.level = slotForSnap;
                    // 新布局：梯队变更后吸附到对应纵向位置
                    var snapTop = getYPositionInVisible(mainDept, slotForSnap, window._lastVisibleStruct);
                    card.style.top = snapTop + '%';
                }
                // 新布局：横向位置对应薪酬
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

