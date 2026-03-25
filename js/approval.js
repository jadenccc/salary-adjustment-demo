/* === approval.js === 审批系统 */

var approvalListSortKey = '';   // '' | 'level' | 'delta'
var approvalListSortAsc = true;
var approvalFilterReportToMe = false;

function toggleApprovalListPanel() {
    if (!activeTask || activeTask.role !== 'approve') return;
    approvalPanelOpen = !approvalPanelOpen;
    var panel = document.getElementById('approvalListPanel');
    if (panel) {
        panel.classList.toggle('open', approvalPanelOpen);
        if (approvalPanelOpen) {
            var filterCb = document.getElementById('approvalListFilterReportToMe');
            if (filterCb) filterCb.checked = approvalFilterReportToMe;
            renderApprovalList();
        }
    }
    updateApprovalListButtonState();
}
function updateApprovalListButtonState() {
    var btn = document.getElementById('taskCtxApprovalListBtn');
    var label = document.getElementById('taskCtxApprovalListLabel');
    var arrow = document.getElementById('taskCtxApprovalListArrow');
    if (!btn || !label || !arrow) return;
    if (approvalPanelOpen) {
        label.textContent = '收起';
        arrow.textContent = '▴';
        btn.classList.add('open');
    } else {
        label.textContent = '审批列表';
        arrow.textContent = '▾';
        btn.classList.remove('open');
    }
}
function toggleApprovalFilterReportToMe(checkbox) {
    approvalFilterReportToMe = !!checkbox.checked;
    renderApprovalList();
}
function getFilteredApprovalIds() {
    var ids = getApprovalModePeopleIds();
    if (approvalFilterReportToMe) {
        ids = ids.filter(function(id) {
            var emp = employees.find(function(e) { return e.id === id; });
            return emp && emp.managerId === APPROVAL_CURRENT_USER_ID;
        });
    }
    return ids;
}
function setApprovalSort(key, asc) {
    approvalListSortKey = key;
    approvalListSortAsc = !!asc;
    renderApprovalList();
}
function renderApprovalList() {
    var thead = document.getElementById('approvalListThead');
    var tbody = document.getElementById('approvalListBody');
    if (!thead || !tbody || !activeTask || activeTask.role !== 'approve') return;
    var ids = getFilteredApprovalIds();
    var sorted = ids.slice();
    if (approvalListSortKey === 'level') {
        sorted.sort(function(a, b) {
            var ea = employees.find(function(e) { return e.id === a; });
            var eb = employees.find(function(e) { return e.id === b; });
            var la = (ea && ea.level) || '';
            var lb = (eb && eb.level) || '';
            var cmp = la.localeCompare(lb);
            return approvalListSortAsc ? cmp : -cmp;
        });
    } else if (approvalListSortKey === 'delta') {
        sorted.sort(function(a, b) {
            var ea = employees.find(function(e) { return e.id === a; });
            var eb = employees.find(function(e) { return e.id === b; });
            var da = (ea && (ea.adjustment || 0)) || 0;
            var db = (eb && (eb.adjustment || 0)) || 0;
            return approvalListSortAsc ? (da - db) : (db - da);
        });
    }
    var levelSortUp = approvalListSortKey === 'level' && approvalListSortAsc ? ' approval-sort-active' : '';
    var levelSortDn = approvalListSortKey === 'level' && !approvalListSortAsc ? ' approval-sort-active' : '';
    var deltaSortUp = approvalListSortKey === 'delta' && approvalListSortAsc ? ' approval-sort-active' : '';
    var deltaSortDn = approvalListSortKey === 'delta' && !approvalListSortAsc ? ' approval-sort-active' : '';
    thead.innerHTML =
        '<th onclick="event.stopPropagation()"><input type="checkbox" id="approvalListSelectAll" onchange="toggleApprovalSelectAll(this)"></th>' +
        '<th>姓名</th>' +
        '<th class="approval-th-sort">职级 <span class="approval-sort-btn' + levelSortUp + '" onclick="event.stopPropagation();setApprovalSort(\'level\',true);" title="升序">↑</span><span class="approval-sort-btn' + levelSortDn + '" onclick="event.stopPropagation();setApprovalSort(\'level\',false);" title="降序">↓</span></th>' +
        '<th>调整后薪酬</th>' +
        '<th class="approval-th-sort">涨幅 <span class="approval-sort-btn' + deltaSortUp + '" onclick="event.stopPropagation();setApprovalSort(\'delta\',true);" title="升序">↑</span><span class="approval-sort-btn' + deltaSortDn + '" onclick="event.stopPropagation();setApprovalSort(\'delta\',false);" title="降序">↓</span></th>' +
        '<th>奖励月数</th><th>绩效评级</th><th>当前状态</th>';
    tbody.innerHTML = sorted.map(function(empId) {
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return '<tr data-emp-id="' + empId + '"><td colspan="8">--</td></tr>';
        var newSalary = emp.salary * (1 + (emp.adjustment || 0) / 100);
        var delta = (emp.adjustment || 0);
        var anomaly = (emp.adjustment || 0) > 25;
        var status = approvalPersonStatus[empId] || 'pending';
        var statusText = status === 'passed' ? '已通过' : status === 'marked' ? '已标记问题' : '待审批';
        var nameCell = anomaly ? '<span class="name-warn" title="超带宽">⚠</span>' + emp.name : emp.name;
        var rowClass = (activePersonId === emp.id ? ' approval-row-active' : '') + (anomaly ? ' approval-row-anomaly' : '');
        var canSelect = status === 'pending';
        return '<tr class="approval-row' + rowClass + '" data-emp-id="' + empId + '">' +
            '<td onclick="event.stopPropagation()"><input type="checkbox" class="approval-row-cb" data-emp-id="' + empId + '" ' + (canSelect ? '' : 'disabled') + '></td>' +
            '<td class="name-cell">' + nameCell + '</td>' +
            '<td>' + (emp.level || '') + '</td>' +
            '<td>' + (newSalary / 1000).toFixed(1) + 'K</td>' +
            '<td>' + (delta > 0 ? '+' : '') + delta + '%</td>' +
            '<td>--</td>' +
            '<td>' + (emp.performance || '') + '</td>' +
            '<td class="status-' + status + '">' + statusText + '</td></tr>';
    }).join('');
    tbody.querySelectorAll('tr').forEach(function(tr) {
        tr.onclick = function() { setActivePersonId(parseInt(tr.dataset.empId)); };
    });
    tbody.querySelectorAll('.approval-row-cb').forEach(function(cb) {
        cb.onchange = function() { syncApprovalSelectAllState(); };
    });
    syncApprovalSelectAllState();
}
function syncApprovalSelectAllState() {
    var cb = document.getElementById('approvalListSelectAll');
    if (!cb) return;
    var ids = getFilteredApprovalIds();
    var allPending = ids.filter(function(id) { return (approvalPersonStatus[id] || 'pending') === 'pending'; });
    cb.checked = ids.length > 0 && allPending.length === 0;
    cb.indeterminate = allPending.length > 0 && allPending.length < ids.length;
}
function setActivePersonId(empId) {
    activePersonId = empId;
    document.querySelectorAll('.scatter-card').forEach(function(c) {
        var id = parseInt(c.dataset.empId);
        c.classList.toggle('approval-highlight', id === empId);
    });
    document.querySelectorAll('#approvalListBody tr').forEach(function(tr) {
        tr.classList.toggle('approval-row-active', parseInt(tr.dataset.empId) === empId);
    });
    var emp = employees.find(function(e) { return e.id === empId; });
    if (emp) {
        showDetail(emp);
    }
    if (approvalPanelOpen) {
        var row = document.querySelector('#approvalListBody tr[data-emp-id="' + empId + '"]');
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}
function showApprovalDetail(emp) {
    var content = document.getElementById('panelContent');
    if (!content) return;
    var taskType = activeTask ? activeTask.type : 'sal';
    var newSalary = emp.salary * (1 + (emp.adjustment || 0) / 100);
    var delta = (emp.adjustment || 0);
    var anomaly = (emp.adjustment || 0) > 25;
    var status = approvalPersonStatus[emp.id] || 'pending';
    var passed = status === 'passed';
    var typeLabels = { sal: '薪酬', perf: '绩效', lvl: '职级', ttp: 'TTP', int: '面谈' };
    var fieldHtml = taskType === 'sal' || taskType === 'perf' || !taskType
        ? '<div class="approval-drawer-field"><span class="label">月薪</span><div>' + (emp.salary / 1000).toFixed(1) + 'K → ' + (newSalary / 1000).toFixed(1) + 'K</div>' + (anomaly ? '<div class="warn">超带宽，请关注</div>' : '') + '</div>'
        : '<div class="approval-drawer-field"><span class="label">职级/绩效</span><div>' + (emp.level || '') + ' · ' + (emp.performance || '') + '</div></div>';
    content.innerHTML = '<div class="approval-drawer-header" style="padding-bottom:12px;border-bottom:1px solid var(--border-light);margin-bottom:12px;"><h3 style="margin:0;">' + (emp.name || '') + '</h3><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + (emp.level || '') + ' · ' + (emp.dept || '') + '</div></div>' +
        fieldHtml +
        '<div class="approval-drawer-actions">' +
        '<button type="button" class="btn btn-primary btn-pass" id="approvalDrawerPass" ' + (passed ? 'disabled' : '') + ' onclick="approvalDrawerPass(' + emp.id + ')">通过</button>' +
        '<button type="button" class="btn approval-drawer-actions btn-mark" onclick="approvalDrawerMark(' + emp.id + ')">标记问题</button>' +
        '</div>';
}
function approvalDrawerPass(empId) {
    approvalPersonStatus[empId] = 'passed';
    updateTaskCtxBar();
    renderApprovalList();
    var emp = employees.find(function(e) { return e.id === empId; });
    if (emp) showDetail(emp);
}
function approvalDrawerMark(empId) {
    approvalPersonStatus[empId] = 'marked';
    updateTaskCtxBar();
    renderApprovalList();
    var emp = employees.find(function(e) { return e.id === empId; });
    if (emp) showDetail(emp);
}
function toggleApprovalSelectAll(checkbox) {
    if (!activeTask || activeTask.role !== 'approve') return;
    var ids = getFilteredApprovalIds();
    var checked = checkbox.checked;
    if (checked) ids.forEach(function(id) { approvalPersonStatus[id] = 'passed'; });
    else ids.forEach(function(id) { approvalPersonStatus[id] = 'pending'; });
    updateTaskCtxBar();
    renderApprovalList();
}
function approvalPassSelected() {
    if (!activeTask || activeTask.role !== 'approve') return;
    var tbody = document.getElementById('approvalListBody');
    if (!tbody) return;
    tbody.querySelectorAll('.approval-row-cb:checked').forEach(function(cb) {
        var id = parseInt(cb.dataset.empId);
        if (!isNaN(id)) approvalPersonStatus[id] = 'passed';
    });
    document.getElementById('approvalListSelectAll').checked = false;
    updateTaskCtxBar();
    renderApprovalList();
    if (activePersonId) {
        var emp = employees.find(function(e) { return e.id === activePersonId; });
        if (emp) showDetail(emp);
    }
}

