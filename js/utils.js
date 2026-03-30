/* === utils.js === 工具函数 */

var TASK_POOL = ['原神五星角色设计', '新版本地图规划', 'Boss战斗机制', '星铁活动策划', '角色技能平衡', '剧情线推进', '版本大世界内容', '多语言本地化', '角色立绘与动效', '玩法系统迭代', '新手引导优化', '联机玩法设计'];
var TALENT_TAG_POOL = ['校招', '高潜', '社招', '骨干', '专家', '管培'];

function getEmpTasks(emp) {
    const n = 1 + (emp.id % 3);
    const start = (emp.id * 7) % TASK_POOL.length;
    const out = [];
    for (let i = 0; i < n; i++) out.push(TASK_POOL[(start + i) % TASK_POOL.length]);
    return out;
}


function getEmpTalentTags(emp) {
    const hasCore = emp.tags && emp.tags.indexOf('核心') !== -1;
    const hasPotential = emp.tags && emp.tags.indexOf('潜力') !== -1;
    const list = [];
    if (emp.tier === '潜力新人') list.push('校招');
    else list.push('社招');
    if (hasPotential) list.push('高潜');
    if (hasCore) list.push('骨干');
    if (emp.level === 'P8') list.push('专家');
    return list.length ? list : ['—'];
}


function getAICompareConclusion(list) {
    const conclusions = [];
    list.forEach(emp => {
        const tasks = getEmpTasks(emp);
        const talentTags = getEmpTalentTags(emp);
        const perfText = (emp.performanceTags || []).map(t => t.text).join('、') || '达到预期';
        let conclusion = '';
        if (emp.tier === '潜力新人' && talentTags.indexOf('校招') !== -1) {
            conclusion = '【' + emp.name + '】基于校招身份与当前绩效' + perfText + '，推理：新人留存与激励敏感度高 → 结论：建议给予适当激励幅度，避免与同届脱节。';
        } else if (tasks.length >= 2 && (perfText.indexOf('远超') !== -1 || perfText.indexOf('略超') !== -1)) {
            conclusion = '【' + emp.name + '】负责多项核心事项且绩效' + perfText + '，推理：贡献与责任双高 → 结论：建议在预算内给予更高激励以匹配产出。';
        } else if (talentTags.indexOf('高潜') !== -1 || talentTags.indexOf('骨干') !== -1) {
            conclusion = '【' + emp.name + '】人才标签为' + talentTags.join('、') + '，推理：保留与激励优先级高 → 结论：建议在方案中予以重点考虑。';
        } else if (perfText.indexOf('未达') !== -1 && (emp.adjustment || 0) > 0) {
            conclusion = '【' + emp.name + '】绩效未达预期却存在调薪，推理：存在异常情形 → 结论：建议补充书面理由或收紧幅度。';
        } else {
            conclusion = '【' + emp.name + '】综合事项' + tasks[0] + '与绩效' + perfText + '，推理：贡献与市场常规区间内 → 结论：建议在常规调薪带宽内安排。';
        }
        conclusions.push('<div class="compare-ai-item">' + conclusion + '</div>');
    });
    return conclusions.join('');
}


function updateComparePanel() {
    const panel = document.getElementById('comparePanel');
    const list = employees.filter(e => selectedForCompare.has(e.id));
    if (list.length === 0) {
        panel.classList.add('hidden');
        return;
    }
    // 隐藏原对比面板（不再展示表格）
    panel.classList.add('hidden');
    // 将 AI 对比分析发送到 AI 助手对话框
    sendCompareAnalysisToAIDialog(list);
}

function sendCompareAnalysisToAIDialog(list) {
    if (typeof openAIDialog !== 'function') return;
    // 打开对话框
    openAIDialog();
    // 构建分析内容
    var names = list.map(function(e) { return e.name; }).join('、');
    var intro = '您圈选了 <strong>' + list.length + '</strong> 位同学（' + names + '），以下是 AI 对比分析：';
    appendAIMessage('ai', intro);
    // 延迟显示分析结果（模拟思考）
    showAITyping();
    setTimeout(function() {
        removeAITyping();
        var analysisHtml = getAICompareConclusion(list);
        appendAIMessage('ai', '<div class="ai-compare-analysis">' + analysisHtml + '</div>\n\n如需对以上人员进行调薪，请直接输入指令，例如：\n<code>' + list[0].name + ' 2000 绩效优秀</code>', true);
    }, 800);
}

