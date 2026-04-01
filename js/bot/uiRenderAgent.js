/* === uiRenderAgent.js === Bot UI 渲染（消息气泡、进度卡片、状态表格、确认卡片） */
(function() {

    /* ── 内部 DOM 辅助 ── */

    /**
     * 创建一个 DOM 元素并设置 className 和 innerHTML。
     * @param {string} tag   - HTML 标签名
     * @param {string} [cls] - CSS 类名
     * @param {string} [html] - innerHTML 内容
     * @returns {HTMLElement}
     */
    function mk(tag, cls, html) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (html != null) el.innerHTML = html;
        return el;
    }

    /**
     * 将字符串中的 HTML 特殊字符转义，防止 XSS。
     * @param {*} s - 待转义的值
     * @returns {string}
     */
    function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    /**
     * 创建一条对话气泡消息节点（含头像 + 气泡）。
     * @param {string} content - 气泡内的 HTML 内容
     * @param {string} [from]  - 消息来源，'user' 或 'ai'（默认 'ai'）
     * @returns {HTMLElement}
     */
    function bubble(content, from) {
        var msg = mk('div', 'ai-msg from-' + (from || 'ai'));
        msg.appendChild(mk('div', 'ai-msg-avatar', from === 'user' ? '👤' : '🤖'));
        msg.appendChild(mk('div', 'ai-msg-bubble', content));
        return msg;
    }

    /* ── 任务进度记录（全局，跨任务保留） ── */

    /** @type {string[]} 任务进度日志条目列表 */
    var _taskProgressLog = [];

    /* ── ui 对象：对外暴露为 window.uiRenderAgent ── */

    var ui = {

        /** @type {Object.<string, HTMLElement>} 已渲染消息节点的 key→DOM 映射 */
        messageMap: {},

        /**
         * 获取消息列表容器元素。
         * @returns {HTMLElement|null}
         */
        getContainer: function() {
            return document.getElementById('meetingLeftMessages');
        },

        /**
         * 将消息列表滚动到底部。
         */
        scrollBottom: function() {
            var c = this.getContainer();
            if (c) c.scrollTop = c.scrollHeight;
        },

        /* ── 消息追加 ── */

        /**
         * 追加一条纯文本（或含 HTML）的对话气泡。
         * @param {string} text  - 消息内容（支持 HTML）
         * @param {string} [from] - 'user' 或 'ai'
         */
        appendText: function(text, from) {
            var c = this.getContainer();
            if (!c) return;
            c.appendChild(bubble(String(text || '').replace(/\n/g, '<br>'), from || 'ai'));
            this.scrollBottom();
        },

        /**
         * 追加一条用户选择气泡（显示用户名 + 选项文本）。
         * @param {string} displayName - 用户显示名
         * @param {string} choiceText  - 用户选择的文本
         */
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

        /**
         * 追加一张选项卡片（问题 + 多个按钮），用户点击后触发回调并禁用所有按钮。
         * @param {{ text: string, options: Array<{ label: string }> }} question - 问题对象
         * @param {function(option: Object): void} onChoose - 用户选择后的回调
         */
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

        /**
         * 追加一张历史记录卡片（展示上周期调薪摘要）。
         * @param {{ title: string, adjusted: number, avg: string, budget: string }} history
         */
        appendHistoryCard: function(history) {
            this.appendText(
                '已为你调取历史记录：' +
                '<div class="bot-mini-card">' +
                '<strong>' + history.title + '</strong><br>' +
                '调整人数：' + history.adjusted + '<br>' +
                '平均涨幅：' + history.avg + '<br>' +
                '预算：' + history.budget +
                '</div>',
                'ai'
            );
        },

        /**
         * 获取顶部进度卡片宿主元素。
         * @returns {HTMLElement|null}
         */
        getTopHost: function() {
            return document.getElementById('aiTopProgressHost');
        },

        /* ── 任务进度记录 ── */

        /**
         * 追加一条任务进度日志，并增量渲染到 DOM。
         * @param {string} text - 日志文本
         */
        addTaskProgressLog: function(text) {
            _taskProgressLog.push(text);
            this._renderTaskProgressLog();
        },

        /**
         * 清空任务进度日志（重置任务时调用）。
         */
        clearTaskProgressLog: function() {
            _taskProgressLog = [];
            var el = document.getElementById('botTaskProgressLog');
            if (el) el.innerHTML = '';
        },

        /**
         * 增量渲染任务进度日志到 #botTaskProgressLog 容器。
         * 使用 data-log-index 标记已渲染条目，避免重复渲染导致闪烁。
         * DOM 重建后恢复历史记录时不加动画；真正新增条目加入动画。
         */
        _renderTaskProgressLog: function() {
            var el = document.getElementById('botTaskProgressLog');
            if (!el) return;
            var logs = _taskProgressLog;

            // 找出已渲染的最大 index（-1 表示 DOM 中没有任何已标记条目）
            var renderedMax = -1;
            var children = el.children;
            for (var j = 0; j < children.length; j++) {
                var idx = parseInt(children[j].getAttribute('data-log-index'), 10);
                if (!isNaN(idx) && idx > renderedMax) renderedMax = idx;
            }

            // DOM 重建后 el 为空但 _taskProgressLog 有历史记录：恢复时不加动画
            var isDomRebuild = (renderedMax === -1 && logs.length > 0);
            for (var i = renderedMax + 1; i < logs.length; i++) {
                var item = document.createElement('div');
                var withAnim = !isDomRebuild;
                item.className = 'bot-task-log-item' + (withAnim ? ' bot-task-log-item-new' : '');
                item.setAttribute('data-log-index', i);
                item.textContent = logs[i];
                el.appendChild(item);
            }
            el.scrollTop = el.scrollHeight;
        },

        /* ── 顶部进度卡片渲染 ── */

        /**
         * 渲染顶部空白进度卡片（未进入任务时的占位状态）。
         * 同时恢复已有的进度日志记录。
         */
        renderTopLoadingCard: function() {
            var host = this.getTopHost();
            if (!host) return;
            host.innerHTML =
                '<div class="bot-top-card">' +
                    '<div class="bot-flow-title">任务流程</div>' +
                    '<div class="bot-top-muted">未进入填报任务</div>' +
                    '<div class="bot-task-log-wrap">' +
                        '<div class="bot-task-log" id="botTaskProgressLog"></div>' +
                    '</div>' +
                '</div>';
            this._renderTaskProgressLog();
        },

        /**
         * 渲染顶部任务流程节点 + 进度日志区域。
         * 绑定流程节点点击事件（onFlowClick）和删除事件（onFlowRemove）。
         * @param {Object} state      - Bot 状态对象
         * @param {{ label: string, steps: Array<Object> }} flowConfig - 流程配置
         * @param {{ onFlowClick?: function(string): void, onFlowRemove?: function(string): void }} [handlers] - 事件回调
         */
        renderTopFlowAndProgress: function(state, flowConfig, handlers) {
            var host = this.getTopHost();
            if (!host) return;
            var fc = flowConfig || {};
            var steps = fc.steps || [];
            var parts = [];
            steps.forEach(function(step, idx) {
                var cls = ['bot-flow-node'];
                if (step.required === false) cls.push('optional');
                if (step.done)              cls.push('done');
                if (step.active)            cls.push('active');
                if (!step.clickable)        cls.push('locked');
                parts.push(
                    '<div class="bot-flow-step-wrap">' +
                        '<button type="button" class="' + cls.join(' ') + '" data-action="' + step.id + '"' +
                            (step.clickable ? '' : ' disabled') + '>' +
                            (step.done ? '✔ ' : '') + step.title +
                        '</button>' +
                        (
                            (step.removable && !step.done && step.clickable)
                                ? '<span class="bot-flow-close" title="删除步骤" role="button" tabindex="0" data-remove="' + step.id + '">×</span>'
                                : ''
                        ) +
                    '</div>'
                );
                if (idx < steps.length - 1) parts.push('<span class="bot-flow-arrow">→</span>');
            });
            var flowHtml = '<div class="bot-flow-wrap">' + parts.join('') + '</div>';
            host.innerHTML =
                '<div class="bot-top-card">' +
                    '<div class="bot-flow-title">任务流程</div>' +
                    flowHtml +
                    '<div class="bot-task-log-wrap">' +
                        '<div class="bot-task-log" id="botTaskProgressLog"></div>' +
                    '</div>' +
                '</div>';

            // 重新渲染进度记录（innerHTML 重建后 DOM 节点已清空）
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

        /**
         * 兼容旧调用：渲染顶部占位卡片。
         * @deprecated 请使用 renderTopLoadingCard()
         * @param {Object} state - Bot 状态对象（未使用）
         */
        renderTopProgressAndFlowPlaceholder: function(state) {
            this.renderTopLoadingCard();
        },

        /**
         * 更新或插入顶部进度卡片（代理到 renderTopFlowAndProgress）。
         * @param {Object} state      - Bot 状态对象
         * @param {Object} flowConfig - 流程配置
         * @param {Object} [handlers] - 事件回调
         */
        upsertProgressCard: function(state, flowConfig, handlers) {
            this.renderTopFlowAndProgress(state, flowConfig, handlers);
        },

        /* ── 确认卡片 ── */

        /**
         * 显示绩效评定确认卡片（含"完成并保存"和"我还要改"按钮）。
         * @param {string}   summaryHtml - 绩效摘要 HTML
         * @param {function} onConfirm   - 确认回调
         * @param {function} onEdit      - 返回编辑回调
         */
        showPerfConfirmCard: function(summaryHtml, onConfirm, onEdit) {
            this.removeByKey('bot_confirm_card');
            var c = this.getContainer();
            var msg = bubble(
                '<div class="bot-confirm-card"><div class="title">绩效评定待确认</div>' + summaryHtml + '</div>',
                'ai'
            );
            var ops = mk('div', 'bot-confirm-actions');
            var yes = mk('button', 'bot-option-btn', '完成并保存');
            var no  = mk('button', 'bot-option-btn ghost', '我还要改');
            yes.onclick = onConfirm;
            no.onclick  = onEdit;
            ops.appendChild(yes);
            ops.appendChild(no);
            msg.querySelector('.ai-msg-bubble').appendChild(ops);
            c.appendChild(msg);
            this.messageMap.bot_confirm_card = msg;
            this.scrollBottom();
        },

        /**
         * 显示薪酬方案确认卡片（含"确认薪酬方案"和"我还要改"按钮）。
         * @param {string}   summaryHtml - 薪酬摘要 HTML
         * @param {function} onConfirm   - 确认回调
         * @param {function} onEdit      - 返回编辑回调
         */
        showCompConfirmCard: function(summaryHtml, onConfirm, onEdit) {
            this.removeByKey('bot_confirm_card');
            var c = this.getContainer();
            var msg = bubble(
                '<div class="bot-confirm-card"><div class="title">薪酬方案待确认</div>' + summaryHtml + '</div>',
                'ai'
            );
            var ops = mk('div', 'bot-confirm-actions');
            var yes = mk('button', 'bot-option-btn', '确认薪酬方案');
            var no  = mk('button', 'bot-option-btn ghost', '我还要改');
            yes.onclick = onConfirm;
            no.onclick  = onEdit;
            ops.appendChild(yes);
            ops.appendChild(no);
            msg.querySelector('.ai-msg-bubble').appendChild(ops);
            c.appendChild(msg);
            this.messageMap.bot_confirm_card = msg;
            this.scrollBottom();
        },

        /**
         * 通过 key 移除已注册的消息节点。
         * @param {string} key - messageMap 中的键名
         */
        removeByKey: function(key) {
            var n = this.messageMap[key];
            if (n && n.remove) n.remove();
            delete this.messageMap[key];
        },

        /**
         * 控制薪酬提交按钮的显示/隐藏。
         * @param {boolean}  show    - 是否显示
         * @param {function} onClick - 点击回调
         */
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

        /**
         * 渲染任务完成尾部操作区（生成任务总结 / 提交方案）。
         * @param {function} onSummary - 生成总结回调
         * @param {function} onSubmit  - 提交方案回调
         */
        renderDoneTail: function(onSummary, onSubmit) {
            var tail = document.getElementById('botProgressTail');
            if (!tail) return;
            tail.innerHTML = '<div class="bot-done-line">2026年7月绩效+薪酬回顾已确认，可选择生成任务总结或结束本次任务</div>';
            var ops = mk('div', 'bot-confirm-actions');
            var a = mk('button', 'bot-option-btn', '生成任务总结');
            var b = mk('button', 'bot-option-btn', '提交方案');
            a.onclick = onSummary;
            b.onclick = onSubmit;
            tail.appendChild(ops);
            ops.appendChild(a);
            ops.appendChild(b);
        },

        /* ── 绩效填报状态表格 ── */

        /**
         * 追加绩效填报实时进度表格到消息列表（每次任务只插入一次）。
         * 点击行可打开对应员工的绩效详情。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         */
        appendPerfStatusTable: function(taskPeopleIds) {
            var c = this.getContainer();
            if (!c) return;
            var tableId = 'botPerfStatusTable';
            if (document.getElementById(tableId)) return; // 避免重复插入
            var html =
                '<div class="bot-status-table-wrap" id="' + tableId + '">' +
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

        /**
         * 构建绩效填报状态表格的 HTML 字符串。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         * @returns {string}
         */
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
                var name       = emp ? escapeHtml(emp.name) : String(id);
                var tagLabel   = emp ? escapeHtml(emp.tier || '') : '';
                var done       = perfSet.has(id);
                var statusCls  = done ? 'bot-status-done' : 'bot-status-pending';
                var statusText = done ? '✔ 已完成' : '待填报';
                rows +=
                    '<tr class="bot-status-row" data-emp-id="' + id + '">' +
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

        /**
         * 刷新已存在的绩效填报状态表格内容。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         */
        refreshPerfStatusTable: function(taskPeopleIds) {
            var wrap = document.getElementById('botPerfStatusTable');
            if (!wrap) return;
            wrap.innerHTML = this._buildPerfStatusTableHtml(taskPeopleIds);
        },

        /* ── 薪酬填报状态表格 ── */

        /**
         * 追加薪酬填报实时进度表格到消息列表（每次任务只插入一次）。
         * 点击行可打开对应员工的薪酬详情。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         */
        appendCompStatusTable: function(taskPeopleIds) {
            var c = this.getContainer();
            if (!c) return;
            var tableId = 'botCompStatusTable';
            if (document.getElementById(tableId)) return; // 避免重复插入
            var html =
                '<div class="bot-status-table-wrap" id="' + tableId + '">' +
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

        /**
         * 构建薪酬填报状态表格的 HTML 字符串。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         * @returns {string}
         */
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
                var name       = emp ? escapeHtml(emp.name) : String(id);
                var tagLabel   = emp ? escapeHtml(emp.tier || '') : '';
                var done       = emp && Number(emp.adjustment || 0) !== 0;
                var statusCls  = done ? 'bot-status-done' : 'bot-status-pending';
                var statusText = done ? '✔ 已调整' : '待填报';
                rows +=
                    '<tr class="bot-status-row" data-emp-id="' + id + '">' +
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

        /**
         * 刷新已存在的薪酬填报状态表格内容。
         * @param {number[]} taskPeopleIds - 任务人员 ID 列表
         */
        refreshCompStatusTable: function(taskPeopleIds) {
            var wrap = document.getElementById('botCompStatusTable');
            if (!wrap) return;
            wrap.innerHTML = this._buildCompStatusTableHtml(taskPeopleIds);
        },

        /* ── 薪酬填报：调薪方式选择卡片 ── */

        /**
         * 追加调薪方式选择卡片（AI辅助调薪 / 手动调整）。
         * @param {function} onAiAssist - 选择"AI辅助调薪"的回调
         * @param {function} onManual   - 选择"手动调整"的回调
         */
        appendCompModeCard: function(onAiAssist, onManual) {
            var self = this;
            var c = this.getContainer();
            if (!c) return;
            var root = bubble('<div class="bot-option-title">请选择调薪方式：</div>', 'ai');
            var box = mk('div', 'bot-option-list');
            var actions = [
                { label: 'AI辅助调薪', key: 'ai' },
                { label: '手动调整',   key: 'manual' }
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

        /**
         * 追加 AI 辅助调薪功能操作卡片（AI预调薪酬 / 检查结果 / 生成总结）。
         * @param {Object} orchestrator - OrchestratorAgent 实例
         */
        appendCompAiActions: function(orchestrator) {
            var self = this;
            var c = this.getContainer();
            if (!c) return;
            var root = bubble('<div class="bot-option-title">你还可以使用以下 AI 功能辅助调薪：</div>', 'ai');
            var box = mk('div', 'bot-option-list');
            var actions = [
                { label: 'AI 预调薪酬',     key: 'ai_pre_adjust' },
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

        /* ── 调薪摘要卡片 ── */

        /**
         * 追加调薪摘要卡片（Mock 数据，含复制按钮）。
         * @param {Object}   state  - Bot 状态对象
         * @param {Object[]} people - 任务人员列表
         */
        appendSummaryCard: function(state, people) {
            var adjusted = people.filter(function(p) { return (p.adjustment || 0) !== 0; });
            var avg = adjusted.length
                ? (adjusted.reduce(function(s, p) { return s + (p.adjustment || 0); }, 0) / adjusted.length).toFixed(1)
                : '0.0';
            var html =
                '<div class="bot-mini-card">' +
                    '<strong>调薪摘要（Mock）</strong><br>' +
                    '调整人数：' + adjusted.length + ' / ' + people.length + '<br>' +
                    '绩效完成：' + state.taskProgress.perfDone.length + '<br>' +
                    '平均涨幅：' + avg + '%<br>' +
                    '预算增量：CNY 320,000' +
                '</div>' +
                '<div class="bot-confirm-actions">' +
                    '<button class="bot-option-btn ghost" id="botCopySummaryBtn">复制文本</button>' +
                '</div>';
            this.appendText(html, 'ai');
            var btn = document.getElementById('botCopySummaryBtn');
            if (btn) btn.onclick = function() {
                if (navigator.clipboard) navigator.clipboard.writeText('Mock 调薪摘要');
            };
        }
    };

    window.uiRenderAgent = ui;
})();
