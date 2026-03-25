/* === table-grid.js === 表格视图 + 九宫格视图渲染 */

const WIDE_TABLE_COLUMNS = [
    { group: '', label: '待办状态', key: 'todoStatus' },
    { group: '', label: '姓名', key: 'name' },
    { group: '组员信息', label: '职业通道', key: 'careerPath' },
    { group: '组员信息', label: '组织路径', key: 'orgPath' },
    { group: '组员信息', label: '管线', key: 'pipeline' },
    { group: '组员信息', label: '入职时间', key: 'joinDate' },
    { group: '组员信息', label: '司龄', key: 'tenure' },
    { group: '', label: '岗位（快照）', key: 'positionSnapshot' },
    { group: '', label: '岗位（实时）', key: 'positionRealtime' },
    { group: '', label: '当前职级（实时）', key: 'currentLevelRealtime' },
    { group: '', label: '用工类型&员工属性', key: 'employmentTypeAndAttr' },
    { group: '组员信息', label: '考核汇报关系（快照）', key: 'managerSnapshot' },
    { group: '组员信息', label: '考核汇报关系（实时）', key: 'managerRealtime' },
    { group: '组员信息', label: '域账号', key: 'domainAccount' },
    { group: '组员信息', label: '社会工龄', key: 'workAge' },
    { group: '组员信息', label: '招聘类型', key: 'recruitType' },
    { group: '薪酬参考区', label: '现薪酬（原币种）', key: 'salaryOrigin' },
    { group: '组员信息', label: '转正结果', key: 'regularizationResult' },
    { group: '薪酬参考区', label: '现薪酬（人民币）', key: 'salaryCny' },
    { group: '组员信息', label: '服务期类型&到期时间', key: 'serviceTermTypeAndExpire' },
    { group: '组员信息', label: '上调/下调具体级数（职级popover）', key: 'levelAdjustStep' },
    { group: '组员信息', label: '当前职级停留时长（职级popover）', key: 'levelStayDuration' },
    { group: '', label: '调级类型（职级popover）', key: 'levelAdjustType' },
    { group: '', label: '调级人（职级popover）', key: 'levelAdjustBy' },
    { group: '', label: '调级理由（职级popover）', key: 'levelAdjustReason' },
    { group: '', label: '调级生效时间（职级popover）', key: 'levelAdjustEffectiveDate' },
    { group: '事项信息', label: '当前事项', key: 'currentTask' },
    { group: '事项信息', label: '上上期绩效', key: 'perf2' },
    { group: '事项信息', label: '上期绩效', key: 'perf1' },
    { group: '事项信息', label: '绩效周期（绩效popover）', key: 'perfCycle' },
    { group: '事项信息', label: '事项&结果信息（绩效popover）', key: 'perfTaskAndResult' },
    { group: '事项信息', label: '绩效评价说明（绩效popover）', key: 'perfComment' },
    { group: '薪酬参考区', label: '参加历史', key: 'salaryHistoryAttend' },
    { group: '薪酬参考区', label: '是否参加本期回顾', key: 'salaryAttendCurrent' },
    { group: '薪酬参考区', label: '当前节点状态', key: 'currentNodeStatus' },
    { group: '薪酬参考区', label: '币种（现薪酬）', key: 'salaryCurrencyCurrent' },
    { group: '薪酬参考区', label: '现薪酬-Offer 信息（特殊 offer 内容，入职补贴）', key: 'salaryOfferInfo' },
    { group: '薪酬参考区', label: '现薪酬-历史调薪信息', key: 'salaryHistoryAdjustInfo' },
    { group: '薪酬参考区', label: '币种（上上年度TTP）', key: 'ttpCurrency' },
    { group: '薪酬参考区', label: '上上年度 TTP（原币种）', key: 'ttpPrev2Origin' },
    { group: '薪酬提报区', label: '调整后金额（原币种）', key: 'adjustedSalaryOrigin' },
    { group: '薪酬提报区', label: '调整后金额（人民币）', key: 'adjustedSalaryCny' },
    { group: '薪酬提报区', label: '调后基础总年薪(原币种)', key: 'adjustedAnnualOrigin' },
    { group: '薪酬提报区', label: '调后基础总年薪(人民币)', key: 'adjustedAnnualCny' },
    { group: '薪酬提报区', label: '调后与上年TTP涨幅', key: 'ttpRaiseVsLastYear' },
    { group: '薪酬提报区', label: '本期激励标签', key: 'incentiveTag' },
    { group: '薪酬提报区', label: '备注', key: 'remark' },
    { group: '组员信息', label: '当前职级', key: 'currentLevel' },
    { group: '薪酬提报区', label: '本期涨幅', key: 'raisePercent' },
    { group: '组员信息', label: '具体管线信息（点击）', key: 'pipelineDetail' },
    { group: '组员信息', label: '具体梯队信息（点击）', key: 'tierDetail' },
    { group: '组员信息', label: '工号', key: 'employeeNo' },
    { group: '事项信息', label: '具体事项信息（点击）', key: 'taskDetail' },
    { group: '薪酬提报区', label: '本期调整额（审批记录）', key: 'adjustAmountApprovalRecord' },
    { group: '薪酬提报区', label: '调薪理由类型', key: 'adjustReasonType' },
    { group: '薪酬提报区', label: '建议关注', key: 'focusSuggestion' }
];

