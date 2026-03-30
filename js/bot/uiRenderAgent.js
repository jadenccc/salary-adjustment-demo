/* === uiRenderAgent.js === Bot UI 渲染 */
(function() {
    function mk(tag, cls, html) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (html != null) el.innerHTML = html;
        return el;
    }

    function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function bubble(content, from) {
        var msg = mk('div', 'ai-msg from-' + (from || 'ai'));
        msg.appendChild(mk('div', 'ai-msg-avatar', from === 'user' ? '👤' : '🤖'));
        msg.appendChild(mk('div', 'ai-msg-bubble', content));
        return msg;
    }

    // 任务进度记录列表（全局，跨任务保留）
    var _taskProgressLog = [];

    var ui = {
        messageMap: {},
        getContainer: function() {
            return document.getElementById('meetingLeftMessages');
        },
        scrollBottom: function() {
            var c = this.getContainer();
            if (c) c.scrollTop = c.scrollHeight;
        },
        appendText: function(text, from) {
            var c = this.getContainer();
            if (!c) return;
            c.appendChild(bubble(String(text || '').replace(/\n/g, '<br>'), from || 'ai'));
            this.scrollBottom();
        },
        appendUserChoice: function(displayName, choiceText) {
            var c = this.getContainer();
            if (!c) return;
            var name = displayName || ((window.BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我');
            var html = '<div class="bot-user-utterance">' +
                '<div class="bot-user-name">' + escapeHtml(name) + '</div>' +
                '<div class="bot-user-choice-text">' + escapeHtml(choiceText || '') + '</div>' +
                '</div>';
            c.appendChild(bubble(html, 'user'));
            this.scrollBottom();
        },
        appendOptionCard: function(question, onChoose) {
            var self = this;
            var c = this.getContainer();
            if (!c) return;
            var root = bubble('<div class="bot-option-title">' + question.text + '</div>', 'ai');
            var box = mk('div', 'bot-option-list');
            question.options.forEach(function(op) {
                var btn = mk('button', 'bot-option-btn', op.label);
                btn.type = 'button';
                btn.addEventListener('click', function() {
                    self.appendUserChoice(
                        (window.BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我',
                        op.label
                    );
                    onChoose(op);
                    box.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
                });
                box.appendChild(btn);
            });
            root.querySelector('.ai-msg-bubble').appendChild(box);
            c.appendChild(root);
            this.scrollBottom();
        },
        appendHistoryCard: function(history) {
            this.appendText('已为你调取历史记录：<div class="bot-mini-card"><strong>' + history.title + '</strong><br>调整人数：' + history.adjusted + '<br>平均涨幅：' + history.avg + '<br>预算：' + history.budget + '</div>', 'ai');
        },
        getTopHost: function() {
            return document.getElementById('aiTopProgressHost');
        },

        // ── 追加任务进度记录 ──
        addTaskProgressLog: function(text) {
            _taskProgressLog.push(text);
            this._renderTaskProgressLog();
        },
        // 清空进度记录（重置任务时调用）
        clearTaskProgressLog: function() {
            _taskProgressLog = [];
            // 直接清空 DOM，不走增量渲染
            var el = document.getElementById('botTaskProgressLog');
            if (el) el.innerHTML = '';
        },
        _renderTaskProgressLog: function() {
            var el = document.getElementById('botTaskProgressLog');
            if (!el) return;
            var logs = _taskProgressLog;
            // 用 data-log-index 标记已渲染的条目，避免重复渲染导致闪烁
            // 找出已渲染的最大 index（-1 表示 DOM 中没有任何已标记条目）
            var renderedMax = -1;
            var children = el.children;
            for (var j = 0; j < children.length; j++) {
                var idx = parseInt(children[j].getAttribute('data-log-index'), 10);
                if (!isNaN(idx) && idx > renderedMax) renderedMax = idx;
            }
            // DOM 重建后 el 为空但 _taskProgressLog 有历史记录：恢复时不加动画
            // 只有在已有渲染基础上追加的才是真正新条目，加动画
            var isDomRebuild = (renderedMax === -1 && logs.length > 0);
            for (var i = renderedMax + 1; i < logs.length; i++) {
                var item = document.createElement('div');
                // DOM 重建恢复历史：无动画；真正新增条目：有动画
                var withAnim = !isDomRebuild;
                item.className = 'bot-task-log-item' + (withAnim ? ' bot-task-log-item-new' : '');
                item.setAttribute('data-log-index', i);
                item.textContent = logs[i];
                el.appendChild(item);
            }
            // 滚动到底部
            el.scrollTop = el.scrollHeight;
        },

        // ── 渲染顶部卡片：只有任务流程 + 进度记录区域 ──
        renderTopLoadingCard: function() {
            var host = this.getTopHost();
            if (!host) return;
            host.innerHTML = '<div class="bot-top-card">' +
                '<div class="bot-flow-title">任务流程</div>' +
                '<div class="bot-top-muted">未进入填报任务</div>' +
                '<div class="bot-task-log-wrap"><div class="bot-task-log" id="botTaskProgressLog"></div></div>' +
                '</div>';
            this._renderTaskProgressLog();
        },

        renderTopFlowAndProgress: function(state, flowConfig, handlers) {
            var host = this.getTopHost();
            if (!host) return;
            var fc = flowConfig || {};
            var steps = fc.steps || [];
            var parts = [];
            steps.forEach(function(step, idx) {
                var cls = ['bot-flow-node'];
                if (step.required === false) cls.push('optional');
                if (step.done) cls.push('done');
                if (step.active) cls.push('active');
                if (!step.clickable) cls.push('locked');
                parts.push('<div class="bot-flow-step-wrap">' +
                    '<button type="button" class="' + cls.join(' ') + '" data-action="' + step.id + '"' + (step.clickable ? '' : ' disabled') + '>' +
                    (step.done ? '✔ ' : '') + step.title +
                    '</button>' +
                    ((step.removable && !step.done && step.clickable) ? '<span class="bot-flow-close" title="删除步骤" role="button" tabindex="0" data-remove="' + step.id + '">×</span>' : '') +
                    '</div>');
                if (idx < steps.length - 1) parts.push('<span class="bot-flow-arrow">→</span>');
            });
            var flowHtml = '<div class="bot-flow-wrap">' + parts.join('') + '</div>';
            host.innerHTML = '<div class="bot-top-card">' +
                '<div class="bot-flow-title">任务流程</div>' +
                flowHtml +
                '<div class="bot-task-log-wrap"><div class="bot-task-log" id="botTaskProgressLog"></div></div>' +
                '</div>';
            // 重新渲染进度记录
            this._renderTaskProgressLog();

            host.querySelectorAll('.bot-flow-node').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var act = btn.getAttribute('data-action');
                    if (handlers && handlers.onFlowClick) handlers.onFlowClick(act);
                });
            });
            host.querySelectorAll('[data-remove]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (handlers && handlers.onFlowRemove) handlers.onFlowRemove(btn.getAttribute('data-remove'));
                });
                btn.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (handlers && handlers.onFlowRemove) handlers.onFlowRemove(btn.getAttribute('data-remove'));
                    }
                });
            });
        },

        // 兼容旧调用
        renderTopProgressAndFlowPlaceholder: function(state) {
            this.renderTopLoadingCard();
        },

        upsertProgressCard: function(state, flowConfig, handlers) {
            this.renderTopFlowAndProgress(state, flowConfig, handlers);
        },

        showPerfConfirmCard: function(summaryHtml, onConfirm, onEdit) {
            this.removeByKey('bot_confirm_card');
            var c = this.getContainer();
            var msg = bubble('<div class="bot-confirm-card"><div class="title">绩效评定待确认</div>' + summaryHtml + '</div>', 'ai');
            var ops = mk('div', 'bot-confirm-actions');
            var yes = mk('button', 'bot-option-btn', '完成并保存');
            var no = mk('button', 'bot-option-btn ghost', '我还要改');
            yes.onclick = onConfirm;
            no.onclick = onEdit;
            ops.appendChild(yes); ops.appendChild(no);
            msg.querySelector('.ai-msg-bubble').appendChild(ops);
            c.appendChild(msg);
            this.messageMap.bot_confirm_card = msg;
            this.scrollBottom();
        },
        showCompConfirmCard: function(summaryHtml, onConfirm, onEdit) {
            this.removeByKey('bot_confirm_card');
            var c = this.getContainer();
            var msg = bubble('<div class="bot-confirm-card"><div class="title">薪酬方案待确认</div>' + summaryHtml + '</div>', 'ai');
            var ops = mk('div', 'bot-confirm-actions');
            var yes = mk('button', 'bot-option-btn', '确认薪酬方案');
            var no = mk('button', 'bot-option-btn ghost', '我还要改');
            yes.onclick = onConfirm;
            no.onclick = onEdit;
            ops.appendChild(yes); ops.appendChild(no);
            msg.querySelector('.ai-msg-bubble').appendChild(ops);
            c.appendChild(msg);
            this.messageMap.bot_confirm_card = msg;
            this.scrollBottom();
        },
        removeByKey: function(key) {
            var n = this.messageMap[key];
            if (n && n.remove) n.remove();
            delete this.messageMap[key];
        },
        setCompSubmitVisible: function(show, onClick) {
            var host = document.getElementById('aiBotCompSubmitWrap');
            if (!host) return;
            host.innerHTML = '';
            if (!show) return;
            var btn = mk('button', 'bot-comp-submit-btn', '完成薪酬填报');
            btn.type = 'button';
            btn.onclick = onClick;
            host.appendChild(btn);
        },
        renderDoneTail: function(onSummary, onSubmit) {
            var tail = document.getElementById('botProgressTail');
            if (!tail) return;
            tail.innerHTML = '<div class="bot-done-line">2026年7月绩效+薪酬回顾已确认，可选择生成任务总结或结束本次任务</div>';
            var ops = mk('div', 'bot-confirm-actions');
            var a = mk('button', 'bot-option-btn', '生成任务总结');
            var b = mk('button', 'bot-option-btn', '提交方案');
            a.onclick = onSummary; b.onclick = onSubmit;
            tail.appendChild(ops); ops.appendChild(a); ops.appendChild(b);
        },
        appendPerfStatusTable: function(taskPeopleIds) {
            var c = this.getContainer();
            if (!c) return;
            var tableId = 'botPerfStatusTable';
            // 避免重复插入
            if (document.getElementById(tableId)) return;
            var html = '<div class="bot-status-table-wrap" id="' + tableId + '">' +
                this._buildPerfStatusTableHtml(taskPeopleIds) +
                '</div>';
            var msg = bubble(html, 'ai');
            msg.setAttribute('data-bot-perf-table', '1');
            c.appendChild(msg);
            // 事件委托：点击行打开对应员工绩效详情
            var wrap = document.getElementById(tableId);
            if (wrap) {
                wrap.addEventListener('click', function(e) {
                    var tr = e.target.closest('tr[data-emp-id]');
                    if (!tr) return;
                    var empId = Number(tr.getAttribute('data-emp-id'));
                    if (empId && window.actionAgent && typeof window.actionAgent.openPersonById === 'function') {
                        window.actionAgent.openPersonById(empId, 'performance');
                    }
                });
            }
            this.scrollBottom();
        },
        _buildPerfStatusTableHtml: function(taskPeopleIds) {
            var allEmps = (typeof employees !== 'undefined') ? employees : (window.employees || []);
            var perfSet = (typeof perfFilledIds !== 'undefined' && perfFilledIds) ? perfFilledIds : new Set();
            var rows = '';
            var uniq = [];
            var seen = {};
            for (var i = 0; i < (taskPeopleIds || []).length; i++) {
                var id = taskPeopleIds[i];
                if (seen[id]) continue;
                seen[id] = true;
                uniq.push(id);
            }
            uniq.forEach(function(id) {
                var emp = allEmps.find(function(e) { return e.id === id; });
                var name = emp ? escapeHtml(emp.name) : String(id);
                var tagLabel = emp ? escapeHtml(emp.tier || '') : '';
                var done = perfSet.has(id);
                var statusCls = done ? 'bot-status-done' : 'bot-status-pending';
                var statusText = done ? '✔ 已完成' : '待填报';
                rows += '<tr class="bot-status-row" data-emp-id="' + id + '">' +
                    '<td class="bot-status-td-name">' + name + '</td>' +
                    '<td class="bot-status-td-tag"><span class="bot-status-tier-tag">' + tagLabel + '</span></td>' +
                    '<td class="bot-status-td-status"><span class="' + statusCls + '">' + statusText + '</span></td>' +
                    '</tr>';
            });
            return '<div class="bot-status-table-title">「绩效填报」实时进度</div>' +
                '<table class="bot-status-table">' +
                '<thead><tr><th>姓名</th><th>人员标签</th><th>完成状态</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
                '</table>';
        },
        refreshPerfStatusTable: function(taskPeopleIds) {
            var wrap = document.getElementById('botPerfStatusTable');
            if (!wrap) return;
            wrap.innerHTML = this._buildPerfStatusTableHtml(taskPeopleIds);
        },
        appendCompStatusTable: function(taskPeopleIds) {
            var c = this.getContainer();
            if (!c) return;
            var tableId = 'botCompStatusTable';
            if (document.getElementById(tableId)) return;
            var html = '<div class="bot-status-table-wrap" id="' + tableId + '">' +
                this._buildCompStatusTableHtml(taskPeopleIds) +
                '</div>';
            var msg = bubble(html, 'ai');
            msg.setAttribute('data-bot-comp-table', '1');
            c.appendChild(msg);
            // 事件委托：点击行打开对应员工薪酬详情
            var wrap = document.getElementById(tableId);
            if (wrap) {
                wrap.addEventListener('click', function(e) {
                    var tr = e.target.closest('tr[data-emp-id]');
                    if (!tr) return;
                    var empId = Number(tr.getAttribute('data-emp-id'));
                    if (empId && window.actionAgent && typeof window.actionAgent.openPersonById === 'function') {
                        window.actionAgent.openPersonById(empId, 'salary');
                    }
                });
            }
            this.scrollBottom();
        },
        _buildCompStatusTableHtml: function(taskPeopleIds) {
            var allEmps = (typeof employees !== 'undefined') ? employees : (window.employees || []);
            var rows = '';
            var uniq = [];
            var seen = {};
            for (var i = 0; i < (taskPeopleIds || []).length; i++) {
                var id = taskPeopleIds[i];
                if (seen[id]) continue;
                seen[id] = true;
                uniq.push(id);
            }
            uniq.forEach(function(id) {
                var emp = allEmps.find(function(e) { return e.id === id; });
                var name = emp ? escapeHtml(emp.name) : String(id);
                var tagLabel = emp ? escapeHtml(emp.tier || '') : '';
                var done = emp && Number(emp.adjustment || 0) !== 0;
                var statusCls = done ? 'bot-status-done' : 'bot-status-pending';
                var statusText = done ? '✔ 已调整' : '待填报';
                rows += '<tr class="bot-status-row" data-emp-id="' + id + '">' +
                    '<td class="bot-status-td-name">' + name + '</td>' +
                    '<td class="bot-status-td-tag"><span class="bot-status-tier-tag">' + tagLabel + '</span></td>' +
                    '<td class="bot-status-td-status"><span class="' + statusCls + '">' + statusText + '</span></td>' +
                    '</tr>';
            });
            return '<div class="bot-status-table-title">「薪酬填报」实时进度</div>' +
                '<table class="bot-status-table">' +
                '<thead><tr><th>姓名</th><th>人员标签</th><th>完成状态</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
                '</table>';
        },
        refreshCompStatusTable: function(taskPeopleIds) {
            var wrap = document.getElementById('botCompStatusTable');
            if (!wrap) return;
            wrap.innerHTML = this._buildCompStatusTableHtml(taskPeopleIds);
        },

        // ── 薪酬填报：AI辅助调薪 / 手动调整 选择卡片 ──
        appendCompModeCard: function(onAiAssist, onManual) {
            var self = this;
            var c = this.getContainer();
            if (!c) return;
            var root = bubble(
                '<div class="bot-option-title">请选择调薪方式：</div>',
                'ai'
            );
            var box = mk('div', 'bot-option-list');
            var actions = [
                { label: 'AI辅助调薪', key: 'ai' },
                { label: '手动调整', key: 'manual' }
            ];
            actions.forEach(function(act) {
                var btn = mk('button', 'bot-option-btn', act.label);
                btn.type = 'button';
                btn.addEventListener('click', function() {
                    var userName = (window.BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我';
                    self.appendUserChoice(userName, act.label);
                    box.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
                    if (act.key === 'ai') {
                        onAiAssist && onAiAssist();
                    } else {
                        onManual && onManual();
                    }
                });
                box.appendChild(btn);
            });
            root.querySelector('.ai-msg-bubble').appendChild(box);
            c.appendChild(root);
            this.scrollBottom();
        },

        appendCompAiActions: function(orchestrator) {
            var self = this;
            var c = this.getContainer();
            if (!c) return;
            var root = bubble(
                '<div class="bot-option-title">你还可以使用以下 AI 功能辅助调薪：</div>',
                'ai'
            );
            var box = mk('div', 'bot-option-list');
            var actions = [
                { label: 'AI 预调薪酬', key: 'ai_pre_adjust' },
                { label: '检查当前调薪结果', key: 'ai_check_result' },
                { label: '帮我生成调薪总结', key: 'ai_gen_summary' }
            ];
            actions.forEach(function(act) {
                var btn = mk('button', 'bot-option-btn', act.label);
                btn.type = 'button';
                btn.addEventListener('click', function() {
                    var userName = (window.BOT_MOCK && BOT_MOCK.displayUserName) ? BOT_MOCK.displayUserName : '我';
                    self.appendUserChoice(userName, act.label);
                    if (act.key === 'ai_pre_adjust') {
                        self.appendText(
                            '请描述你的调薪规则，AI 将根据规则为团队成员预填薪酬。<br><br>' +
                            '你可以告诉我：<br>' +
                            '· 绩效与涨幅的对应关系（如：上期绩效为"超出预期"的涨 12%）<br>' +
                            '· 特殊条件（如：试用期员工不参与调薪，上期涨了薪酬的员工不参与调薪）<br>' +
                            '· 上限限制（如：单人涨幅不超过 12%，或不超过薪酬带宽上限）',
                            'ai'
                        );
                    } else if (act.key === 'ai_check_result') {
                        if (orchestrator && typeof orchestrator.getCompChangedIds === 'function') {
                            var compChangedIds = orchestrator.getCompChangedIds();
                            if (compChangedIds.length) {
                                self.appendText('AI 检查完成：建议重点关注高涨幅人员与理由一致性。', 'ai');
                            } else {
                                self.appendText('当前尚未检测到薪酬调整记录，请先完成薪酬填报后再检查。', 'ai');
                            }
                        } else {
                            self.appendText('AI 检查完成：建议重点关注高涨幅人员与理由一致性。', 'ai');
                        }
                    } else if (act.key === 'ai_gen_summary') {
                        if (orchestrator && typeof orchestrator.dispatch === 'function') {
                            orchestrator.dispatch(BOT_INTENTS.GENERATE_SUMMARY);
                        } else {
                            self.appendText('调薪总结生成中，请稍候…', 'ai');
                        }
                    }
                });
                box.appendChild(btn);
            });
            root.querySelector('.ai-msg-bubble').appendChild(box);
            c.appendChild(root);
            this.scrollBottom();
        },
        appendSummaryCard: function(state, people) {
            var adjusted = people.filter(function(p) { return (p.adjustment || 0) !== 0; });
            var avg = adjusted.length ? (adjusted.reduce(function(s, p) { return s + (p.adjustment || 0); }, 0) / adjusted.length).toFixed(1) : '0.0';
            var html = '<div class="bot-mini-card"><strong>调薪摘要（Mock）</strong><br>' +
                '调整人数：' + adjusted.length + ' / ' + people.length + '<br>' +
                '绩效完成：' + state.taskProgress.perfDone.length + '<br>' +
                '平均涨幅：' + avg + '%<br>' +
                '预算增量：CNY 320,000</div>' +
                '<div class="bot-confirm-actions"><button class="bot-option-btn ghost" id="botCopySummaryBtn">复制文本</button></div>';
            this.appendText(html, 'ai');
            var btn = document.getElementById('botCopySummaryBtn');
            if (btn) btn.onclick = function() { if (navigator.clipboard) navigator.clipboard.writeText('Mock 调薪摘要'); };
        }
    };

    window.uiRenderAgent = ui;
})();
