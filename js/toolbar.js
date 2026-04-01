/* === toolbar.js === 侧边工具栏 + 信息点系统 */

/** 当前图表缩放百分比（40~250） */
var chartZoomPercent = 100;

/**
 * 获取员工的信息点列表（活跃状态、人员标签、连续未调薪、备注）
 * @param {Object} emp - 员工对象
 * @returns {Array<{type: string, text: string}>}
 */
function getInfoPoints(emp) {
    const points = [];
    if (ACTIVE_STATUS_MAP[emp.id]) {
        points.push({ type: 'active', text: ACTIVE_STATUS_MAP[emp.id] });
    }
    if (PERSON_TAG_MAP[emp.id]) {
        points.push({ type: 'personTag', text: PERSON_TAG_MAP[emp.id] });
    }
    if ((emp.consecutiveNoRaise || 0) >= 2 || (emp.id % 11 === 2)) {
        points.push({ type: 'noRaiseTwice', text: '连续两次以上未调薪' });
    }
    if ((emp.managerNote || '').trim()) {
        points.push({ type: 'note', text: (emp.managerNote || '').trim() });
    }
    return points;
}

/**
 * 切换信息点类型的显示/隐藏（点击 chip 时调用）
 * @param {HTMLElement} chip - 被点击的 chip 元素，需有 data-type 属性
 */
function toggleInfoType(chip) {
    const type = chip.dataset.type;
    if (infoPointHidden.has(type)) {
        infoPointHidden.delete(type);
        chip.classList.replace('inactive', 'active');
    } else {
        infoPointHidden.add(type);
        chip.classList.replace('active', 'inactive');
    }
    document.querySelectorAll('[data-info-type="' + type + '"]').forEach(el => {
        el.classList.toggle('hidden', infoPointHidden.has(type));
    });
    document.querySelectorAll('.info-connector-svg line[data-info-type="' + type + '"]').forEach(el => {
        el.setAttribute('opacity', infoPointHidden.has(type) ? '0' : '0.4');
    });
}

/**
 * 直接设置某信息点类型的可见性，并刷新散点图
 * @param {string} type - 信息点类型
 * @param {boolean} visible - true=显示，false=隐藏
 */
function setInfoTypeVisible(type, visible) {
    if (visible) infoPointHidden.delete(type); else infoPointHidden.add(type);
    document.querySelectorAll('[data-info-type="' + type + '"]').forEach(function(el) {
        el.classList.toggle('hidden', infoPointHidden.has(type));
    });
    document.querySelectorAll('.info-connector-svg line[data-info-type="' + type + '"]').forEach(function(el) {
        el.setAttribute('opacity', infoPointHidden.has(type) ? '0' : '0.4');
    });
    if (currentView === 'scatter') renderScatterView();
}

/**
 * 同步侧边工具栏"选择"/"圈选"按钮的激活状态
 */
function updateSideToolbarActiveState() {
    var sel = document.getElementById('sideToolSelect');
    var circle = document.getElementById('sideToolCircle');
    if (sel) sel.classList.toggle('active', !circleSelectMode);
    if (circle) circle.classList.toggle('active', circleSelectMode);
}

/**
 * 渲染侧边工具栏中的圈选分组列表
 */
