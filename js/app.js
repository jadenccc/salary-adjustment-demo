/* === app.js === 初始化入口（window.onload + 全局事件绑定） */

/**
 * 页面加载完成后执行：初始化所有视图、任务状态、工具栏、AI 助手，并绑定全局键盘事件
 */
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

    // 全局键盘事件
    document.addEventListener('keydown', function(e) {
        // Escape：退出任务态 / 关闭抽屉
        if (e.key === 'Escape' && activeTask) {
            exitActiveTask();
            return;
        }
        if (e.key === 'Escape' && document.getElementById('drawer') && document.getElementById('drawer').classList.contains('open')) {
            closeDrawer();
            return;
        }
        // Tab：完成圈选
        if (e.key === 'Tab' && circleSelectMode && selectedForCompare.size > 0) {
            e.preventDefault();
            finishCircleSelect();
        }
        // Ctrl/Cmd + Z：撤销最近一次拖拽调薪
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undoStack.length > 0 && !e.target.matches('input, textarea')) {
            e.preventDefault();
            undoLastDrag();
        }
        // 左右方向键：在抽屉中切换人员
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.matches('input, textarea, select, [contenteditable]')) {
            const drawer = document.getElementById('drawer');
            if (drawer && drawer.classList.contains('open') && selectedEmployee) {
                e.preventDefault();
                navigateEmployee(e.key === 'ArrowLeft' ? -1 : 1);
            }
        }
    });
};
