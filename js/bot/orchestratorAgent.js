/* === orchestratorAgent.js === 总调度 */
(function() {
    function getAllEmployees() {
        if (typeof employees !== 'undefined') return employees;
        return window.employees || [];
    }
    function getPeopleByIds(ids) {
        return getAllEmployees().filter(function(e) { return ids.indexOf(e.id) >= 0; });
    }

    // Demo：绩效填报专用的3个员工 ID
    var PERF_DEMO_IDS = [22, 4, 6]; // 王二五、孙七、吴九

    function perfSummaryHtml(people) {
        var count = { 'A/A+': 0, 'B/B+': 0, 'C': 0, '待定': 0 };
        people.forEach(function(p) {
            if (p.performance === 'A' || p.performance === 'A+') count['A/A+']++;
            else if (p.performance === 'B' || p.performance === 'B+') count['B/B+']++;
            else if (p.performance === 'C') count.C++;
            else count['待定']++;
        });
        var total = people.length || 1;
        var excellentRate = (((count['A/A+'] + count['B/B+']) / total) * 100).toFixed(1);
        return '<div class="bot-mini-card">' +
            '<strong>本次绩效填写情况摘要</strong><br>' +
            '总人数：' + people.length + '<br>' +
            'A/A+ ×' + count['A/A+'] + '　B/B+ ×' + count['B/B+'] + '　C ×' + count.C + '　待定 ×' + count['待定'] +
            '</div>' +
            '<div class="bot-mini-card"><strong>AI总结</strong><br>' +
            '整体绩效分布较稳，当前优良占比约 ' + excellentRate + '%。建议优先复核 C 档与待定同学的评语一致性，再进入薪酬阶段。' +
            '</div>';
    }

    function getHighestSalaryPerson(people) {
        if (!people || !people.length) return null;
        return people.reduce(function(maxEmp, cur) {
            if (!maxEmp) return cur;
            return (cur.salary || 0) > (maxEmp.salary || 0) ? cur : maxEmp;
        }, null);
    }

    function compSummaryHtml(people) {
        var adjusted = people.filter(function(p) { return (p.adjustment || 0) !== 0; });
        var unchanged = people.length - adjusted.length;
        var avg = adjusted.length ? (adjusted.reduce(function(s, p) { return s + (p.adjustment || 0); }, 0) / adjusted.length).toFixed(1) : '0.0';
        return '<div class="bot-mini-card">调整 ' + adjusted.length + '人　未调整 ' + unchanged + '人　平均涨幅 ' + avg + '%</div>';
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function perfTextToLevelLabel(text) {
        switch (text) {
            case '超出': return '超出预期';
            case '略超': return '略超预期';
            case '达到': return '符合预期';
            case '略低': return '略低预期';
            case '低于': return '低于预期';
            default: return '—';
        }
    }

    function presetPerfTagsForDemo(empId, tagTexts) {
        var emp = getAllEmployees().find(function(e) { return e.id === empId; });
        if (!emp) return;
        var symbolMap = { '达到': '―', '略低': '↓', '低于': '↓↓', '略超': '↑', '超出': '↑↑' };
        emp.performanceTags = (tagTexts || []).map(function(t) { return { text: t, symbol: symbolMap[t] || '' }; });
    }

    function getPerfFilledIdsInTask(taskPeopleIds) {
        if (typeof perfFilledIds === 'undefined' || !perfFilledIds || typeof perfFilledIds.has !== 'function') return [];
        var out = [];
        var seen = {};
        for (var i = 0; i < taskPeopleIds.length; i++) {
            var id = taskPeopleIds[i];
            if (!perfFilledIds.has(id)) continue;
            if (seen[id]) continue;
            seen[id] = true;
            out.push(id);
        }
        return out;
    }

    function buildPerfOverviewMessageHtml(perfIdsInTask) {
        var uniq = [];
        var seenPerf = {};
        for (var i = 0; i < (perfIdsInTask || []).length; i++) {
            var id = perfIdsInTask[i];
            if (seenPerf[id]) continue;
            seenPerf[id] = true;
            uniq.push(id);
        }
        var perfPeriods = ['2025年上半年', '2024年下半年'];
        var levelOrder = ['超出预期', '略超预期', '符合预期', '略低预期', '低于预期'];
        var levelColor = {
            '超出预期': '#389e0d',
            '略超预期': '#52c41a',
            '符合预期': '#1890ff',
            '略低预期': '#fa8c16',
            '低于预期': '#f5222d'
        };

        var allEmps = getAllEmployees();
        function findEmp(id) {
            return allEmps.find(function(e) { return e.id === id; });
        }

        var rows = uniq.map(function(id) {
            var emp = findEmp(id);
            var name = emp ? emp.name : String(id);
            var tags = (emp && emp.performanceTags) ? emp.performanceTags : [];
            var t0 = tags[0] ? tags[0].text : '';
            var t1 = tags[1] ? tags[1].text : '';
            return {
                id: id,
                name: name,
                l0: perfTextToLevelLabel(t0),
                l1: perfTextToLevelLabel(t1)
            };
        });

        var total = rows.length || 1;
        var counts = {};
        levelOrder.forEach(function(l) { counts[l] = 0; });
        rows.forEach(function(r) {
            if (counts[r.l1] != null) counts[r.l1] += 1;
        });

        var cumDeg = 0;
        var segments = [];
        for (var i = 0; i < levelOrder.length; i++) {
            var label = levelOrder[i];
            var c = counts[label] || 0;
            var deg = (c / total) * 360;
            var start = cumDeg;
            var end = (i === levelOrder.length - 1) ? 360 : (cumDeg + deg);
            segments.push(levelColor[label] + ' ' + start.toFixed(2) + 'deg ' + end.toFixed(2) + 'deg');
            cumDeg = end;
        }

        var pieHtml = '<div class="bot-perf-pie-wrap">' +
            '<div class="bot-perf-pie" style="background: conic-gradient(' + segments.join(',') + ');">' +
            '<div class="bot-perf-pie-inner">' + total + '</div>' +
            '</div>' +
            '<div class="bot-perf-legend">';
        levelOrder.forEach(function(l) {
            pieHtml += '<div class="bot-perf-legend-item">' +
                '<span class="bot-perf-dot" style="background:' + levelColor[l] + '"></span>' +
                '<span class="bot-perf-legend-text">' + l + '：' + (counts[l] || 0) + '</span>' +
                '</div>';
        });
        pieHtml += '</div></div>';

        var currentPeriodLabel = perfPeriods[1] || '本期评定';
        var tableRowsHtml = rows.map(function(r) {
            var label = r.l1 || '—';
            var c = levelColor[label] || '#94a3b8';
            return '<tr>' +
                '<td class="bot-perf-td-name">' + escapeHtml(r.name) + '</td>' +
                '<td class="bot-perf-td-level">' +
                '<span class="bot-perf-pill" style="border-color:' + c + ';color:' + c + ';background:' + c + '12">' + escapeHtml(label) + '</span>' +
                '</td>' +
                '</tr>';
        }).join('');

        var tableHtml = '<div class="bot-perf-table-wrap">' +
            '<div class="bot-perf-table-title">本期评定：' + escapeHtml(currentPeriodLabel) + '</div>' +
            '<table class="bot-perf-table">' +
            '<thead><tr><th>姓名</th><th>本期评定</th></tr></thead>' +
            '<tbody>' + tableRowsHtml + '</tbody>' +
            '</table>' +
            '</div>';

        return '<div class="bot-perf-overview-wrap">' +
            '<div class="bot-perf-overview-title">绩效填报步骤已完成，以下是绩效填报概览</div>' +
            pieHtml +
            tableHtml +
            '</div>';
    }

    function getCompChangedIdsInTask(taskPeopleIds) {
        if (!taskPeopleIds || !taskPeopleIds.length) return [];
        var out = [];
        var seen = {};
        var all = getAllEmployees();
        for (var i = 0; i < taskPeopleIds.length; i++) {
            var id = taskPeopleIds[i];
            var emp = all.find(function(e) { return e.id === id; });
            var rate = emp ? Number(emp.adjustment || 0) : 0;
            if (!emp || rate === 0) continue;
            if (seen[id]) continue;
            seen[id] = true;
            out.push(id);
        }
        return out;
    }

    function buildCompOverviewMessageHtml(compChangedIdsInTask, taskPeopleIds) {
        var all = getAllEmployees();
        function findEmp(id) { return all.find(function(e) { return e.id === id; }); }

        var uniqTaskPeopleIds = [];
        var seenTask = {};
        for (var i = 0; i < (taskPeopleIds || []).length; i++) {
            var id = taskPeopleIds[i];
            if (seenTask[id]) continue;
            seenTask[id] = true;
            uniqTaskPeopleIds.push(id);
        }

        var uniqCompChangedIds = [];
        var seenComp = {};
        for (var j = 0; j < (compChangedIdsInTask || []).length; j++) {
            var cid = compChangedIdsInTask[j];
            if (seenComp[cid]) continue;
            seenComp[cid] = true;
            uniqCompChangedIds.push(cid);
        }

        var total = uniqTaskPeopleIds.length || 1;
        var changedCount = uniqCompChangedIds.length || 0;
        var unchangedCount = total - changedCount;

        var sumDelta = 0;
        var sumRate = 0;
        var anomalyCount = 0;

        var rows = uniqTaskPeopleIds.map(function(id) {
            var emp = findEmp(id);
            var name = emp ? emp.name : String(id);
            var rate = emp ? Number(emp.adjustment || 0) : 0;
            var delta = emp ? Math.round(emp.salary * rate / 100) : 0;

            sumDelta += delta;
            sumRate += rate;

            var anomalies = (typeof getAnomalies === 'function' && emp) ? getAnomalies(emp) : [];
            var isAbnormal = anomalies && anomalies.length > 0;
            if (isAbnormal) anomalyCount += 1;

            return {
                id: id,
                name: name,
                rate: rate,
                delta: delta,
                abnormal: isAbnormal,
                anomalies: anomalies || []
            };
        });

        var denom = changedCount || 1;
        var avgDelta = Math.round(sumDelta / denom);
        var avgRate = sumRate / denom;

        var adjustedDeg = (changedCount / total) * 360;
        var compPieBg = 'conic-gradient(#2563eb 0deg ' + adjustedDeg.toFixed(2) + 'deg, #cbd5e1 ' + adjustedDeg.toFixed(2) + 'deg 360deg)';

        function renderCompRowHtml(r) {
            var deltaText = (r.delta >= 0 ? '+' : '') + r.delta.toLocaleString();
            var rateText = (r.rate >= 0 ? '+' : '') + Number(r.rate).toFixed(1) + '%';
            var cls = r.abnormal ? 'bot-comp-tr abnormal' : 'bot-comp-tr';
            var abnormalTag = r.abnormal ? '<span class="bot-comp-abnormal-tag">⚠️ 异常</span>' : '';
            var tip = r.abnormal ? escapeHtml(r.anomalies.join('；')) : '';
            return '<tr class="' + cls + '"' + (r.abnormal ? (' title="' + tip + '"') : '') + '>' +
                '<td class="bot-comp-td-name">' + escapeHtml(r.name) + '</td>' +
                '<td class="bot-comp-td-delta">' + deltaText + '</td>' +
                '<td class="bot-comp-td-rate">' + rateText + '</td>' +
                '<td class="bot-comp-td-abnormal">' + abnormalTag + '</td>' +
                '</tr>';
        }

        var adjustedRows = rows.filter(function(r) { return r.delta !== 0; });
        var zeroDeltaRows = rows.filter(function(r) { return r.delta === 0; });

        var tableRowsHtml = adjustedRows.map(renderCompRowHtml).join('');

        if (zeroDeltaRows.length) {
            var zeroRowsHtml = zeroDeltaRows.map(renderCompRowHtml).join('');
            tableRowsHtml += '<tr class="bot-comp-unchanged-group">' +
                '<td colspan="4">' +
                '<details class="bot-comp-details">' +
                '<summary>调薪额为 0 的人员（' + zeroDeltaRows.length + '）</summary>' +
                '<div class="bot-comp-details-inner">' +
                '<table class="bot-comp-subtable">' +
                '<tbody>' + zeroRowsHtml + '</tbody>' +
                '</table>' +
                '</div>' +
                '</details>' +
                '</td>' +
                '</tr>';
        }

        return '<div class="bot-comp-overview-wrap">' +
            '<div class="bot-comp-overview-title">薪酬填报步骤已完成，以下是薪酬概览</div>' +
            '<div class="bot-comp-metrics">' +
            '<div class="bot-comp-metric"><div class="bot-comp-metric-label">本组薪酬调整平均值</div><div class="bot-comp-metric-value">' + (avgDelta >= 0 ? '+' : '') + avgDelta.toLocaleString() + ' 元</div></div>' +
            '<div class="bot-comp-metric"><div class="bot-comp-metric-label">平均涨幅</div><div class="bot-comp-metric-value">' + (avgRate >= 0 ? '+' : '') + avgRate.toFixed(1) + '%</div></div>' +
            '</div>' +
            '<div class="bot-comp-pie-row">' +
            '<div class="bot-comp-pie" style="background:' + compPieBg + ';"><div class="bot-comp-pie-inner">' + changedCount + '/' + total + '</div></div>' +
            '<div class="bot-comp-legend">' +
            '<div class="bot-comp-legend-item"><span class="bot-comp-legend-dot adjusted"></span>已调整：' + changedCount + '</div>' +
            '<div class="bot-comp-legend-item"><span class="bot-comp-legend-dot unchanged"></span>未调整：' + unchangedCount + '</div>' +
            '<div class="bot-comp-legend-item"><span class="bot-comp-legend-dot abnormal"></span>异常人数：' + anomalyCount + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="bot-comp-summary">' +
            '<div class="bot-comp-summary-title">本期调薪总结</div>' +
            '<div class="bot-comp-summary-body">' +
            '调整人数：' + changedCount + '（未调整：' + unchangedCount + '），本组薪酬调整平均值：' + (avgDelta >= 0 ? '+' : '') + avgDelta.toLocaleString() + ' 元，平均涨幅：' + (avgRate >= 0 ? '+' : '') + avgRate.toFixed(1) + '%，异常人数：' + anomalyCount + '。' +
            '</div>' +
            '</div>' +
            '<div class="bot-comp-table-wrap">' +
            '<div class="bot-comp-table-title">本期个人调薪明细</div>' +
            '<table class="bot-comp-table">' +
            '<thead><tr><th>姓名</th><th>调整额</th><th>调整幅度</th><th>异常</th></tr></thead>' +
            '<tbody>' + tableRowsHtml + '</tbody>' +
            '</table>' +
            '</div>' +
            '</div>';
    }

    // 只保留绩效填报和薪酬填报两个节点
    var FLOW_TEMPLATE = [
        { id: 'perf', title: '绩效填报', required: true, skippable: false },
        { id: 'comp', title: '薪酬填报', required: true, skippable: false }
    ];

    function cloneFlowSteps() {
        return FLOW_TEMPLATE.map(function(s) {
            return {
                id: s.id,
                title: s.title,
                required: !!s.required,
                skippable: !!s.skippable,
                removable: !!s.removable,
                done: false,
                skipped: false,
                removed: false
            };
        });
    }

    function getStepById(steps, stepId) {
        return steps.find(function(s) { return s.id === stepId; });
    }

    function OrchestratorAgent() {
        this.botState = createInitialBotState();
        this.stateAgent = new StateAgent(this);
        this.flowSteps = cloneFlowSteps();
        this.flowConfig = { label: '' };
        this._autoPerfMarked = false;
        this._autoCompMarked = false;
        this._perfTableActive = false;
        this._compTableActive = false;
        // 绩效填报：已保存的员工ID集合（用于进度记录去重）
        this._perfSavedIds = {};
        // 绩效填报：是否已提示"全部完成"
        this._perfAllDoneNotified = false;
        // 薪酬填报：是否已进入
        this._compEnteredNotified = false;
    }

    OrchestratorAgent.prototype.startForTask = function(task) {
        if (!task || task.id !== 'fill1') return;
        this.botState = createInitialBotState();
        this.botState.phase = BOT_PHASES.IN_PROGRESS_PERF;
        this.botState.taskId = task.id;
        this.botState.peopleIds = (task.peopleIds || []).slice();
        this.flowSteps = cloneFlowSteps();
        this._autoPerfMarked = false;
        this._autoCompMarked = false;
        this._perfTableActive = false;
        this._compTableActive = false;
        this._perfSavedIds = {};
        this._perfAllDoneNotified = false;
        this._compEnteredNotified = false;

        // 清空进度记录
        uiRenderAgent.clearTaskProgressLog();

        // Demo：清空上一轮绩效保存记录
        if (typeof perfFilledIds !== 'undefined' && perfFilledIds && typeof perfFilledIds.clear === 'function') {
            perfFilledIds.clear();
        }
        // Demo：预置绩效填报3个员工的绩效结果
        presetPerfTagsForDemo(22, ['超出', '略低']); // 王二五
        presetPerfTagsForDemo(4, ['略超', '达到']);   // 孙七
        presetPerfTagsForDemo(6, ['超出', '超出']);   // 吴九

        uiRenderAgent.appendText('你好！已进入「2026年7月绩效+薪酬回顾」填报任务，本次需处理 3 人。流程已就绪，你可直接从当前可点击节点开始。', 'ai');
        this.refreshProgressCard();
        this.stateAgent.start();
    };

    OrchestratorAgent.prototype.stop = function() {
        this.stateAgent.stop();
        this.botState.phase = BOT_PHASES.IDLE;
        uiRenderAgent.renderTopLoadingCard();
    };

    OrchestratorAgent.prototype._getFirstUnfinishedRequiredIndex = function() {
        for (var i = 0; i < this.flowSteps.length; i++) {
            var s = this.flowSteps[i];
            if (s.removed) continue;
            if (!s.required) continue;
            if (!s.done) return i;
        }
        return this.flowSteps.length - 1;
    };

    OrchestratorAgent.prototype._isClickableIndex = function(idx) {
        var blocker = this._getFirstUnfinishedRequiredIndex();
        return idx <= blocker;
    };

    // 获取绩效填报的3个员工的绩效结果标签（用于进度记录）
    OrchestratorAgent.prototype._getPerfResultLabel = function(empId) {
        var emp = getAllEmployees().find(function(e) { return e.id === empId; });
        if (!emp || !emp.performanceTags || !emp.performanceTags.length) return '已填报';
        // 取第一个tag的文字作为结果
        var t = emp.performanceTags[0] ? emp.performanceTags[0].text : '';
        return perfTextToLevelLabel(t) || '已填报';
    };

    OrchestratorAgent.prototype._syncAutoCompletion = function() {
        var self = this;
        var perf = getStepById(this.flowSteps, 'perf');
        var comp = getStepById(this.flowSteps, 'comp');

        // 绩效填报：监听3个员工的保存情况
        var perfDemoIds = PERF_DEMO_IDS;
        var perfIdsInTask = getPerfFilledIdsInTask(perfDemoIds);

        // 每当有新员工绩效被保存，追加进度记录
        for (var i = 0; i < perfIdsInTask.length; i++) {
            var savedId = perfIdsInTask[i];
            if (!self._perfSavedIds[savedId]) {
                self._perfSavedIds[savedId] = true;
                var emp = getAllEmployees().find(function(e) { return e.id === savedId; });
                var empName = emp ? emp.name : String(savedId);
                var resultLabel = self._getPerfResultLabel(savedId);
                uiRenderAgent.addTaskProgressLog('✅已保存' + empName + '的绩效结果：' + resultLabel + '；');
            }
        }

        // 3个员工全部填完后提示
        if (!self._perfAllDoneNotified && perfIdsInTask.length >= perfDemoIds.length) {
            self._perfAllDoneNotified = true;
            uiRenderAgent.addTaskProgressLog('🎉 绩效填写全部完成');
            if (perf && !perf.done) {
                perf.done = true;
                self.botState.taskProgress.perfConfirmed = true;
                self.botState.phase = BOT_PHASES.IN_PROGRESS_COMP;
                if (!self._autoPerfMarked) {
                    self._autoPerfMarked = true;
                    uiRenderAgent.appendText(buildPerfOverviewMessageHtml(perfIdsInTask), 'ai');
                }
            }
        }

        // 薪酬填报完成条件：至少调整了一次员工的薪酬表单（调整幅度非 0）
        if (comp && !comp.done) {
            var changedIdsInTask = getCompChangedIdsInTask(this.botState.peopleIds || []);
            var hasCompOne = changedIdsInTask.length >= 1;
            if (hasCompOne) {
                comp.done = true;
                this.botState.taskProgress.compConfirmed = true;
                if (!this._autoCompMarked) {
                    this._autoCompMarked = true;
                    uiRenderAgent.appendText(buildCompOverviewMessageHtml(changedIdsInTask, this.botState.peopleIds || []), 'ai');
                }
            }
        }

        // 实时刷新状态表格
        if (this._perfTableActive) {
            uiRenderAgent.refreshPerfStatusTable(perfDemoIds);
        }
        if (this._compTableActive) {
            uiRenderAgent.refreshCompStatusTable(this.botState.peopleIds || []);
        }
    };

    OrchestratorAgent.prototype._autoSkipOptionalBefore = function(targetStepIdx) {
        for (var i = 0; i < targetStepIdx; i++) {
            var s = this.flowSteps[i];
            if (s.removed) continue;
            if (s.required) continue;
            if (!s.skippable) continue;
            if (s.done || s.skipped) continue;
            s.skipped = true;
        }
    };

    OrchestratorAgent.prototype._buildFlowView = function() {
        var self = this;
        var blocker = this._getFirstUnfinishedRequiredIndex();
        return {
            label: this.flowConfig.label,
            steps: this.flowSteps.filter(function(s) { return !s.removed; }).map(function(s, idx, arr) {
                var originalIdx = self.flowSteps.indexOf(s);
                var clickable = self._isClickableIndex(originalIdx);
                var done = !!(s.done || s.skipped);
                var active = !done && originalIdx === blocker;
                return {
                    id: s.id,
                    title: s.title,
                    required: s.required,
                    skippable: s.skippable,
                    removable: s.removable,
                    done: done,
                    skipped: !!s.skipped,
                    active: active,
                    clickable: clickable
                };
            })
        };
    };

    OrchestratorAgent.prototype.refreshProgressCard = function() {
        var self = this;
        this._syncAutoCompletion();
        uiRenderAgent.upsertProgressCard(this.botState, this._buildFlowView(), {
            onFlowClick: function(action) {
                var step = getStepById(self.flowSteps, action);
                if (!step) return;
                var stepIdx = self.flowSteps.indexOf(step);
                if (!self._isClickableIndex(stepIdx)) {
                    uiRenderAgent.appendText('当前步骤尚未解锁，请先完成前置不可跳过步骤。', 'ai');
                    return;
                }

                self._autoSkipOptionalBefore(stepIdx);

                var flowBtnLabels = { perf: '绩效填报', comp: '薪酬填报' };
                var userName = (BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我';
                uiRenderAgent.appendUserChoice(userName, flowBtnLabels[action] || action);

                if (action === 'perf') {
                    // 绩效填报：右侧筛选出3个需要绩效填报的员工，打开第一个
                    var perfPeople = getPeopleByIds(PERF_DEMO_IDS);
                    if (perfPeople.length > 0) {
                        actionAgent.openPersonById(perfPeople[0].id, 'performance');
                    }
                    // 如果有 enterActiveTask，筛选出这3个人
                    if (typeof enterActiveTask === 'function' && window.activeTask) {
                        // 更新 activeTask 的 peopleIds 为绩效填报的3个人
                        window.activeTask.peopleIds = PERF_DEMO_IDS.slice();
                        if (typeof renderScatterView === 'function' && window.currentView === 'scatter') renderScatterView();
                        if (typeof renderTableView === 'function' && window.currentView === 'table') renderTableView();
                        if (typeof renderGridView === 'function' && window.currentView === 'grid') renderGridView();
                    }
                    uiRenderAgent.appendText('已为你打开绩效填报表单，请依次填写以下 3 位员工的绩效并保存：', 'ai');
                    self._perfTableActive = true;
                    uiRenderAgent.appendPerfStatusTable(PERF_DEMO_IDS);
                    return;
                }

                if (action === 'comp') {
                    // 进入薪酬填报：追加进度记录
                    if (!self._compEnteredNotified) {
                        self._compEnteredNotified = true;
                        uiRenderAgent.addTaskProgressLog('📋 进入薪酬填报任务');
                    }
                    // 出现 AI辅助调薪 / 手动调整 两个按钮
                    uiRenderAgent.appendCompModeCard(
                        function onAiAssist() {
                            // AI辅助调薪：Bot对话告知用户
                            uiRenderAgent.appendText(
                                '请描述你的调薪规则，AI 将根据规则为团队成员预填薪酬。<br><br>' +
                                '你可以告诉我：<br>' +
                                '· 绩效与涨幅的对应关系（如：上期绩效为"超出预期"的涨 12%）<br>' +
                                '· 特殊条件（如：试用期员工不参与调薪，上期涨了薪酬的员工不参与调薪）<br>' +
                                '· 上限限制（如：单人涨幅不超过 12%，或不超过薪酬带宽上限）',
                                'ai'
                            );
                        },
                        function onManual() {
                            // 手动调整：正常打开右侧薪酬人员详情
                            var highestComp = getHighestSalaryPerson(getPeopleByIds(self.botState.peopleIds));
                            if (highestComp) actionAgent.openPersonById(highestComp.id, 'salary');
                            uiRenderAgent.appendText('已为您打开薪酬回顾页，也可以回到宽表、或打开白板视图拖拽调整', 'ai');
                            self._compTableActive = true;
                            uiRenderAgent.appendCompStatusTable(self.botState.peopleIds || []);
                            uiRenderAgent.appendCompAiActions(self);
                        }
                    );
                    return;
                }
            },
            onFlowRemove: function(action) {
                var step = getStepById(self.flowSteps, action);
                if (!step || !step.removable) return;
                var userName = (BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我';
                uiRenderAgent.appendUserChoice(userName, '删除步骤：' + step.title);
                step.removed = true;
                self.refreshProgressCard();
            }
        });
    };

    OrchestratorAgent.prototype.getCompChangedIds = function() {
        return getCompChangedIdsInTask(this.botState.peopleIds || []);
    };

    OrchestratorAgent.prototype.buildFlowConfig = function() {
        return { label: '固定流程（可跳过节点已标注）' };
    };

    OrchestratorAgent.prototype.dispatch = function(intent, payload) {
        var bs = this.botState;
        var people = getPeopleByIds(bs.peopleIds);
        switch (intent) {
            case BOT_INTENTS.GENERATE_SUMMARY:
                var taskPeopleIds = bs.peopleIds || [];
                var perfIdsInTask = getPerfFilledIdsInTask(PERF_DEMO_IDS);
                var compChangedIdsInTask = getCompChangedIdsInTask(taskPeopleIds);

                var html = '<div style="font-weight: 900; color: #0f172a; margin-bottom: 10px;">本期任务总结（调绩效 + 调薪）</div>';
                if (perfIdsInTask && perfIdsInTask.length) {
                    html += buildPerfOverviewMessageHtml(perfIdsInTask);
                } else {
                    html += '<div class="bot-mini-card" style="margin-bottom: 10px;"><strong>绩效填报</strong><br>尚未检测到绩效保存记录，请完成绩效填报后再生成任务总结。</div>';
                }
                if (compChangedIdsInTask && compChangedIdsInTask.length) {
                    html += buildCompOverviewMessageHtml(compChangedIdsInTask, taskPeopleIds);
                } else {
                    html += '<div class="bot-mini-card"><strong>薪酬填报</strong><br>尚未检测到薪酬调整记录，请完成薪酬填报后再生成任务总结。</div>';
                }

                uiRenderAgent.appendText(html, 'ai');
                return;
            case BOT_INTENTS.SUBMIT_PLAN:
                actionAgent.submitPlan();
                uiRenderAgent.appendText('方案已提交，本次任务结束。', 'ai');
                return;
            case BOT_INTENTS.QUERY_PROGRESS:
                uiRenderAgent.appendText('当前进度：绩效 ' + bs.taskProgress.perfDone.length + '/' + bs.peopleIds.length + '，薪酬 ' + bs.taskProgress.compDone.length + '/' + bs.peopleIds.length + '。', 'ai');
                return;
            case BOT_INTENTS.JUMP_TO_PERSON:
                var target = people.find(function(p) { return p.name.indexOf((payload && payload.name) || '') >= 0; });
                if (target) {
                    actionAgent.openPersonById(target.id, bs.phase === BOT_PHASES.IN_PROGRESS_COMP ? 'salary' : 'performance');
                    uiRenderAgent.appendText('已为你打开 ' + target.name + '。', 'ai');
                } else {
                    uiRenderAgent.appendText('没找到对应人员，请检查姓名后重试，或在画布上点击人员卡片。', 'ai');
                }
                return;
            case BOT_INTENTS.QUERY_PERSON:
                var person = people.find(function(p) { return p.name.indexOf((payload && payload.name) || '') >= 0; });
                if (!person) {
                    uiRenderAgent.appendText('请告诉我具体姓名，我来帮你查状态。', 'ai');
                    return;
                }
                var perfDone = bs.taskProgress.perfDone.indexOf(person.id) >= 0 ? '已完成' : '未完成';
                var compDone = bs.taskProgress.compDone.indexOf(person.id) >= 0 ? '已填写' : '未填写';
                uiRenderAgent.appendText(person.name + '：绩效' + perfDone + '，薪酬' + compDone + '。', 'ai');
                return;
            case BOT_INTENTS.PAUSE:
                uiRenderAgent.appendText('好的，随时回来继续。', 'ai');
                return;
            default:
                return;
            }
    };

    window.OrchestratorAgent = OrchestratorAgent;
})();