function renderSideToolbarCircleList() {
    var list = document.getElementById('sideToolbarCircleList');
    if (!list) return;
    list.innerHTML = '';
    circleGroups.forEach(function(g) {
        var row = document.createElement('div');
        row.className = 'side-toolbar-group-item';
        var nameEsc = g.name.replace(/</g, '&lt;').replace(/"/g, '&quot;');
        row.innerHTML =
            '<span class="side-toolbar-group-name" data-name="' + nameEsc + '" style="cursor:pointer">' +
            g.name.replace(/</g, '&lt;') + '</span>' +
            '<span class="side-toolbar-group-del" data-name="' + nameEsc + '">删除</span>';
        row.querySelector('.side-toolbar-group-del').onclick = function(e) {
            e.stopPropagation();
            removeCircleGroup(this.dataset.name);
        };
        row.querySelector('.side-toolbar-group-name').onclick = function() {
            filters.circleGroup = g.name;
            renderCircleGroupFilters();
            if (currentView === 'scatter') renderScatterView();
            if (currentView === 'table') renderTableView();
            if (currentView === 'grid') renderGridView();
            updateStats();
        };
        list.appendChild(row);
    });
}

/**
 * 将图表容器按 chartZoomPercent 缩放
 */
function applyChartZoom() {
    var c = document.getElementById('chartContainer');
    if (!c) return;
    c.style.transformOrigin = '0 0';
    c.style.transform = 'scale(' + (chartZoomPercent / 100) + ')';
}

/**
 * 初始化侧边工具栏：绑定所有按钮事件、信息点开关、缩放、工作台模式
 */
function initSideToolbar() {
    var infoPanel = document.getElementById('sideToolbarInfoPanel');
    var circlePanel = document.getElementById('sideToolbarCirclePanel');
    var infoBtn = document.getElementById('sideToolInfo');
    var circleBtn = document.getElementById('sideToolCircle');

    /* 选择工具按钮：退出圈选模式 */
    if (document.getElementById('sideToolSelect')) {
        document.getElementById('sideToolSelect').onclick = function() {
            if (circleSelectMode) toggleCircleSelect();
        };
    }

    /* 圈选工具按钮 */
    if (circleBtn) circleBtn.onclick = function() { toggleCircleSelect(); };

    /* 信息点面板开关 */
    if (infoBtn) {
        infoBtn.onclick = function() {
            if (infoPanel) {
                infoPanel.classList.toggle('open');
                infoBtn.classList.toggle('semi-active', infoPanel.classList.contains('open'));
            }
        };
    }

    /* 添加备注按钮 */
    var addNoteBtn = document.getElementById('sideToolAddNote');
    if (addNoteBtn) addNoteBtn.onclick = function() {
        if (selectedEmployee) showDetail(selectedEmployee, false, true);
        else alert('请先选择人员');
    };

    /* 工作台聚焦模式（鼠标跟随高亮） */
    (function() {
        var workstationBtn = document.getElementById('sideToolWorkstation');
        var overlay = document.getElementById('workstationOverlay');
        var canvasContent = document.querySelector('.canvas-content');
        if (!workstationBtn || !overlay || !canvasContent) return;
        var workstationMode = false;
        var boundMove = function(e) {
            var r = overlay.getBoundingClientRect();
            overlay.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            overlay.style.setProperty('--my', (e.clientY - r.top) + 'px');
        };
        workstationBtn.onclick = function() {
            workstationMode = !workstationMode;
            overlay.classList.toggle('active', workstationMode);
            workstationBtn.classList.toggle('active', workstationMode);
            if (workstationMode) {
                var r = overlay.getBoundingClientRect();
                overlay.style.setProperty('--mx', (r.width / 2) + 'px');
                overlay.style.setProperty('--my', (r.height / 2) + 'px');
                document.addEventListener('mousemove', boundMove);
            } else {
                document.removeEventListener('mousemove', boundMove);
            }
        };
    })();

    /* 信息点默认可见性初始化 */
    [['active', true], ['personTag', true], ['noRaiseTwice', true], ['note', false]].forEach(function(pair) {
        var type = pair[0], on = pair[1];
        if (!infoPointHidden.has(type) !== on) {
            if (on) infoPointHidden.delete(type); else infoPointHidden.add(type);
        }
    });

    /* 信息点开关 toggle */
    document.querySelectorAll('#sideToolbarInfoPanel .side-toolbar-toggle[data-type]').forEach(function(tog) {
        var type = tog.dataset.type;
        if (type === 'hideAdjusted') {
            tog.classList.toggle('on', hideAdjustedCards);
            tog.onclick = function() {
                hideAdjustedCards = !hideAdjustedCards;
                tog.classList.toggle('on', hideAdjustedCards);
                if (currentView === 'scatter') renderScatterView();
            };
            return;
        }
        tog.classList.toggle('on', !infoPointHidden.has(type));
        tog.onclick = function() {
            var newVisible = infoPointHidden.has(type);
            setInfoTypeVisible(type, newVisible);
            tog.classList.toggle('on', newVisible);
        };
    });

    /* 缩放控件 */
    document.getElementById('sideToolZoomText').textContent = chartZoomPercent + '%';
    document.getElementById('sideToolZoomOut').onclick = function() {
        chartZoomPercent = Math.max(40, chartZoomPercent - 15);
        document.getElementById('sideToolZoomText').textContent = chartZoomPercent + '%';
        applyChartZoom();
    };
    document.getElementById('sideToolZoomIn').onclick = function() {
        chartZoomPercent = Math.min(250, chartZoomPercent + 15);
        document.getElementById('sideToolZoomText').textContent = chartZoomPercent + '%';
        applyChartZoom();
    };

    /* 工具栏折叠/展开 */
    (function() {
        var wrap = document.getElementById('sideToolbarWrap');
        var toggleBtn = document.getElementById('sideToolToggle');
        if (wrap && toggleBtn) {
            toggleBtn.onclick = function() {
                wrap.classList.toggle('collapsed');
                var collapsed = wrap.classList.contains('collapsed');
                toggleBtn.setAttribute('data-tip', collapsed ? '展开' : '收起');
                toggleBtn.setAttribute('title', collapsed ? '展开' : '收起');
            };
        }
    })();

    /* 点击外部关闭信息点/圈选面板 */
    document.addEventListener('click', function(e) {
        if (!infoPanel || !circlePanel) return;
        if (infoPanel.classList.contains('open') && !infoPanel.contains(e.target) && !infoBtn.contains(e.target)) {
            infoPanel.classList.remove('open');
            if (infoBtn) infoBtn.classList.remove('semi-active');
        }
        if (circlePanel.classList.contains('open') && !circlePanel.contains(e.target) && !circleBtn.contains(e.target)) {
            circlePanel.classList.remove('open');
        }
    });

    /* Ctrl/Cmd + 滚轮缩放 */
    var container = document.getElementById('chartContainer');
    if (container) {
        container.addEventListener('wheel', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                chartZoomPercent = e.deltaY > 0
                    ? Math.max(40, chartZoomPercent - 10)
                    : Math.min(250, chartZoomPercent + 10);
                document.getElementById('sideToolZoomText').textContent = chartZoomPercent + '%';
                applyChartZoom();
            }
        }, { passive: false });
    }

    /* 圈选"全部"按钮 */
    var circleAll = document.getElementById('sideToolbarCircleAll');
    if (circleAll) circleAll.onclick = function() {
        filters.circleGroup = 'all';
        renderCircleGroupFilters();
        if (currentView === 'scatter') renderScatterView();
        if (currentView === 'table') renderTableView();
        if (currentView === 'grid') renderGridView();
        updateStats();
    };

    updateSideToolbarActiveState();
}
