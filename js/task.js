/* === task.js === 任务/待办系统 */

function getApproveDeptList() {
    return MY_TASKS.approve.map(function(t) {
        var first = t.steps && t.steps[0];
        var combo = (t.steps || []).map(function(s) { return STEP_LABELS[s.type] || s.type; }).join(' + ') || '审批';
        return {
            deptName: t.dept || t.id,
            taskCombo: combo,
            currentNode: t.currentNodeLabel != null ? t.currentNodeLabel : (first ? '待我审批' : '流转中'),
            isMyNode: !!t.isMyNode
        };
    });
}
/** 审批模式下：只显示「到此节点」的部门任务，合并为一份人员列表（不区分部门/任务） */
function getApprovalModePeopleIds() {
    var ids = [];
    var seen = {};
    MY_TASKS.approve.forEach(function(t) {
        if (!t.isMyNode) return;
        (getTaskPeopleIds(t) || []).forEach(function(id) {
            if (!seen[id]) { seen[id] = true; ids.push(id); }
        });
    });
    return ids;
}
function getTaskPeopleIds(task) {
    if (!task) return [];
    if (task.steps && task.steps.length) return [].concat.apply([], task.steps.map(function(s) { return s.peopleIds || []; }));
    return task.peopleIds || [];
}
function getTaskAggregate(task) {
    if (!task) return { type: null, total: 0, filled: 0, rejected: false, rejectedIds: [] };
    if (task.steps && task.steps.length) {
        var type = task.steps[0].type;
        var total = 0, filled = 0, rejected = false, rejectedIds = [];
        task.steps.forEach(function(s) {
            total += s.total || 0; filled += s.filled || 0;
            if (s.rejected) { rejected = true; rejectedIds = (rejectedIds || []).concat(s.rejectedIds || []); }
        });
        return { type: type, total: total, filled: filled, rejected: rejected, rejectedIds: rejectedIds };
    }
    return { type: task.type, total: task.total || 0, filled: task.filled || 0, rejected: !!task.rejected, rejectedIds: task.rejectedIds || [] };
}
/** 当前任务是否包含绩效回顾步骤 */
function activeTaskHasPerfStep() {
    if (!activeTask || activeTask.role !== 'fill') return false;
    var all = MY_TASKS.fill.concat(MY_TASKS.approve);
    var task = all.find(function(t) { return t.id === activeTask.id; });
    if (!task || !task.steps) return activeTask.type === 'perf';
    return task.steps.some(function(s) { return s.type === 'perf'; });
}

function getTaskDdl(task) {
    if (!task || !task.steps || !task.steps.length) return null;
    var first = STEP_ORDER.map(function(t) { return task.steps.find(function(s) { return s.type === t; }); }).filter(Boolean)[0];
    return first ? first.ddl : (task.steps[0] && task.steps[0].ddl);
}
function getTaskDaysLeft(task) {
    if (!task || !task.steps || !task.steps.length) return null;
    var first = STEP_ORDER.map(function(t) { return task.steps.find(function(s) { return s.type === t; }); }).filter(Boolean)[0];
    return first ? (first.daysLeft != null ? first.daysLeft : null) : (task.steps[0] && task.steps[0].daysLeft);
}

let activeTask = null;   // 当前进入的任务（进入任务后画布聚焦该任务涉及人员）
let approvalPanelOpen = false;
let activePersonId = null;   // 审批模式下当前选中人员，表格行↔画布卡片↔抽屉联动
let approvalPersonStatus = {};  // empId -> 'pending' | 'passed' | 'marked'
let todoActiveTab = 'fill';
let selectedTodo = null;  // 保留用于兼容：无任务时可为 null

function renderPersonPerspective() {
    const sel = document.getElementById('personPerspectiveSelect');
    if (!sel) return;
    const prevVal = sel.value || currentPerspectiveLeaderId || '';
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = '全部 / 默认视角';
    sel.appendChild(optAll);
    ENTITY_ORG_LEAFS.forEach(leaf => {
        const group = document.createElement('optgroup');
        group.label = leaf.name;
        (leaf.leaders || []).forEach((name, i) => {
            const opt = document.createElement('option');
            opt.value = leaf.id + '_' + i;
            opt.textContent = name;
            group.appendChild(opt);
        });
        sel.appendChild(group);
    });
    sel.value = prevVal || '';
    currentPerspectiveLeaderId = sel.value || null;
    sel.onchange = function() {
        currentPerspectiveLeaderId = sel.value || null;
    };
}