/** 宽表已选中的员工 ID 集合 */
var wtSelectedIds = new Set();

function buildWideTableHeader() {
    const groupRow = document.getElementById('tableHeadGroupRow');
    const fieldRow = document.getElementById('tableHeadFieldRow');
    if (!groupRow || !fieldRow) return;
    groupRow.innerHTML = '';
    fieldRow.innerHTML = '';

    // 复选框列 - 分组行占位
    const chkGroupTh = document.createElement('th');
    chkGroupTh.className = 'wide-group-head wt-chk-col';
    chkGroupTh.rowSpan = 2;
    chkGroupTh.innerHTML = '<input type="checkbox" class="wt-chk" id="wtSelectAll">';
    groupRow.appendChild(chkGroupTh);

    let i = 0;
    while (i < WIDE_TABLE_COLUMNS.length) {
        const g = WIDE_TABLE_COLUMNS[i].group || '';
        let span = 1;
        while (i + span < WIDE_TABLE_COLUMNS.length && (WIDE_TABLE_COLUMNS[i + span].group || '') === g) span++;
        const th = document.createElement('th');
        th.className = 'wide-group-head' + (g ? ' wt-group-has-label' : '');
        th.colSpan = span;
        th.textContent = g;
        groupRow.appendChild(th);
        i += span;
    }
    WIDE_TABLE_COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.className = 'wide-field-head';
        th.textContent = col.label;
        fieldRow.appendChild(th);
    });

    // 全选复选框事件
    const selectAllChk = document.getElementById('wtSelectAll');
    if (selectAllChk) {
        selectAllChk.onchange = function() {
            const tbody = document.getElementById('tableBody');
            const chks = tbody ? tbody.querySelectorAll('.wt-row-chk') : [];
            chks.forEach(c => { c.checked = selectAllChk.checked; });
            if (selectAllChk.checked) {
                chks.forEach(c => { wtSelectedIds.add(parseInt(c.dataset.empId)); });
            } else {
                wtSelectedIds.clear();
            }
            updateWtSummary();
        };
    }
}