function positionSlideOut(cardEl, slideOutEl) {
    const rect = cardEl.getBoundingClientRect();
    const gap = 8;
    slideOutEl.style.left = (rect.right + gap) + 'px';
    slideOutEl.style.top = rect.top + 'px';
}


function getAnomalies(emp) {
    const list = [];
    const adj = emp.adjustment || 0;
    const tags = emp.performanceTags || [];
    const t0 = (tags[0] && tags[0].text) || '达到';
    const t1 = (tags[1] && tags[1].text) || '达到';
    const perfOrder = { '低于': 0, '略低': 1, '达到': 2, '略超': 3, '超出': 4 };
    const level0 = perfOrder[t0] !== undefined ? perfOrder[t0] : 2;
    const level1 = perfOrder[t1] !== undefined ? perfOrder[t1] : 2;
    const worst = Math.min(level0, level1);
    const best = Math.max(level0, level1);
    
    if (adj === 0) return list;
    
    if (worst <= 0 && adj >= 15) list.push('连续绩效趋势异常：两期绩效均低于预期且调薪≥15%');
    if (best >= 3 && adj < 0) list.push('绩效与调薪方向不一致：本期绩效优秀却降薪');
    if (worst <= 0 && adj > 15) list.push('绩效与调薪幅度不匹配：绩效差但调薪幅度过高(>15%)');
    if (adj > 20) list.push('调薪幅度超过20%');
    if (adj < -10) list.push('降薪幅度超过10%');
    
    return list;
}

function showFillSubmitToast() {
    var toast = document.getElementById('submitToast');
    var headerTitle = toast ? toast.querySelector('.toast-header h3') : null;
    var thead = document.getElementById('submitToastThead');
    var tbody = document.getElementById('submitToastBody');
    if (headerTitle) headerTitle.textContent = '待我填报确认（绩效 + 薪酬）';
    var cols = ['姓名', '职级/梯队', '部门/FT', '工作综合自评', '价值观自评', 'Leader评价', '薪资现状', '涨幅', '新薪资', '薪酬填报理由'];
    thead.innerHTML = cols.map(function(c) { return '<th>' + c + '</th>'; }).join('');
    tbody.innerHTML = '';
    var ids = (activeTask && activeTask.peopleIds) ? activeTask.peopleIds : [];
    ids.forEach(function(empId, idx) {
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return;
        var levelTier = emp.level || '';
        var r1 = randomPerfRating(empId * 3 + idx);
        var r2 = randomPerfRating(empId * 7 + idx + 1);
        var r3 = randomPerfRating(empId * 11 + idx + 2);
        var newSalary = Math.round(emp.salary * (1 + (emp.adjustment || 0) / 100));
        var adjStr = (emp.adjustment >= 0 ? '+' : '') + (emp.adjustment || 0) + '%';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (emp.name || '') + '</td><td>' + levelTier + '</td><td>' + (emp.dept || '') + '</td><td>' + r1 + '</td><td>' + r2 + '</td><td>' + r3 + '</td>' +
            '<td>' + (emp.salary / 1000).toFixed(1) + 'K</td><td>' + adjStr + '</td><td>' + (newSalary / 1000).toFixed(1) + 'K</td><td>' + ((emp.adjustmentReason || '').trim() || '—') + '</td>';
        tbody.appendChild(tr);
    });
    if (toast) toast.classList.add('show');
}