function clearSelectedTodo() {
    selectedTodo = null;
    updateTodoContextCapsule();
    if (currentView === 'scatter') renderScatterView();
    if (currentView === 'table') renderTableView();
    if (currentView === 'grid') renderGridView();
}

function updateTodoContextCapsule() {
    var cap = document.getElementById('todoContextCapsule');
    var txt = document.getElementById('todoContextText');
    if (!cap || !txt) return;
    if (activeTask) { cap.style.display = 'none'; return; }
    if (selectedTodo) {
        cap.style.display = 'inline-flex';
        txt.textContent = selectedTodo.nodeLabel + ' · ' + selectedTodo.todoLabel;
    } else {
        cap.style.display = 'none';
    }
}
// ═══ 待办：内容铺在按钮后，点击按钮切换任务步骤，每任务一个截止时间 ═══

function updateOuterTodoTabActive() {
    var fillBtn = document.getElementById('todoTabFill');
    var approveBtn = document.getElementById('todoTabApprove');
    if (fillBtn) fillBtn.classList.toggle('active', todoActiveTab === 'fill');
    if (approveBtn) approveBtn.classList.toggle('active', todoActiveTab === 'approve');
}

function getTodoTotalCount() {
    var fillCount = MY_TASKS.fill.length;
    var approveCount = MY_TASKS.approve.filter(function(t) { return t.isMyNode; }).length;
    return fillCount + approveCount;
}
var hasFillTask = function() { return MY_TASKS.fill.length > 0; };
var hasApprTask = function() { return MY_TASKS.approve.length > 0; };
var hasMyApprNow = function() { return getApproveDeptList().some(function(d) { return d.isMyNode; }); };

/** 获取任务列表（用于任务标题下拉）：多任务时待填报优先 */
function getTaskListForDisplay() {
    var list = [];
    MY_TASKS.fill.forEach(function(t) {
        list.push({ task: t, tagLabel: t.tagLabel || '待填报' });
    });
    MY_TASKS.approve.forEach(function(t) {
        if (t.isMyNode) list.push({ task: t, tagLabel: t.tagLabel || '待审批' });
    });
    return list;
}

/** 获取默认显示的第一条任务：待填报优先 */
function getFirstDisplayTask() {
    var list = getTaskListForDisplay();
    return list.length > 0 ? list[0].task : null;
}

function updateTodoBadge() {
    renderTaskTitleWidget();
}

