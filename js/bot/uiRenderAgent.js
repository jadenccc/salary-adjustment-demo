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
        _progressSectionHtml: function(state) {
            var total = (state.peopleIds || []).length;
            var perfDone = state.taskProgress.perfDone.length;
            var compDone = state.taskProgress.compDone.length;
            return '<div class="title">📋 填报进度</div>' +
                '<div class="bot-top-summary">总进度：' + (perfDone + compDone) + '/' + (total * 2) + '&nbsp;|&nbsp;绩效 ' + perfDone + '/' + total + '&nbsp;|&nbsp;薪酬 ' + compDone + '/' + total + '</div>' +
                '<div class="bot-top-bars"><div class="bar"><span style="width:' + (total ? (perfDone / total * 100).toFixed(1) : 0) + '%"></span></div><div class="bar"><span style="width:' + (total ? (compDone / total * 100).toFixed(1) : 0) + '%"></span></div></div>';
        },
        renderTopLoadingCard: function() {
            var host = this.getTopHost();
            if (!host) return;
            host.innerHTML = '<div class="bot-top-card">' +
                '<div class="title">📋 填报进度</div>' +
                '<div class="bot-top-muted">未进入填报任务</div>' +
                '</div>';
        },
        renderTopProgressAndFlowPlaceholder: function(state) {
            var host = this.getTopHost();
            if (!host) return;
            host.innerHTML = '<div class="bot-top-card">' +
                this._progressSectionHtml(state) +
                '<div class="bot-flow-title">任务流程</div>' +
                '<div class="bot-top-flow-loading">' +
                '<span class="bot-top-loading-text">正在生成流程，请先完成上方问卷…</span>' +
                '<div class="bot-loading-dots"><span></span><span></span><span></span></div>' +
                '</div>' +
                '</div>';
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
                this._progressSectionHtml(state) +
                '<div class="bot-flow-title">任务流程</div>' +
                flowHtml +
                '<div class="bot-progress-tail" id="botProgressTail"></div>' +
                '</div>';
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
                        self.appendText('AI 正在根据绩效评定、职级和历史调薪记录为你预测合理调薪区间，请稍候…<br><div class="bot-mini-card"><strong>AI 预调薪酬建议（Mock）</strong><br>综合绩效分布与市场分位，建议本组平均涨幅控制在 6%～9% 区间，明星员工可适当上浮至 12%。</div>', 'ai');
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