function getWideTableCellValue(emp, key) {
    const name = (emp && emp.name) || '--';
    const level = (emp && emp.level) || '--';
    const dept = (emp && emp.dept) || '--';
    const adjustment = (emp && emp.adjustment) || 0;
    const newSalary = Math.round((emp && emp.salary ? emp.salary : 0) * (1 + adjustment / 100));
    const perfTags = (emp && emp.performanceTags) || [];
    const perf1 = perfTags[0] && perfTags[0].text ? perfTags[0].text : '--';
    const perf2 = perfTags[1] && perfTags[1].text ? perfTags[1].text : '--';
    const todoStatus = activeTask ? (activeTask.role === 'approve' ? '待审批' : '待填报') : '进行中';

    const map = {
        todoStatus: todoStatus,
        name: name,
        careerPath: emp.careerPath || '--',
        orgPath: emp.orgPath || dept,
        pipeline: dept,
        joinDate: emp.joinDate || '--',
        tenure: emp.tenure || '--',
        positionSnapshot: emp.positionSnapshot || '--',
        positionRealtime: emp.positionRealtime || '--',
        currentLevelRealtime: level,
        employmentTypeAndAttr: emp.employmentTypeAndAttr || '--',
        managerSnapshot: emp.manager || '--',
        managerRealtime: emp.manager || '--',
        domainAccount: emp.domainAccount || '--',
        workAge: emp.workAge || '--',
        recruitType: emp.recruitType || '--',
        salaryOrigin: emp.salary ? (emp.salary.toLocaleString() + ' 元') : '--',
        regularizationResult: emp.regularizationResult || '--',
        salaryCny: emp.salary ? (emp.salary.toLocaleString() + ' 元') : '--',
        serviceTermTypeAndExpire: emp.serviceTermTypeAndExpire || '--',
        levelAdjustStep: emp.levelAdjustStep || '--',
        levelStayDuration: emp.levelStayDuration || '--',
        levelAdjustType: emp.levelAdjustType || '--',
        levelAdjustBy: emp.levelAdjustBy || '--',
        levelAdjustReason: emp.levelAdjustReason || '--',
        levelAdjustEffectiveDate: emp.levelAdjustEffectiveDate || '--',
        currentTask: emp.currentTask || '--',
        perf2: perf2,
        perf1: perf1,
        perfCycle: emp.perfCycle || '--',
        perfTaskAndResult: emp.perfTaskAndResult || '--',
        perfComment: emp.perfComment || '--',
        salaryHistoryAttend: emp.salaryHistoryAttend || '--',
        salaryAttendCurrent: emp.salaryAttendCurrent || '--',
        currentNodeStatus: emp.currentNodeStatus || '--',
        salaryCurrencyCurrent: emp.salaryCurrencyCurrent || 'CNY',
        salaryOfferInfo: emp.salaryOfferInfo || '--',
        salaryHistoryAdjustInfo: emp.salaryHistoryAdjustInfo || '--',
        ttpCurrency: emp.ttpCurrency || '--',
        ttpPrev2Origin: emp.ttpPrev2Origin || '--',
        adjustedSalaryOrigin: newSalary ? (newSalary.toLocaleString() + ' 元') : '--',
        adjustedSalaryCny: newSalary ? (newSalary.toLocaleString() + ' 元') : '--',
        adjustedAnnualOrigin: newSalary ? (Math.round(newSalary * 12).toLocaleString() + ' 元') : '--',
        adjustedAnnualCny: newSalary ? (Math.round(newSalary * 12).toLocaleString() + ' 元') : '--',
        ttpRaiseVsLastYear: emp.ttpRaiseVsLastYear || '--',
        incentiveTag: emp.incentiveTag || '--',
        remark: emp.remark || '--',
        currentLevel: level,
        raisePercent: (adjustment >= 0 ? '+' : '') + adjustment + '%',
        pipelineDetail: '查看',
        tierDetail: emp.tier || '查看',
        employeeNo: emp.employeeNo || '--',
        taskDetail: '查看',
        adjustAmountApprovalRecord: (emp.salary ? Math.round(emp.salary * (adjustment / 100)).toLocaleString() : '0') + ' 元',
        adjustReasonType: emp.adjustReasonType || '--',
        focusSuggestion: emp.focusSuggestion || '--'
    };
    return map[key] == null || map[key] === '' ? '--' : map[key];
}