/* ═══ 任务标题组件（画布标题） ═══ */
function renderTaskTitleWidget() {
    var widget = document.getElementById('taskTitleWidget');
    var main = document.getElementById('taskTitleMain');
    var textEl = document.getElementById('taskTitleText');
    var tagEl = document.getElementById('taskTitleTag');
    var badgeEl = document.getElementById('taskTitleBadge');
    var arrowEl = document.getElementById('taskTitleArrow');
    var dropdown = document.getElementById('taskTitleDropdown');
    if (!widget || !main || !textEl || !tagEl || !dropdown) return;

    var taskList = getTaskListForDisplay();
    var firstTask = getFirstDisplayTask();

    if (taskList.length === 0) {
        /* 无任务：默认视图，不可下拉 */
        textEl.textContent = '默认视图';
        tagEl.style.display = 'none';
        tagEl.className = 'task-title-tag';
        if (badgeEl) badgeEl.style.display = 'none';
        if (arrowEl) arrowEl.style.display = 'none';
        widget.classList.add('no-dropdown');
        main.style.cursor = 'default';
        main.onclick = null;
    } else {
        /* 有任务：任务态显示当前任务，默认视图显示「默认视图」（待办小圆点始终显示） */
        if (activeTask) {
            var displayTask = taskList.find(function(x) { return x.task.id === activeTask.id; }) || { task: firstTask, tagLabel: firstTask.tagLabel || (firstTask.role === 'fill' ? '待填报' : '待审批') };
            var t = displayTask.task;
            var tagLabel = displayTask.tagLabel;
            textEl.textContent = t.title || ('任务 ' + t.id);
            tagEl.textContent = tagLabel;
            tagEl.style.display = 'inline';
            tagEl.className = 'task-title-tag ' + (tagLabel === '待填报' ? 'task-title-tag-fill' : 'task-title-tag-approve');
        } else {
            textEl.textContent = '默认视图';
            tagEl.style.display = 'none';
            tagEl.className = 'task-title-tag';
        }
        if (badgeEl) {
            badgeEl.style.display = 'inline-flex';
            badgeEl.textContent = String(typeof getTodoTotalCount === 'function' ? getTodoTotalCount() : 3);
        }
        if (arrowEl) arrowEl.style.display = 'inline';
        widget.classList.remove('no-dropdown');
        main.style.cursor = 'pointer';

        dropdown.innerHTML = '';
        var addItem = function(label, isDefault, taskId) {
            var item = document.createElement('div');
            item.className = 'task-title-dropdown-item' + (isDefault ? ' default' : '');
            item.textContent = label;
            item.onclick = function(e) {
                e.stopPropagation();
                closeTaskTitleDropdown();
                if (isDefault) {
                    exitActiveTask();
                } else if (taskId) {
                    var t = taskList.find(function(x) { return x.task.id === taskId; });
                    enterActiveTask(taskId);
                    if (t && t.task.role === 'approve') {
                        approvalPanelOpen = true;
                        setTimeout(function() {
                            var panel = document.getElementById('approvalListPanel');
                            if (panel) { panel.classList.add('open'); renderApprovalList(); }
                        }, 150);
                    }
                }
                renderTaskTitleWidget();
            };
            dropdown.appendChild(item);
        };
        addItem('默认视图', true, null);
        taskList.forEach(function(x) {
            addItem((x.task.title || x.task.id) + ' · ' + x.tagLabel, false, x.task.id);
        });

        main.onclick = function(e) {
            e.stopPropagation();
            var isOpen = !widget.classList.contains('open');
            widget.classList.toggle('open', isOpen);
            dropdown.classList.toggle('open', isOpen);
            if (isOpen) {
                document.body.appendChild(dropdown);
                var rect = main.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.left = rect.left + (rect.width / 2) + 'px';
                dropdown.style.top = (rect.bottom + 8) + 'px';
                dropdown.style.transform = 'translateX(-50%)';
                dropdown.style.minWidth = '240px';
                setTimeout(function() {
                    document.addEventListener('click', closeTaskTitleOnOutsideClick);
                }, 0);
            } else {
                widget.appendChild(dropdown);
                dropdown.style.position = '';
                dropdown.style.left = '';
                dropdown.style.top = '';
                dropdown.style.transform = '';
                dropdown.style.minWidth = '';
                document.removeEventListener('click', closeTaskTitleOnOutsideClick);
            }
        };
    }
}

function closeTaskTitleDropdown() {
    var widget = document.getElementById('taskTitleWidget');
    var dropdown = document.getElementById('taskTitleDropdown');
    if (widget) widget.classList.remove('open');
    if (dropdown) {
        dropdown.classList.remove('open');
        if (dropdown.parentNode === document.body) {
            widget.appendChild(dropdown);
            dropdown.style.position = '';
            dropdown.style.left = '';
            dropdown.style.top = '';
            dropdown.style.transform = '';
            dropdown.style.minWidth = '';
        }
    }
    document.removeEventListener('click', closeTaskTitleOnOutsideClick);
}

function closeTaskTitleOnOutsideClick(ev) {
    var widget = document.getElementById('taskTitleWidget');
    var dropdown = document.getElementById('taskTitleDropdown');
    if (!widget || !dropdown) return;
    if (widget.contains(ev.target) || dropdown.contains(ev.target)) return;
    closeTaskTitleDropdown();
}

function switchTodoTab(tab) {
    todoActiveTab = tab || 'fill';
    updateOuterTodoTabActive();
}

