/* === detail.js === 右侧详情面板渲染（使用 drawer 弹窗） */

/* ─── Drawer 事件绑定（IIFE，页面加载时执行） ─── */

(function() {
    /**
     * 绑定 drawer 基础事件：关闭按钮、遮罩点击、tab 切换、薪酬/备注输入同步
     */
    function bindDrawer() {
        var closeBtn = document.getElementById('drawerClose');
        var overlay = document.getElementById('drawerOverlay');
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);

        // Tab 切换
        var tabs = document.querySelectorAll('.drawer-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function() {
                var allTabs = document.querySelectorAll('.drawer-tab');
                var allPanels = document.querySelectorAll('.drawer-content .tab-panel');
                for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
                for (var j = 0; j < allPanels.length; j++) allPanels[j].classList.remove('active');
                this.classList.add('active');
                var tabId = this.getAttribute('data-tab');
                var panel = document.getElementById('tab-' + tabId);
                if (panel) panel.classList.add('active');
            });
        }

        // 备注输入：同步到 selectedEmployee.managerNote
        var basicRemarkText = document.getElementById('basicRemarkText');
        if (basicRemarkText) {
            basicRemarkText.addEventListener('input', function() {
                if (typeof selectedEmployee !== 'undefined' && selectedEmployee) {
                    selectedEmployee.managerNote = this.value.trim();
                    if (typeof renderScatterView === 'function') renderScatterView();
                }
            });
        }

        // 调薪原因输入：同步到 selectedEmployee.adjustmentReason
        var salReasonText = document.getElementById('salReasonText');
        if (salReasonText) {
            salReasonText.addEventListener('input', function() {
                if (typeof selectedEmployee !== 'undefined' && selectedEmployee) {
                    selectedEmployee.adjustmentReason = this.value.trim();
                    if (typeof renderScatterView === 'function') renderScatterView();
                }
            });
        }

        /**
         * 薪酬提报：调整额/涨幅变更时同步到 emp，更新画布横轴位置
         * 以涨幅为准（与画布横轴一致），调整额仅作展示同步
         */
        function syncSalaryFromInputs() {
            if (typeof selectedEmployee === 'undefined' || !selectedEmployee || !selectedEmployee.salary) return;
            var emp = selectedEmployee;
            var salRaisePercent = document.getElementById('salRaisePercent');
            var salAdjustAmount = document.getElementById('salAdjustAmount');
            var salAfterAmount = document.getElementById('salAfterAmount');
            if (!salRaisePercent || !salAdjustAmount) return;
            var pctVal = parseFloat(salRaisePercent.value);
            if (isNaN(pctVal)) pctVal = 0;
            var newAdj = Math.round(pctVal * 10) / 10;
            emp.adjustment = newAdj;
            salAdjustAmount.value = Math.round(emp.salary * (newAdj / 100));
            if (salAfterAmount) salAfterAmount.textContent = '¥' + (emp.salary * (1 + newAdj / 100)).toLocaleString('zh-CN');
            if (typeof renderScatterView === 'function') renderScatterView();
            if (typeof updateStats === 'function') updateStats();
        }
        var salRaisePercent = document.getElementById('salRaisePercent');
        var salAdjustAmount = document.getElementById('salAdjustAmount');
        if (salRaisePercent) salRaisePercent.addEventListener('input', syncSalaryFromInputs);
        if (salRaisePercent) salRaisePercent.addEventListener('change', syncSalaryFromInputs);
        if (salAdjustAmount) {
            salAdjustAmount.addEventListener('input', function() {
                if (typeof selectedEmployee === 'undefined' || !selectedEmployee || !selectedEmployee.salary) return;
                var emp = selectedEmployee;
                var amountVal = parseFloat(this.value) || 0;
                var newAdj = emp.salary ? Math.round((amountVal / emp.salary) * 1000) / 10 : 0;
                document.getElementById('salRaisePercent').value = newAdj;
                syncSalaryFromInputs();
            });
            salAdjustAmount.addEventListener('change', function() {
                if (typeof selectedEmployee === 'undefined' || !selectedEmployee) return;
                syncSalaryFromInputs();
            });
        }

        // 工作内容总结&评定：Leader 综合评价等级变更时，仅更新「待填报」标签（第二标签），不修改已有绩效标签
        var perfSummaryLeaderSelect = document.getElementById('perfSummaryLeaderSelect');
        if (perfSummaryLeaderSelect) {
            perfSummaryLeaderSelect.addEventListener('change', function() {
                if (typeof selectedEmployee === 'undefined' || !selectedEmployee) return;
                var val = this.value;
                selectedEmployee.leaderSummaryEval = val || undefined;
                if (typeof renderScatterView === 'function') renderScatterView();
                if (typeof renderTableView === 'function') renderTableView();
                if (typeof renderGridView === 'function') renderGridView();
                if (typeof renderDrawerPersonList === 'function') {
                    renderDrawerPersonList(selectedEmployee.id);
                }
            });
        }
    }

    /**
     * 绑定面谈子 tab、问题记录、To-Do、跟进事项交互
     */
    function bindInterviewForm() {
        var tabItems = document.querySelectorAll('.itv-tab-item');
        var panels = {
            perf: document.getElementById('itvPerf'),
            salary: document.getElementById('itvSalary')
        };
        for (var i = 0; i < tabItems.length; i++) {
            (function(tab) {
                tab.addEventListener('click', function() {
                    for (var j = 0; j < tabItems.length; j++) tabItems[j].className = 'itv-tab-item';
                    tab.className = 'itv-tab-item itv-tab-active';
                    var target = tab.getAttribute('data-itv');
                    if (panels.perf) panels.perf.style.display = target === 'perf' ? '' : 'none';
                    if (panels.perf) panels.perf.classList.toggle('itv-panel-active', target === 'perf');
                    if (panels.salary) panels.salary.style.display = target === 'salary' ? '' : 'none';
                    if (panels.salary) panels.salary.classList.toggle('itv-panel-active', target === 'salary');
                });
            })(tabItems[i]);
        }

        /**
         * 绑定单选按钮组：选中指定值时显示对应区域
         * @param {string} groupName - radio name 属性
         * @param {string} showValue - 触发显示的 value
         * @param {string} wrapId - 目标容器 ID
         */
        function bindRadioToggle(groupName, showValue, wrapId) {
            var radios = document.querySelectorAll('input[name="' + groupName + '"]');
            var wrap = document.getElementById(wrapId);
            if (!wrap || radios.length === 0) return;
            function update() {
                var checked = document.querySelector('input[name="' + groupName + '"]:checked');
                wrap.style.display = checked && checked.value === showValue ? '' : 'none';
            }
            for (var r = 0; r < radios.length; r++) {
                radios[r].addEventListener('change', update);
            }
        }
        bindRadioToggle('perfFollowUp', 'yes', 'perfFollowUpWrap');
        bindRadioToggle('salFollowUp', 'yes', 'salFollowUpWrap');

        // 问题记录：有问题(已解决)或(未解决)时显示记录区域
        (function() {
            function updatePerf() {
                var c = document.querySelector('input[name="perfItvStatus"]:checked');
                var w = document.getElementById('perfItvRecordWrap');
                if (w && c) w.style.display = (c.value === 'resolved' || c.value === 'unresolved') ? '' : 'none';
            }
            function updateSal() {
                var c = document.querySelector('input[name="salItvStatus"]:checked');
                var w = document.getElementById('salItvRecordWrap');
                if (w && c) w.style.display = (c.value === 'resolved' || c.value === 'unresolved') ? '' : 'none';
            }
            document.querySelectorAll('input[name="perfItvStatus"]').forEach(function(r) { r.addEventListener('change', updatePerf); });
            document.querySelectorAll('input[name="salItvStatus"]').forEach(function(r) { r.addEventListener('change', updateSal); });
        })();

        /**
         * 绑定 textarea 字数计数器
         * @param {string} taId - textarea 元素 ID
         * @param {string} ctId - 计数显示元素 ID
         */
        function bindCounter(taId, ctId) {
            var ta = document.getElementById(taId);
            var ct = document.getElementById(ctId);
            if (ta && ct) ta.addEventListener('input', function() { ct.textContent = ta.value.length; });
        }
        bindCounter('perfItvRecord', 'perfItvRecordCount');
        bindCounter('perfFollowText', 'perfFollowCount');
        bindCounter('salItvRecord', 'salItvRecordCount');
        bindCounter('salFollowText', 'salFollowCount');

        /**
         * 绑定 To-Do 表格的新增/删除行功能
         * @param {string} addId - 新增按钮 ID
         * @param {string} bodyId - tbody 元素 ID
         */
        function bindTodo(addId, bodyId) {
            var addBtn = document.getElementById(addId);
            var tbody = document.getElementById(bodyId);
            if (!addBtn || !tbody) return;
            addBtn.addEventListener('click', function() {
                var rows = tbody.querySelectorAll('tr');
                var idx = rows.length + 1;
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + idx + '</td>' +
                    '<td><input type="text" class="itv-table-input" placeholder="请输入"></td>' +
                    '<td><input type="text" class="itv-table-input" placeholder="请输入"></td>' +
                    '<td><input type="text" class="itv-table-input" placeholder="请输入"></td>' +
                    '<td><button class="itv-del-btn" data-action="delRow">删除</button></td>';
                tbody.appendChild(tr);
            });
            tbody.addEventListener('click', function(e) {
                if (e.target.getAttribute('data-action') !== 'delRow') return;
                var tr = e.target.closest ? e.target.closest('tr') : e.target.parentNode.parentNode;
                if (tr) tbody.removeChild(tr);
                var rows = tbody.querySelectorAll('tr');
                for (var k = 0; k < rows.length; k++) rows[k].querySelector('td').textContent = k + 1;
            });
        }
        bindTodo('perfTodoAdd', 'perfTodoBody');
        bindTodo('salTodoAdd', 'salTodoBody');
    }

    /**
     * 绑定职级上下调按钮 + 提报理由字数统计
     */
    function bindRankForm() {
        var RANK_LEVELS = ['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2','4-3','5-1','5-2','5-3'];
        var currentLevel = '3-1';
        var currentIdx = RANK_LEVELS.indexOf(currentLevel);
        var offset = 0;
        var upBtn = document.getElementById('rankUpBtn');
        var downBtn = document.getElementById('rankDownBtn');
        var targetEl = document.getElementById('rankTargetLevel');
        var targetStep = document.getElementById('rankTargetStep');
        if (!upBtn || !downBtn || !targetEl) return;

        /** 更新职级调整显示文案和样式 */
        function updateDisplay() {
            var targetIdx = currentIdx + offset;
            if (targetIdx < 0) targetIdx = 0;
            if (targetIdx >= RANK_LEVELS.length) targetIdx = RANK_LEVELS.length - 1;
            var targetLevel = RANK_LEVELS[targetIdx];
            if (offset === 0) {
                targetEl.textContent = targetLevel + ' (不调整)';
                if (targetStep) targetStep.className = 'rank-adjust-step rank-adjust-step-neutral';
            } else if (offset > 0) {
                targetEl.textContent = targetLevel + ' (上调' + offset + '级)';
                if (targetStep) targetStep.className = 'rank-adjust-step rank-adjust-step-active';
            } else {
                targetEl.textContent = targetLevel + ' (下调' + Math.abs(offset) + '级)';
                if (targetStep) targetStep.className = 'rank-adjust-step rank-adjust-step-down';
            }
        }

        upBtn.addEventListener('click', function() {
            var maxUp = RANK_LEVELS.length - 1 - currentIdx;
            if (offset < maxUp) { offset++; updateDisplay(); }
        });
        downBtn.addEventListener('click', function() {
            if (Math.abs(offset) < currentIdx) { offset--; updateDisplay(); }
        });
        updateDisplay();

        var rankText = document.getElementById('rankReasonText');
        var rankCount = document.getElementById('rankReasonCount');
        if (rankText && rankCount) rankText.addEventListener('input', function() { rankCount.textContent = rankText.value.length; });
    }

    /**
     * 绑定 drawer 左右切换人员按钮
     */
    function bindDrawerNav() {
        var prevBtn = document.getElementById('drawerNavPrev');
        var nextBtn = document.getElementById('drawerNavNext');
        if (prevBtn) prevBtn.addEventListener('click', function() { if (typeof navigateEmployee === 'function') navigateEmployee(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function() { if (typeof navigateEmployee === 'function') navigateEmployee(1); });
    }

    /**
     * 绑定绩效回顾保存按钮：标记已填报，移除卡片遮罩，重新渲染
     */
    function bindPerfSave() {
        var btn = document.getElementById('perfSave');
        if (!btn) return;
        btn.addEventListener('click', function() {
            if (!selectedEmployee) return;
            // 先把当前 select 的值同步回 selectedEmployee，防止未触发 change 事件时丢失
            var perfSummaryLeaderSelect = document.getElementById('perfSummaryLeaderSelect');
            if (perfSummaryLeaderSelect && perfSummaryLeaderSelect.value) {
                selectedEmployee.leaderSummaryEval = perfSummaryLeaderSelect.value;
            }
            // 标记为已填报
            if (typeof perfFilledIds !== 'undefined') {
                perfFilledIds.add(selectedEmployee.id);
            }
            if (typeof renderScatterView === 'function') renderScatterView();
            if (typeof renderTableView === 'function') renderTableView();
            if (typeof renderGridView === 'function') renderGridView();
            if (typeof updateTaskCtxBar === 'function') updateTaskCtxBar();
            // 刷新左侧人员列表卡片（使"待填报"标签更新为已填报状态）
            if (typeof renderDrawerPersonList === 'function') {
                renderDrawerPersonList(selectedEmployee.id);
            }
        });
    }

    /**
     * 绑定绩效回顾锚点导航（点击跳转到对应 section）
     */
    function bindPerfAnchor() {
        var nav = document.getElementById('perfAnchorNav');
        if (!nav) return;
        var items = nav.querySelectorAll('.perf-anchor-item');
        var panel = document.getElementById('tab-performance');
        for (var i = 0; i < items.length; i++) {
            (function(item) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = item.getAttribute('data-target');
                    var sec = document.getElementById(targetId);
                    if (!sec || !panel) return;
                    for (var m = 0; m < items.length; m++) items[m].className = 'perf-anchor-item';
                    item.className = 'perf-anchor-item active';
                    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            })(items[i]);
        }
    }

    /** 初始化所有 drawer 内部交互绑定 */
    function init() {
        bindDrawer();
        bindDrawerNav();
        bindPerfSave();
        bindInterviewForm();
        bindRankForm();
        bindPerfAnchor();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* ─── 数据转换 ─── */

/**
 * 将 V10 员工对象映射为 drawer 所需格式
 * @param {Object} emp - 员工对象（来自 employees 数组）
 * @returns {Object} drawer 人员对象
 */
function empToPerson(emp) {
    var perfMap = { '达到': 'meet', '略超': 'above', '超出': 'exceed', '略低': 'below', '低于': 'low' };
    var tierMap = { '明星员工': 'T0', '核心骨干': 'T1', '稳定发展': 'T2', '潜力新人': 'T3', '待提升': 'T3', '激活': 'T2' };
    var perfTags = emp.performanceTags || [{ text: '达到' }, { text: '达到' }];
    return {
        id: emp.id,
        name: emp.name,
        dept: emp.dept,
        rank: emp.level,
        salary: emp.salary,
        tier: tierMap[emp.tier] || 'T2',
        status: 'pending',
        deadline: '2026-04-15',
        orgPath: emp.dept,
        careerPath: '技术序列',
        recruitType: '社会招聘',
        joinDate: emp.joinDate || '2023-03-01',
        confirmDate: emp.confirmDate || '--',
        workAge: '--',
        manager: '--',
        workCity: '--',
        perf: [
            perfMap[(perfTags[0] && perfTags[0].text)] || 'meet',
            perfMap[(perfTags[1] && perfTags[1].text)] || 'meet'
        ]
    };
}

/**
 * 计算员工在职时长（年+月）
 * @param {string} joinDate - 入职日期字符串（如 '2023-03-01'）
 * @returns {string} 在职时长描述，如 '2年3个月'
 */
function calcTenure(joinDate) {
    if (!joinDate || joinDate === '--') return '--';
    var join = new Date(joinDate);
    var now = new Date();
    var diff = now - join;
    var years = Math.floor(diff / (365.25 * 86400000));
    var months = Math.floor((diff % (365.25 * 86400000)) / (30.44 * 86400000));
    return years + '年' + months + '个月';
}

/* ─── 抽屉人员列表 ─── */

/**
 * 渲染抽屉左侧人员列表（仅待填报任务时显示）
 * @param {number} selectedEmpId - 当前选中的员工 ID（高亮显示）
 */
function renderDrawerPersonList(selectedEmpId) {
    var listEl = document.getElementById('drawerPersonListBody');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (typeof activeTask === 'undefined' || !activeTask || activeTask.role !== 'fill'
        || !activeTask.peopleIds || activeTask.peopleIds.length === 0) return;
    var allEmps = typeof employees !== 'undefined' ? employees : [];
    var filtered = allEmps.filter(function(e) {
        return activeTask.peopleIds.indexOf(e.id) >= 0;
    });

    filtered.forEach(function(e) {
        var card = document.createElement('div');
        card.className = 'drawer-person-card' + (e.id === selectedEmpId ? ' selected' : '');
        card.dataset.empId = e.id;
        var cardContent = typeof buildPersonCardContent === 'function'
            ? buildPersonCardContent(e, { compact: true, showDelta: true, showOriginalLine: false })
            : '';
        card.innerHTML = cardContent || '';
        card.addEventListener('click', function() {
            if (typeof showDetail === 'function') showDetail(e);
        });
        listEl.appendChild(card);
    });
    var selectedCard = listEl.querySelector('.drawer-person-card.selected');
    if (selectedCard) selectedCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // 渲染标题区
    var titleEl = document.getElementById('drawerPersonListTitle');
    if (titleEl) {
        titleEl.innerHTML = '<span class="drawer-person-list-title-text">人员列表</span>';
    }
}

/* ─── 抽屉打开/关闭 ─── */

/**
 * 打开员工详情抽屉并填充所有字段
 * @param {Object} emp - 员工对象（原始格式或 drawer 格式均可）
 * @param {string} [initialTab='basic'] - 初始激活的 tab（'basic'/'salary'/'performance' 等）
 * @param {Object} [opts] - 附加选项
 * @param {boolean} [opts.scrollToReason] - 是否滚动到调薪原因区域
 * @param {boolean} [opts.scrollToRemark] - 是否滚动到备注区域
 */
function openDrawer(emp, initialTab, opts) {
    var person = typeof emp.rank !== 'undefined' ? emp : empToPerson(emp);

    document.getElementById('drawerName').textContent = person.name;
    document.getElementById('drawerDept').textContent = (person.dept || '') + ' · ' + person.rank;

    // 状态标签 + 截止日期
    var statusTag = document.getElementById('drawerStatusTag');
    var deadlineEl = document.getElementById('drawerDeadline');
    if (statusTag && deadlineEl) {
        var st = person.status || 'pending';
        statusTag.textContent = st === 'pending' ? '待处理' : st === 'done' ? '已完成' : '未到达';
        statusTag.className = 'drawer-status-tag drawer-status-' + (st === 'done' ? 'done' : st === 'not-reached' ? 'not-reached' : 'pending');
        if (st === 'pending') {
            deadlineEl.style.display = '';
            deadlineEl.textContent = '截止：' + (person.deadline || '2026-04-15');
        } else {
            deadlineEl.style.display = 'none';
        }
    }

    // 梯队标签
    var tierTag = document.getElementById('drawerTierTag');
    if (tierTag) {
        var tierLabels = { 'T0': 'T0骨干', 'T1': 'T1资深', 'T2': 'T2产能', 'T3': 'T3基础' };
        var tierClasses = { 'T0': 'tier-t0', 'T1': 'tier-t1', 'T2': 'tier-t2', 'T3': 'tier-t3' };
        var t = person.tier || 'T2';
        tierTag.textContent = tierLabels[t] || t;
        tierTag.className = 'drawer-tier-tag ' + (tierClasses[t] || 'tier-t2');
    }

    // 基本信息字段
    var elOrgPath = document.getElementById('info-orgPath');
    if (elOrgPath) elOrgPath.textContent = person.orgPath || person.dept || '--';
    var elCareerPath = document.getElementById('info-careerPath');
    if (elCareerPath) elCareerPath.textContent = person.careerPath || '--';
    var elRecruitType = document.getElementById('info-recruitType');
    if (elRecruitType) elRecruitType.textContent = person.recruitType || '--';
    var elJoinDate = document.getElementById('info-joinDate');
    if (elJoinDate) elJoinDate.textContent = person.joinDate || '--';
    var elConfirmDate = document.getElementById('info-confirmDate');
    if (elConfirmDate) elConfirmDate.textContent = person.confirmDate || '--';
    var elTenure = document.getElementById('info-tenure');
    if (elTenure) elTenure.textContent = calcTenure(person.joinDate);
    var elWorkAge = document.getElementById('info-workAge');
    if (elWorkAge) elWorkAge.textContent = person.workAge || '--';
    var elManager = document.getElementById('info-manager');
    if (elManager) elManager.textContent = person.manager || '--';
    var elWorkCity = document.getElementById('info-workCity');
    if (elWorkCity) elWorkCity.textContent = person.workCity || '--';

    // 绩效信息
    var perfLevelMap = {
        'exceed': { label: '超出预期', cls: 'perf-level-exceed' },
        'above':  { label: '略超预期', cls: 'perf-level-above' },
        'meet':   { label: '符合预期', cls: 'perf-level-meet' },
        'below':  { label: '略低预期', cls: 'perf-level-below' },
        'low':    { label: '低于预期', cls: 'perf-level-low' }
    };
    var perfPeriods = ['2025年上半年', '2024年下半年'];
    var perfContents = ['工作态度积极，项目交付质量高', '按时完成既定目标'];
    var isFillPerfMode = typeof activeTask !== 'undefined' && activeTask && activeTask.type === 'perf';
    var personId = person.id != null ? person.id : (emp && emp.id);
    for (var pi = 0; pi < 2; pi++) {
        var periodEl = document.getElementById('perfPeriod' + (pi + 1));
        var levelEl = document.getElementById('perfLevel' + (pi + 1));
        var contentEl = document.getElementById('perfContent' + (pi + 1));
        var cardEl = levelEl ? levelEl.closest('.perf-info-card') : null;
        var isPending = isFillPerfMode && pi === 1 && typeof perfFilledIds !== 'undefined' && !perfFilledIds.has(personId);
        if (cardEl) cardEl.classList.toggle('perf-info-card-pending', isPending);
        if (periodEl) periodEl.textContent = perfPeriods[pi];
        if (levelEl) {
            if (isPending) {
                levelEl.textContent = '待填报';
                levelEl.className = 'perf-info-level perf-level-pending';
            } else {
                var perfKey = person.perf && person.perf[pi] ? person.perf[pi] : '';
                var perfCfg = perfLevelMap[perfKey];
                levelEl.textContent = perfCfg ? perfCfg.label : '--';
                levelEl.className = 'perf-info-level ' + (perfCfg ? perfCfg.cls : '');
            }
        }
        if (contentEl) contentEl.textContent = isPending ? '' : (perfContents[pi] || '--');
    }

    // 薪酬字段
    var salCurrent = document.getElementById('salCurrent');
    if (salCurrent && person.salary) salCurrent.textContent = '¥' + person.salary.toLocaleString('zh-CN');

    var salAfterAmount = document.getElementById('salAfterAmount');
    var salRaisePercent = document.getElementById('salRaisePercent');
    var salAdjustAmount = document.getElementById('salAdjustAmount');
    var adj = (emp && emp.adjustment != null) ? emp.adjustment : 0;
    if (salAfterAmount && person.salary) salAfterAmount.textContent = '¥' + (person.salary * (1 + adj / 100)).toLocaleString('zh-CN');
    if (salRaisePercent && emp) salRaisePercent.value = adj;
    if (salAdjustAmount && emp && emp.salary) salAdjustAmount.value = Math.round(emp.salary * (adj / 100));
    var salReasonText = document.getElementById('salReasonText');
    if (salReasonText && emp) salReasonText.value = (emp.adjustmentReason || '').trim();

    // 绩效评价 select
    var perfSummaryLeaderSelect = document.getElementById('perfSummaryLeaderSelect');
    if (perfSummaryLeaderSelect && emp) perfSummaryLeaderSelect.value = emp.leaderSummaryEval || '';

    // 激活指定 tab
    var allTabs = document.querySelectorAll('.drawer-tab');
    var allPanels = document.querySelectorAll('.drawer-content .tab-panel');
    for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
    for (var j = 0; j < allPanels.length; j++) allPanels[j].classList.remove('active');
    var targetTab = initialTab || 'basic';
    var tabBtn = document.querySelector('.drawer-tab[data-tab="' + targetTab + '"]');
    var tabPanel = document.getElementById('tab-' + targetTab);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPanel) tabPanel.classList.add('active');

    // 打开抽屉
    var drawer = document.getElementById('drawer');
    drawer.classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');

    // 填报模式：显示左侧人员列表
    var isFillMode = typeof activeTask !== 'undefined' && activeTask && activeTask.role === 'fill';
    if (isFillMode) {
        drawer.classList.add('drawer-with-list');
        var empId = (emp && emp.id != null) ? emp.id : (person.id != null ? person.id : null);
        renderDrawerPersonList(empId);
    } else {
        drawer.classList.remove('drawer-with-list');
        var listBody = document.getElementById('drawerPersonListBody');
        if (listBody) listBody.innerHTML = '';
    }

    // 滚动定位
    if (opts && opts.scrollToReason) {
        var reasonEl = document.getElementById('salReasonArea');
        if (reasonEl) {
            setTimeout(function() { reasonEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }
    }
    if (opts && opts.scrollToRemark) {
        var remarkEl = document.getElementById('basicRemarkArea');
        if (remarkEl) {
            setTimeout(function() { remarkEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }
    }
    var basicRemarkText = document.getElementById('basicRemarkText');
    if (basicRemarkText && emp) basicRemarkText.value = (emp.managerNote || '').trim();
}

/**
 * 关闭员工详情抽屉
 */
function closeDrawer() {
    var drawer = document.getElementById('drawer');
    var overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

/**
 * 判断抽屉当前是否处于打开状态
 * @returns {boolean}
 */
function isDrawerOpen() {
    var drawer = document.getElementById('drawer');
    return drawer && drawer.classList.contains('open');
}

/* ─── 详情入口 ─── */

/**
 * 打开员工详情（设置 selectedEmployee，高亮卡片，打开抽屉）
 * @param {Object} emp - 员工对象
 * @param {boolean} [scrollToReason] - 是否滚动到调薪原因区域
 * @param {boolean} [scrollToNote] - 是否滚动到备注区域
 * @param {string} [initialTabOverride] - 强制指定初始 tab
 */
function showDetail(emp, scrollToReason, scrollToNote, initialTabOverride) {
    selectedEmployee = emp;

    document.querySelectorAll('.scatter-card, tr').forEach(function(el) { el.classList.remove('selected'); });
    var card = document.querySelector('[data-emp-id="' + emp.id + '"]');
    if (card) card.classList.add('selected');

    var initialTab = initialTabOverride || 'basic';
    var opts;
    if (!initialTabOverride && scrollToReason) { initialTab = 'salary'; opts = { scrollToReason: true }; }
    else if (!initialTabOverride && scrollToNote) { initialTab = 'basic'; opts = { scrollToRemark: true }; }

    openDrawer(emp, initialTab, opts);
}

/**
 * 切换右侧面板展开/收起状态（审批模式下收起时清除高亮）
 */
function togglePanel() {
    var panel = document.getElementById('rightPanel');
    if (!panel) return;
    var wasOpen = !panel.classList.contains('collapsed');
    panel.classList.toggle('collapsed');
    if (wasOpen && typeof activeTask !== 'undefined' && activeTask && activeTask.role === 'approve'
        && typeof activePersonId !== 'undefined' && activePersonId != null) {
        activePersonId = null;
        document.querySelectorAll('.scatter-card').forEach(function(c) { c.classList.remove('approval-highlight'); });
        var tbody = document.getElementById('approvalListBody');
        if (tbody) tbody.querySelectorAll('tr').forEach(function(tr) { tr.classList.remove('approval-row-active'); });
    }
}

/**
 * 在当前筛选/任务人员列表中切换到上一个或下一个员工
 * @param {number} direction - 方向：-1 上一个，1 下一个
 */
function navigateEmployee(direction) {
    if (!selectedEmployee) return;
    var filtered;
    if (typeof activeTask !== 'undefined' && activeTask && activeTask.peopleIds && activeTask.peopleIds.length > 0) {
        var taskIdSet = {};
        activeTask.peopleIds.forEach(function(id) { taskIdSet[id] = true; });
        filtered = (typeof getFilteredEmployees === 'function' ? getFilteredEmployees() : employees || [])
            .filter(function(e) { return taskIdSet[e.id]; });
    } else {
        filtered = typeof getFilteredEmployees === 'function' ? getFilteredEmployees() : employees;
    }
    if (!filtered || filtered.length === 0) return;
    var currentIndex = filtered.findIndex(function(e) { return e.id === selectedEmployee.id; });
    var nextIndex;
    if (currentIndex === -1) {
        nextIndex = 0;
    } else {
        nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = filtered.length - 1;
        if (nextIndex >= filtered.length) nextIndex = 0;
    }
    var nextEmp = filtered[nextIndex];
    if (nextEmp) {
        var initialTab = null;
        if (typeof activeTask !== 'undefined' && activeTask && activeTask.type === 'perf') initialTab = 'performance';
        showDetail(nextEmp, false, false, initialTab);
    }
}