function renderTableView() {
    const tbody = document.getElementById('tableBody');
    const filtered = getFilteredEmployees();
    buildWideTableHeader();
    tbody.innerHTML = '';

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        tr.dataset.empId = emp.id;
        if (wtSelectedIds.has(emp.id)) tr.classList.add('selected');
        // 复选框列
        const chkTd = document.createElement('td');
        chkTd.className = 'wt-chk-col';
        chkTd.innerHTML = '<input type="checkbox" class="wt-chk wt-row-chk" data-emp-id="' + emp.id + '"' + (wtSelectedIds.has(emp.id) ? ' checked' : '') + '>';
        chkTd.onclick = function(e) { e.stopPropagation(); };
        const chkInput = chkTd.querySelector('input');
        chkInput.onchange = function() {
            if (chkInput.checked) { wtSelectedIds.add(emp.id); tr.classList.add('selected'); }
            else { wtSelectedIds.delete(emp.id); tr.classList.remove('selected'); }
            updateWtSummary();
            // 同步全选框状态
            const allChk = document.getElementById('wtSelectAll');
            if (allChk) {
                const total = tbody.querySelectorAll('.wt-row-chk').length;
                const checked = tbody.querySelectorAll('.wt-row-chk:checked').length;
                allChk.checked = total > 0 && checked === total;
                allChk.indeterminate = checked > 0 && checked < total;
            }
        };
        tr.appendChild(chkTd);
        // 数据列
        WIDE_TABLE_COLUMNS.forEach(col => {
            const td = document.createElement('td');
            const val = getWideTableCellValue(emp, col.key);
            if (col.key === 'name') {
                // 姓名列：头像 + 姓名
                td.className = 'wt-name-cell';
                td.innerHTML = '<div class="wt-name-wrap"><div class="wt-row-avatar"></div><span>' + (val || '--').replace(/</g, '&lt;') + '</span></div>';
            } else if (val === '--' || val === '-') {
                td.innerHTML = '<span class="wt-cell-muted">' + val + '</span>';
            } else if (col.key === 'currentLevel' || col.key === 'currentLevelRealtime') {
                if (val === '无职级' || val === '--') {
                    td.innerHTML = '<span class="wt-cell-warn">' + val + '</span>';
                } else {
                    td.textContent = val;
                }
            } else if (col.key === 'pipelineDetail' || col.key === 'tierDetail' || col.key === 'taskDetail') {
                td.innerHTML = '<span class="wt-cell-link">' + val + '</span>';
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        tr.onclick = function(e) {
            if (e.target.closest('.wt-chk-col')) return;
            showDetail(emp);
        };
        tbody.appendChild(tr);
    });

    // 更新统计
    updateWtSummary(filtered.length);
    updateWtStats(filtered);
}

/** 更新宽表底部统计行 */
function updateWtSummary(totalCount) {
    const totalEl = document.getElementById('wtSummaryTotal');
    const selectedEl = document.getElementById('wtSummarySelected');
    if (totalEl && totalCount != null) totalEl.textContent = totalCount;
    if (selectedEl) selectedEl.textContent = wtSelectedIds.size;
}

/** 更新宽表顶部统计卡片 */
function updateWtStats(filtered) {
    if (!filtered) filtered = getFilteredEmployees();
    const total = filtered.length;
    const adjusted = filtered.filter(e => (e.adjustment || 0) !== 0).length;
    const avgRaise = total > 0 ? (filtered.reduce((s, e) => s + (e.adjustment || 0), 0) / total) : 0;
    const anomalyCount = filtered.filter(e => typeof getAnomalies === 'function' && getAnomalies(e).length > 0).length;
    const consecutiveCount = filtered.filter(e => e.consecutiveNoRaise && e.consecutiveNoRaise >= 2).length;

    const elAdj = document.getElementById('wtStatAdjusted');
    const elTotal = document.getElementById('wtStatTotal');
    const elAvg = document.getElementById('wtStatAvgRaise');
    const elAnomaly = document.getElementById('wtStatAnomaly');
    const elConsec = document.getElementById('wtStatConsecutive');
    if (elAdj) elAdj.innerHTML = adjusted + ' / <span id="wtStatTotal">' + total + '</span>';
    if (elAvg) elAvg.textContent = avgRaise.toFixed(1) + '%';
    if (elAnomaly) elAnomaly.textContent = anomalyCount;
    if (elConsec) elConsec.textContent = consecutiveCount;
}

// 渲染九宫格

function renderGridView() {
    const grid = document.getElementById('nineGrid');
    const filtered = getFilteredEmployees();
    
    // 九宫格定义
    const gridCells = [
        {title: '⭐ 明星员工', desc: '高绩效高潜力', color: '#fff3e0', filter: emp => emp.tier === '明星员工'},
        {title: '🎯 核心骨干', desc: '高绩效中潜力', color: '#e8f5e9', filter: emp => emp.tier === '核心骨干'},
        {title: '🏆 绩效优秀', desc: '高绩效低潜力', color: '#e3f2fd', filter: emp => emp.tier === '绩效优秀'},
        {title: '🌱 潜力新人', desc: '中绩效高潜力', color: '#f3e5f5', filter: emp => emp.tier === '潜力新人'},
        {title: '💼 稳定发展', desc: '中绩效中潜力', color: '#f5f5f5', filter: emp => emp.tier === '稳定发展'},
        {title: '📊 待提升', desc: '中绩效低潜力', color: '#fff9c4', filter: emp => emp.tier === '待提升'},
        {title: '⚠️ 待观察', desc: '低绩效高潜力', color: '#ffebee', filter: emp => emp.tier === '待观察'},
        {title: '📉 绩效改进', desc: '低绩效中潜力', color: '#fce4ec', filter: emp => emp.tier === '绩效改进'},
        {title: '🚫 淘汰考虑', desc: '低绩效低潜力', color: '#ffcdd2', filter: emp => emp.tier === '淘汰考虑'}
    ];
    
    grid.innerHTML = '';
    
    gridCells.forEach(cell => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'grid-cell';
        cellDiv.style.background = cell.color;
        
        const empList = filtered.filter(cell.filter);
        
        cellDiv.innerHTML = `
            <div class="grid-cell-header">
                <div class="grid-cell-title">${cell.title}</div>
                <div class="grid-cell-count">${empList.length}人 · ${cell.desc}</div>
            </div>
        `;
        
        empList.forEach(emp => {
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card';
            miniCard.innerHTML = `
                <div class="mini-card-name">${emp.name} - ${emp.level}</div>
                <div class="mini-card-info">${emp.dept} · ${emp.performance} · ${(emp.salary/1000).toFixed(1)}K</div>
            `;
            miniCard.onclick = () => showDetail(emp);
            cellDiv.appendChild(miniCard);
        });
        
        grid.appendChild(cellDiv);
    });
}


function adjustSalary(empId, value) {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
        emp.adjustment = parseInt(value);
        updateStats();
        
        // 如果当前显示了该员工详情，更新详情面板
        if (selectedEmployee && selectedEmployee.id === empId) {
            showDetail(emp);
        }
    }
}

// 应用建议

function selectAll(checkbox) {
    // 宽表重制后默认不使用行内多选框，保留函数以兼容历史调用
}