function renderPillGroup() {
    var container = document.getElementById('pillGroup');
    if (!container) return;
    var hasFill = hasFillTask();
    var hasAppr = hasApprTask();
    var hasMine = hasMyApprNow();
    container.innerHTML = '';
    // 无任何任务时不渲染待办
    if (!hasFill && !hasAppr) return;
    var totalCount = getTodoTotalCount();

    // 创建"待办任务"主按钮
    var wrapper = document.createElement('div');
    wrapper.className = 'pill-todo-wrapper';
    wrapper.setAttribute('id', 'pillTodoWrapper');

    var mainBtn = document.createElement('div');
    mainBtn.className = 'pill-todo-main';
    mainBtn.innerHTML = '<span class="pill-todo-icon"></span><span class="pill-todo-text">待办任务</span><span class="pill-todo-badge">' + totalCount + '</span><span class="pill-todo-arrow">▾</span>';

    // 创建下拉面板
    var dropdown = document.createElement('div');
    dropdown.className = 'pill-todo-dropdown';
    dropdown.setAttribute('id', 'pillTodoDropdown');

    // ── 待我填报选项 ──
    if (hasFill) {
        var task = MY_TASKS.fill[0];
        var agg = getTaskAggregate(task);
        var combo = (task.steps || []).map(function(s) { return (TYPE_CFG[s.type] && TYPE_CFG[s.type].label) || STEP_LABELS[s.type] || s.type; }).join(' + ') || '填报';
        var total = agg.total || getTaskPeopleIds(task).length || 0;
        var fillRow = document.createElement('div');
        fillRow.className = 'pill-todo-item pill-todo-item-fill';
        fillRow.innerHTML = '<div class="pill-todo-item-left"><span class="pill-todo-item-dot fill"></span><span class="pill-todo-item-label">待我填报</span></div><div class="pill-todo-item-right"><span class="pill-todo-item-meta">' + combo + ' · ' + total + '人</span><span class="pill-todo-item-badge fill">填报</span></div>';
        fillRow.onclick = function(e) {
            e.stopPropagation();
            closePillTodoDropdown();
            enterActiveTask(task.id);
        };
        dropdown.appendChild(fillRow);
    }

    // ── 待我审批选项（含子级展开） ──
    if (hasAppr) {
        var deptList = getApproveDeptList();
        var labelText = hasMine ? '待我审批' : '流转中';
        var apprRow = document.createElement('div');
        apprRow.className = 'pill-todo-item pill-todo-item-approve' + (hasMine ? ' has-mine' : '');
        apprRow.innerHTML = '<div class="pill-todo-item-left"><span class="pill-todo-item-dot approve' + (hasMine ? ' mine' : '') + '"></span><span class="pill-todo-item-label">' + labelText + '</span></div><div class="pill-todo-item-right"><span class="pill-todo-item-meta">' + deptList.length + '个部门</span><span class="pill-todo-item-expand">▾</span><span class="pill-todo-item-badge approve">' + (hasMine ? '审批' : '观察') + '</span></div>';

        // 子级：各部门状态列表
        var subList = document.createElement('div');
        subList.className = 'pill-todo-sublist';
        subList.setAttribute('id', 'pillTodoApproveSublist');
        subList.innerHTML = '<div class="pill-todo-sublist-title">各部门状态</div>' + deptList.map(function(d) {
            var nodeClass = d.isMyNode ? 'mine' : 'other';
            return '<div class="pill-todo-sublist-row" data-dept="' + (d.deptName || '').replace(/"/g, '&quot;') + '"><div class="pill-todo-sublist-row-left"><span class="pill-todo-sublist-dot ' + nodeClass + '"></span><div class="pill-todo-sublist-name-wrap"><div class="pill-todo-sublist-name">' + (d.deptName || '').replace(/</g, '&lt;') + '</div><div class="pill-todo-sublist-combo">' + (d.taskCombo || '').replace(/</g, '&lt;') + '</div></div></div><span class="pill-todo-sublist-node ' + nodeClass + '">' + (d.currentNode || '').replace(/</g, '&lt;') + '</span></div>';
        }).join('');

        // 点击 ▾ 箭头：展开/收起子级
        var expandBtn = apprRow.querySelector('.pill-todo-item-expand');
        if (expandBtn) {
            expandBtn.onclick = function(e) {
                e.stopPropagation();
                var isOpen = apprRow.classList.toggle('expanded');
                subList.classList.toggle('open', isOpen);
                expandBtn.classList.toggle('rotated', isOpen);
            };
        }

        // 点击"审批" badge：进入审批模式
        var badgeBtn = apprRow.querySelector('.pill-todo-item-badge');
        if (badgeBtn) {
            badgeBtn.onclick = function(e) {
                e.stopPropagation();
                closePillTodoDropdown();
                var firstApprove = MY_TASKS.approve.find(function(t) { return t.isMyNode; }) || MY_TASKS.approve[0];
                if (firstApprove) {
                    enterActiveTask(firstApprove.id);
                    approvalPanelOpen = true;
                    setTimeout(function() {
                        var panel = document.getElementById('approvalListPanel');
                        if (panel) { panel.classList.add('open'); renderApprovalList(); }
                    }, 150);
                }
            };
        }

        // 点击审批行其他区域：不做操作（阻止冒泡即可）
        apprRow.onclick = function(e) {
            e.stopPropagation();
        };

        // 点击子级部门行：进入审批任务
        subList.querySelectorAll('.pill-todo-sublist-row').forEach(function(row, idx) {
            row.onclick = function(e) {
                e.stopPropagation();
                closePillTodoDropdown();
                var approveTask = MY_TASKS.approve[idx];
                if (approveTask) {
                    enterActiveTask(approveTask.id);
                    approvalPanelOpen = true;
                    setTimeout(function() {
                        var panel = document.getElementById('approvalListPanel');
                        if (panel) { panel.classList.add('open'); renderApprovalList(); }
                    }, 150);
                }
            };
        });

        dropdown.appendChild(apprRow);
        dropdown.appendChild(subList);
    }

    wrapper.appendChild(mainBtn);
    wrapper.appendChild(dropdown);

    // 点击主按钮：展开/收起下拉
    mainBtn.onclick = function(e) {
        e.stopPropagation();
        var isOpen = wrapper.classList.toggle('open');
        dropdown.classList.toggle('open', isOpen);
        if (isOpen) {
            setTimeout(function() {
                document.addEventListener('click', closePillTodoOnOutsideClick);
            }, 0);
        }
    };

    container.appendChild(wrapper);

    // 演示模式：日常模式下隐藏待办任务按钮
    if (typeof demoCurrentMode !== 'undefined' && demoCurrentMode === 'daily') {
        wrapper.style.display = 'none';
    }
}

function closePillTodoDropdown() {
    var wrapper = document.getElementById('pillTodoWrapper');
    var dropdown = document.getElementById('pillTodoDropdown');
    if (wrapper) wrapper.classList.remove('open');
    if (dropdown) dropdown.classList.remove('open');
    document.removeEventListener('click', closePillTodoOnOutsideClick);
}

function closePillTodoOnOutsideClick(ev) {
    var wrapper = document.getElementById('pillTodoWrapper');
    if (wrapper && !wrapper.contains(ev.target)) {
        closePillTodoDropdown();
    }
}

function renderTodoInline() {
    var wrap = document.getElementById('todoInline');
    if (!wrap) return;
    var tasks = MY_TASKS[todoActiveTab] || [];
    if (tasks.length === 0) {
        wrap.className = 'todo-inline todo-inline-empty';
        wrap.innerHTML = '';
        return;
    }
    var task = tasks[0];
    var agg = getTaskAggregate(task);
    var cfg = TYPE_CFG[agg.type] || { color: 'var(--primary)', bg: 'var(--primary-bg)' };
    var taskDdl = getTaskDdl(task);
    var daysLeft = getTaskDaysLeft(task);
    var ddlClass = (daysLeft != null && daysLeft <= 0) ? 'over' : (daysLeft != null && daysLeft <= 3) ? 'near' : '';
    var ddlText = taskDdl ? ((daysLeft != null && daysLeft <= 0) ? '已超期' : (daysLeft != null && daysLeft <= 3) ? (daysLeft + '天后截止') : ('截止 ' + taskDdl)) : '';
    var stepsHtml = '';
    if (task.steps && task.steps.length) {
        var orderedSteps = STEP_ORDER.map(function(t) { return task.steps.find(function(s) { return s.type === t; }); }).filter(Boolean);
        orderedSteps.forEach(function(s) {
            var scfg = TYPE_CFG[s.type] || { color: '#666' };
            var stepStatus = todoActiveTab === 'fill' ? ('已填 ' + (s.filled || 0) + '/' + (s.total || 0)) : ('待审批 ' + (s.total || 0) + ' 人');
            stepsHtml += '<span class="todo-inline-step" style="border-color:' + scfg.color + ';color:' + scfg.color + '">' + (STEP_LABELS[s.type] || s.type) + '<span class="step-status"> ' + stepStatus + '</span></span>';
        });
    }
    wrap.className = 'todo-inline';
    wrap.innerHTML =
        (ddlText ? '<span class="todo-inline-ddl ' + ddlClass + '">' + ddlText + '</span>' : '') +
        (stepsHtml ? '<div class="todo-inline-steps">' + stepsHtml + '</div>' : '') +
        '<button type="button" class="todo-inline-enter" style="background:' + cfg.color + '" data-task-id="' + task.id + '">' +
        (agg.rejected ? '修改方案' : (todoActiveTab === 'fill' ? '进入填报' : '进入审批')) + '</button>';
    var enterBtn = wrap.querySelector('.todo-inline-enter');
    if (enterBtn) enterBtn.onclick = function(ev) { ev.stopPropagation(); enterActiveTask(task.id); };
}

function enterActiveTask(taskId) {
    var all = MY_TASKS.fill.concat(MY_TASKS.approve);
    var task = all.find(function(t) { return t.id === taskId; });
    if (!task) return;
    var agg = getTaskAggregate(task);
    activeTask = {
        id: task.id,
        role: task.role,
        type: agg.type,
        peopleIds: getTaskPeopleIds(task),
        total: agg.total,
        filled: agg.filled,
        rejected: agg.rejected,
        rejectedIds: agg.rejectedIds || []
    };
    if (activeTask.role === 'approve') {
        approvalPanelOpen = false;
        activePersonId = null;
        approvalPersonStatus = {};
        getApprovalModePeopleIds().forEach(function(id) { approvalPersonStatus[id] = 'pending'; });
    } else {
        approvalPanelOpen = false;
    }
    var panel = document.getElementById('approvalListPanel');
    if (panel) panel.classList.toggle('open', activeTask.role === 'approve' && approvalPanelOpen);
    updateTaskCtxBar();
    updateTodoContextCapsule();
    renderTaskTitleWidget();
    var mask = document.getElementById('chartContainer') && document.querySelector('#chartContainer .canvas-mask-transition');
    if (!mask) {
        var container = document.getElementById('chartContainer');
        if (container) {
            mask = document.createElement('div');
            mask.className = 'canvas-mask-transition';
            container.appendChild(mask);
        }
    }
    if (mask) { mask.classList.add('show'); }
    setTimeout(function() {
        if (currentView === 'scatter') renderScatterView();
        if (currentView === 'table') renderTableView();
        if (currentView === 'grid') renderGridView();
        if (mask) mask.classList.remove('show');
    }, 130);
}

function exitActiveTask() {
    var mask = document.getElementById('chartContainer') && document.querySelector('#chartContainer .canvas-mask-transition');
    if (mask) mask.classList.add('show');
    setTimeout(function() {
        if (activeTask && activeTask.role === 'approve') {
            approvalPanelOpen = false;
            activePersonId = null;
            approvalPersonStatus = {};
            var panel = document.getElementById('approvalListPanel');
            if (panel) panel.classList.remove('open');
        }
        activeTask = null;
        updateTaskCtxBar();
        updateTodoContextCapsule();
        renderTaskTitleWidget();
        if (currentView === 'scatter') renderScatterView();
        if (currentView === 'table') renderTableView();
        if (currentView === 'grid') renderGridView();
        if (mask) mask.classList.remove('show');
    }, 130);
}

function updateTaskCtxBar() {
    var actions = document.getElementById('topWidgetsActions');
    var submitBtn = document.getElementById('taskCtxSubmit');
    var approvalBtn = document.getElementById('taskCtxApprovalListBtn');
    if (!actions) return;
    if (!activeTask) {
        if (submitBtn) submitBtn.style.display = 'none';
        if (approvalBtn) approvalBtn.style.display = 'none';
        return;
    }
    var isApprove = activeTask.role === 'approve';
    if (submitBtn) {
        if (isApprove) {
            submitBtn.style.display = 'none';
        } else {
            submitBtn.style.display = '';
            submitBtn.textContent = activeTask.rejected ? '重新提交' : '提交方案';
            submitBtn.style.background = activeTask.rejected ? '#dc2626' : '#22c55e';
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }
    if (approvalBtn) {
        approvalBtn.style.display = isApprove ? 'inline-flex' : 'none';
    }
    if (isApprove) updateApprovalListButtonState();
}


function onTaskCtxSubmitClick() {
    if (!activeTask) return;
    if (activeTask.role === 'approve') {
        var ids = getApprovalModePeopleIds();
        var allDone = ids.length > 0 && ids.every(function(id) { return approvalPersonStatus[id] === 'passed' || approvalPersonStatus[id] === 'marked'; });
        if (allDone) exitActiveTask();
        return;
    }
    if (activeTask.role === 'fill') {
        showFillSubmitToast();
    } else {
        showSubmitToast();
    }
}
