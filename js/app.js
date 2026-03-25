/* === app.js === 初始化入口（window.onload + 全局事件绑定） */

window.onload = function() {
    renderPersonPerspective();
    updateTodoBadge();
    updateTodoContextCapsule();
    /* 有任务时默认进入任务态（画布显示任务人员，填报/审批状态随选择切换） */
    var firstTask = typeof getFirstDisplayTask === 'function' ? getFirstDisplayTask() : null;
    if (firstTask) {
        enterActiveTask(firstTask.id);
        if (firstTask.role === 'approve') {
            approvalPanelOpen = true;
            setTimeout(function() {
                var panel = document.getElementById('approvalListPanel');
                if (panel && typeof renderApprovalList === 'function') {
                    panel.classList.add('open');
                    renderApprovalList();
                }
            }, 150);
        }
    }
    renderCircleGroupFilters();
    renderSideToolbarCircleList();
    renderScatterView();
    renderTableView();
    renderGridView();
    updateStats();
    // 默认显示宽表视图
    switchToTableView();
    updateAxisFilterCancelVisibility();
    initChartPan();
    initAnomalyTooltipHide();
    initSideToolbar();
    initAIAssistant();
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && activeTask) {
            exitActiveTask();
            return;
        }
        if (e.key === 'Escape' && document.getElementById('drawer') && document.getElementById('drawer').classList.contains('open')) {
            closeDrawer();
            return;
        }
        if (e.key === 'Tab' && circleSelectMode && selectedForCompare.size > 0) {
            e.preventDefault();
            finishCircleSelect();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undoStack.length > 0 && !e.target.matches('input, textarea')) {
            e.preventDefault();
            undoLastDrag();
        }
        // 左右方向键切换人员详情（使用 drawer 时）
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.matches('input, textarea, select, [contenteditable]')) {
            const drawer = document.getElementById('drawer');
            if (drawer && drawer.classList.contains('open') && selectedEmployee) {
                e.preventDefault();
                navigateEmployee(e.key === 'ArrowLeft' ? -1 : 1);
            }
        }
    });
};

// 异常提示：鼠标移出卡片或移到非滑出框卡片上时隐藏（避免 tooltip / 滑出框残留）