function showSubmitToast() {
    var toast = document.getElementById('submitToast');
    var headerTitle = toast ? toast.querySelector('.toast-header h3') : null;
    if (headerTitle) headerTitle.textContent = '薪酬方案明细';
    const thead = document.getElementById('submitToastThead');
    const tbody = document.getElementById('submitToastBody');
    const cols = ['姓名', '职级', '部门', '绩效(历史)', '薪资现状', '涨幅', '新薪资', '异常调薪情况', '薪酬填报理由'];
    thead.innerHTML = cols.map(c => '<th>' + c + '</th>').join('');
    tbody.innerHTML = '';
    // 排序：薪酬正向调整 → 薪酬负向调整 → 未调薪
    const sorted = employees.slice().sort((a, b) => {
        const adjA = a.adjustment || 0;
        const adjB = b.adjustment || 0;
        const orderA = adjA > 0 ? 0 : adjA < 0 ? 1 : 2;
        const orderB = adjB > 0 ? 0 : adjB < 0 ? 1 : 2;
        if (orderA !== orderB) return orderA - orderB;
        return adjB - adjA;
    });
    sorted.forEach(emp => {
        const anomalies = getAnomalies(emp);
        const newSalary = Math.round(emp.salary * (1 + (emp.adjustment || 0) / 100));
        const perfText = (emp.performanceTags || []).map(t => t.text).join(' / ') || '—';
        const tr = document.createElement('tr');
        if (anomalies.length > 0) tr.classList.add('anomaly-row');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.level}</td>
            <td>${emp.dept}</td>
            <td>${perfText}</td>
            <td>${(emp.salary/1000).toFixed(1)}K</td>
            <td>${(emp.adjustment >= 0 ? '+' : '') + (emp.adjustment || 0) + '%'}</td>
            <td>${(newSalary/1000).toFixed(1)}K</td>
            <td>${anomalies.length ? anomalies.join('；') : '—'}</td>
            <td>${(emp.adjustmentReason || '') || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
    if (toast) toast.classList.add('show');
}


function closeSubmitToast() {
    document.getElementById('submitToast').classList.remove('show');
}

document.getElementById('submitToast').addEventListener('click', function(e) {
    if (e.target === this) closeSubmitToast();
});

// 切换筛选

function resetView() {
    // 重置所有调薪
    if (confirm('确认重置所有调薪数据？')) {
        employees.forEach(emp => emp.adjustment = 0);
        if (currentView === 'scatter') renderScatterView();
        if (currentView === 'table') renderTableView();
        updateStats();
    }
}


function batchAdjust() {
    const selected = document.querySelectorAll('input[type="checkbox"]:checked');
    if (selected.length === 0) {
        alert('请先选择要批量调薪的员工');
        return;
    }
    
    const percentage = prompt('请输入统一调薪幅度 (%):', '15');
    if (percentage) {
        selected.forEach(checkbox => {
            const row = checkbox.closest('tr');
            if (row) {
                const empId = parseInt(row.dataset.empId);
                const emp = employees.find(e => e.id === empId);
                if (emp) emp.adjustment = parseInt(percentage);
            }
        });
        
        renderTableView();
        updateStats();
    }
}


function exportData() {
    alert('导出功能：\n\n将生成包含以下内容的Excel文件：\n- 所有员工调薪明细\n- 预算使用统计\n- 异常检测报告\n\n(演示版暂不实际导出)');
}

function backToWideTable() {
    switchToTableView();
}

function backToBoard() {
    switchToCanvasView();
}

/** 切换到宽表视图 */
function switchToTableView() {
    currentView = 'table';
    var sharedHeader = document.getElementById('sharedHeader');
    var scatterView = document.getElementById('scatterView');
    var tableView = document.getElementById('tableView');
    var gridView = document.getElementById('gridView');
    var scatterTopWidgets = document.getElementById('scatterTopWidgets');
    var minimalBar = document.getElementById('canvasToolbarMinimal');

    // 显示共享头部，隐藏散点图自带的顶部栏
    if (sharedHeader) sharedHeader.style.display = 'block';
    if (scatterTopWidgets) scatterTopWidgets.style.display = 'none';
    if (scatterView) scatterView.style.display = 'none';
    if (tableView) tableView.style.display = 'flex';
    if (gridView) gridView.style.display = 'none';
    if (minimalBar) minimalBar.style.display = 'none';

    // 更新标签激活状态
    var tabTable = document.getElementById('wtViewTabTable');
    var tabCanvas = document.getElementById('wtViewTabCanvas');
    if (tabTable) tabTable.classList.add('active');
    if (tabCanvas) tabCanvas.classList.remove('active');

    // 宽表视图显示导出和字段设置按钮
    var btnExport = document.getElementById('wtBtnExport');
    var btnFieldSettings = document.getElementById('wtBtnFieldSettings');
    if (btnExport) btnExport.style.display = '';
    if (btnFieldSettings) btnFieldSettings.style.display = '';

    if (typeof renderTableView === 'function') renderTableView();
}

/** 切换到画布视图 */
function switchToCanvasView() {
    currentView = 'scatter';
    var sharedHeader = document.getElementById('sharedHeader');
    var scatterView = document.getElementById('scatterView');
    var tableView = document.getElementById('tableView');
    var gridView = document.getElementById('gridView');
    var scatterTopWidgets = document.getElementById('scatterTopWidgets');
    var minimalBar = document.getElementById('canvasToolbarMinimal');

    // 显示共享头部，隐藏散点图自带的顶部栏
    if (sharedHeader) sharedHeader.style.display = 'block';
    if (scatterTopWidgets) scatterTopWidgets.style.display = 'none';
    if (scatterView) scatterView.style.display = 'block';
    if (tableView) tableView.style.display = 'none';
    if (gridView) gridView.style.display = 'none';
    if (minimalBar) minimalBar.style.display = 'none';

    // 更新标签激活状态
    var tabTable = document.getElementById('wtViewTabTable');
    var tabCanvas = document.getElementById('wtViewTabCanvas');
    if (tabTable) tabTable.classList.remove('active');
    if (tabCanvas) tabCanvas.classList.add('active');

    // 白板视图隐藏导出和字段设置按钮
    var btnExport = document.getElementById('wtBtnExport');
    var btnFieldSettings = document.getElementById('wtBtnFieldSettings');
    if (btnExport) btnExport.style.display = 'none';
    if (btnFieldSettings) btnFieldSettings.style.display = 'none';

    if (typeof renderScatterView === 'function') renderScatterView();
}

function switchView(view) {
    if (view === 'table') { switchToTableView(); return; }
    if (view === 'scatter') { switchToCanvasView(); return; }
    // grid 视图保留旧逻辑
    currentView = view;
    
    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.closest('.view-btn')?.classList.add('active');
    
    // 显示对应视图
    document.getElementById('scatterView').style.display = 'none';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('gridView').style.display = view === 'grid' ? 'block' : 'none';
    var sharedHeader = document.getElementById('sharedHeader');
    if (sharedHeader) sharedHeader.style.display = 'none';
    var minimalBar = document.getElementById('canvasToolbarMinimal');
    if (minimalBar) minimalBar.style.display = 'flex';
    
    if (view === 'grid') renderGridView();
}

function initChartPan() {
    const container = document.getElementById('chartContainer');
    if (!container) return;
    container.classList.add('pan-mode');
    
    let isPanning = false;
    let startX, startScrollLeft;
    
    container.addEventListener('mousedown', function(e) {
        if (e.button === 2 && !e.target.closest('.scatter-card')) {
            e.preventDefault();
            isPanning = true;
            startX = e.clientX;
            startScrollLeft = container.scrollLeft;
        } else if (e.button === 0 && !e.target.closest('.scatter-card')) {
            isPanning = true;
            startX = e.clientX;
            startScrollLeft = container.scrollLeft;
        }
    });
    
    container.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const dx = e.clientX - startX;
            container.scrollLeft = Math.max(0, startScrollLeft - dx);
        }
    });
    
    document.addEventListener('mouseup', function() {
        isPanning = false;
    });
}

// 切换视图

function initAnomalyTooltipHide() {
    document.addEventListener('mousemove', function(e) {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest('.scatter-card-has-slideout')) return;
        var tip = document.getElementById('anomalyTooltip');
        if (tip) tip.style.display = 'none';
        var yellowSlide = document.getElementById('anomalySlideOut');
        if (yellowSlide) yellowSlide.classList.remove('visible');
        var blueSlide = document.getElementById('reasonSlideOut');
        if (blueSlide) blueSlide.classList.remove('visible');
    });
}

// 画布横向拖拽平移
