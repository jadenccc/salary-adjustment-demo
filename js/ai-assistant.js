/* === ai-assistant.js === Bot 外壳（接线层） */
var botOrchestrator = null;
var aiLeftPanelState = { collapsed: false, width: 380, minWidth: 380, resizing: false };

function initAIAssistant() {
    initAILeftPanelLayout();
    createAIInputArea();
    bindAIInputEvents();
    bindAIRecordButtonEvents();
    initBotRuntime();
}

function initBotRuntime() {
    botOrchestrator = new OrchestratorAgent();
    // 页面打开时 app.js 已经先进入 firstTask，这里兜底启动
    if (typeof activeTask !== 'undefined' && activeTask && activeTask.id === 'fill1') {
        botOrchestrator.startForTask(activeTask);
    }
    patchTaskHooksForBot();
}

function patchTaskHooksForBot() {
    if (window.__botHookedTaskFns) return;
    window.__botHookedTaskFns = true;
    var oldEnter = window.enterActiveTask;
    var oldExit = window.exitActiveTask;
    if (typeof oldEnter === 'function') {
        window.enterActiveTask = function(taskId) {
            oldEnter(taskId);
            if (botOrchestrator && typeof activeTask !== 'undefined' && activeTask && activeTask.id === 'fill1') {
                botOrchestrator.startForTask(activeTask);
            }
        };
    }
    if (typeof oldExit === 'function') {
        window.exitActiveTask = function() {
            oldExit();
            if (botOrchestrator) botOrchestrator.stop();
        };
    }
}

function createAIInputArea() {
    var container = document.getElementById('meetingLeftInput');
    if (!container || container.querySelector('.ai-dialog-input')) return;
    var inputWrap = document.createElement('div');
    inputWrap.className = 'ai-dialog-input';
    inputWrap.innerHTML = '<textarea class="ai-dialog-textarea" id="aiInput" placeholder="输入：还剩几个 / 去看李四 / 李四状态" rows="1"></textarea>' +
        '<button class="ai-dialog-send-btn" id="aiSendBtn" title="发送">➤</button>';
    container.appendChild(inputWrap);
    var compSubmitWrap = document.createElement('div');
    compSubmitWrap.className = 'ai-dialog-footer-actions';
    compSubmitWrap.id = 'aiBotCompSubmitWrap';
    container.appendChild(compSubmitWrap);
}

function bindAIInputEvents() {
    var sendBtn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiInput');
    if (sendBtn) sendBtn.addEventListener('click', onSendBotText);
    if (input) input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendBotText();
        }
    });
}

function onSendBotText() {
    var input = document.getElementById('aiInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    uiRenderAgent.appendText(text, 'user');
    input.value = '';
    var ret = recognizeBotIntent(text);
    if (!botOrchestrator) return;
    botOrchestrator.dispatch(ret.intent, ret);
}

function openAIDialog() {
    var panel = document.getElementById('aiLeftPanel');
    if (panel && panel.classList.contains('collapsed')) setAILeftPanelCollapsed(false);
}

function toggleAIDialog() {}
function closeAIDialog() {}

/* 左侧面板布局能力：收起/展开 + 拉宽/收窄 */
function initAILeftPanelLayout() {
    var panel = document.getElementById('aiLeftPanel');
    if (!panel) return;
    var collapseBtn = document.getElementById('aiLeftCollapseBtn');
    var expandBtn = document.getElementById('aiLeftExpandBtn');
    var resizer = document.getElementById('aiLeftResizer');
    var initialWidth = Math.round(panel.getBoundingClientRect().width) || 380;
    aiLeftPanelState.width = initialWidth;
    aiLeftPanelState.minWidth = initialWidth;
    setAILeftPanelWidth(initialWidth);
    if (collapseBtn) collapseBtn.onclick = function() { setAILeftPanelCollapsed(true); };
    if (expandBtn) expandBtn.onclick = function() { setAILeftPanelCollapsed(false); };
    if (resizer) resizer.addEventListener('mousedown', startAILeftResize);
}

function setAILeftPanelCollapsed(collapsed) {
    var panel = document.getElementById('aiLeftPanel');
    if (!panel) return;
    aiLeftPanelState.collapsed = !!collapsed;
    panel.classList.toggle('collapsed', aiLeftPanelState.collapsed);
}
function setAILeftPanelWidth(width) {
    var panel = document.getElementById('aiLeftPanel');
    if (!panel) return;
    var nextWidth = Math.max(aiLeftPanelState.minWidth, Math.round(width));
    aiLeftPanelState.width = nextWidth;
    panel.style.width = nextWidth + 'px';
    panel.style.minWidth = nextWidth + 'px';
}
function startAILeftResize(e) {
    if (e.button !== 0) return;
    var panel = document.getElementById('aiLeftPanel');
    if (!panel || aiLeftPanelState.collapsed) return;
    e.preventDefault();
    aiLeftPanelState.resizing = true;
    panel.classList.add('is-resizing');
    document.addEventListener('mousemove', onAILeftResizeMove);
    document.addEventListener('mouseup', stopAILeftResize);
}
function onAILeftResizeMove(e) {
    if (!aiLeftPanelState.resizing) return;
    var panel = document.getElementById('aiLeftPanel');
    if (!panel) return;
    var left = panel.getBoundingClientRect().left;
    var maxWidth = Math.max(aiLeftPanelState.minWidth, window.innerWidth - 260);
    setAILeftPanelWidth(Math.max(aiLeftPanelState.minWidth, Math.min(e.clientX - left, maxWidth)));
}
function stopAILeftResize() {
    if (!aiLeftPanelState.resizing) return;
    aiLeftPanelState.resizing = false;
    var panel = document.getElementById('aiLeftPanel');
    if (panel) panel.classList.remove('is-resizing');
    document.removeEventListener('mousemove', onAILeftResizeMove);
    document.removeEventListener('mouseup', stopAILeftResize);
}

/* 兼容旧调用 */
function appendAIMessage(from, content, isRawHtml) {
    if (!window.uiRenderAgent) return;
    if (isRawHtml) uiRenderAgent.appendText(content, from === 'user' ? 'user' : 'ai');
    else uiRenderAgent.appendText(String(content || '').replace(/\n/g, '<br>'), from === 'user' ? 'user' : 'ai');
}
function showAITyping() {}
function removeAITyping() {}

/* ── 打开/关闭对话框（已常驻左侧，保留接口兼容） ── */
function toggleAIDialog() { /* 左侧面板常驻，无需切换 */ }
function openAIDialog() {
    aiDialogOpen = true;
    var panel = document.getElementById('aiLeftPanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function closeAIDialog() { aiDialogOpen = false; }

/* ── 欢迎消息 ── */
function sendWelcomeMessages() {
    var c = AI_LAST_CYCLE;

    // 第一条：问候 + 概况
    var greeting = '您好！我是您的 bot 助手。让我先帮您回顾一下上周期的调薪情况：\n\n' +
        '在 <strong>' + c.name + '</strong> 中，您的团队共 <strong>' + c.total + '</strong> 人，其中 <strong>' + c.adjusted + '</strong> 人获得了调薪，人均涨幅为 <strong>' + c.avgRate + '%</strong>。\n\n' +
        '具体调整情况如下：';
    appendAIMessage('ai', greeting);

    // 第二条：表格
    setTimeout(function() {
        var tableHtml = buildLastCycleTable(c);
        appendAIMessage('ai', tableHtml, true);
    }, 600);

    // 第三条：引导
    setTimeout(function() {
        var guide = '了解了上周期的情况后，现在请您直接告诉我：\n\n' +
            '<strong>您要调整哪位同学的薪酬？调整多少金额？调整理由是什么？</strong>\n\n' +
            '<div class="ai-msg-guide">' +
                '<div class="guide-title">请按以下格式输入（支持一次调整多人）：</div>' +
                '<div class="guide-example">示例1：张三 加薪 2000，理由：绩效优秀\n\n示例2（多人）：\n  赵六 2000 绩效优秀\n  吴九 3000 技术骨干\n  孙二十 3500 管理能力突出</div>' +
            '</div>\n' +
            '我会自动识别姓名、金额和理由，并更新到画布中。';
        appendAIMessage('ai', guide);
    }, 1200);
}

// bot 录音 demo 状态（不依赖浏览器语音识别）
var aiVoiceState = { recognizing: false, recognition: null, modalShown: false, demoTranscript: '' };

function bindAIRecordButtonEvents() {
    var btn = document.getElementById('aiLeftRecordBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        if (aiVoiceState.recognizing) stopAIVoiceRecognition();
        else startAIVoiceRecognition();
    });
}

function escapeHtmlText(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function extractVoiceConclusions(text) {
    var t = String(text || '');
    var hasLi = t.indexOf('李四') !== -1;
    var hasWang = t.indexOf('王五') !== -1;
    var hasNoRaiseTwice = (t.indexOf('连续') !== -1 || t.indexOf('两次') !== -1) && (t.indexOf('不调薪') !== -1 || t.indexOf('不涨薪') !== -1);
    var hasPerfBad = t.indexOf('绩效') !== -1 && (t.indexOf('差') !== -1 || t.indexOf('不达标') !== -1 || t.indexOf('不达') !== -1);

    return [
        {
            id: 'li_no_raise_twice_leader',
            label: '李四连续两次不调薪，但是作为预备leader，下次周期为了维稳一定要调薪调职级',
            checked: hasLi && hasNoRaiseTwice
        },
        {
            id: 'wang_perf_meeting',
            label: '王五绩效差，需安排单独面谈',
            checked: hasWang && hasPerfBad
        }
    ];
}

function buildVoiceMeetingMinutes(conclusionsSelected, transcript, includeTranscript) {
    var now = new Date();
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

    var lines = [];
    lines.push('【会议纪要】');
    lines.push('时间：' + ts);
    lines.push('');
    if (conclusionsSelected.length) {
        lines.push('结论：');
        conclusionsSelected.forEach(function(c, idx) {
            lines.push((idx + 1) + '. ' + c.label);
        });
        lines.push('');
    }
    if (includeTranscript) {
        lines.push('录音内容：');
        lines.push(transcript || '');
    } else {
        lines.push('录音内容：未保存（仅保留结论/纪要结构）。');
    }
    return lines.join('\n');
}

function showVoiceConfirmModal(transcript) {
    var existing = document.getElementById('botVoiceConfirmOverlay');
    if (existing) existing.remove();

    var conclusions = extractVoiceConclusions(transcript);
    var defaultCheckedAny = conclusions.some(function(c) { return !!c.checked; });
    if (!defaultCheckedAny) {
        // 如果语音没匹配到关键点，则先把两条都置为可选（用户可自行勾选）
        conclusions.forEach(function(c) { c.checked = true; });
    }

    var overlay = document.createElement('div');
    overlay.id = 'botVoiceConfirmOverlay';
    overlay.className = 'bot-voice-confirm-overlay';

    var content = document.createElement('div');
    content.className = 'bot-voice-confirm-modal';

    var header = document.createElement('div');
    header.className = 'bot-voice-confirm-title';
    header.textContent = '录音结束：确认结论录入，以及是否保存会议原文转写/会议纪要？';

    var body = document.createElement('div');
    body.className = 'bot-voice-confirm-body';

    // 分区：结论录入 / 录音内容预览 / 保存产物
    var sections = document.createElement('div');
    sections.className = 'bot-voice-confirm-sections';
    body.appendChild(sections);

    // 1) 结论录入分区
    var conclusionSection = document.createElement('div');
    conclusionSection.className = 'bot-voice-confirm-section';
    var conclusionTitle = document.createElement('div');
    conclusionTitle.className = 'bot-voice-confirm-section-title';
    conclusionTitle.textContent = '结论录入确认（是否将提到的结论录入此系统）';
    conclusionSection.appendChild(conclusionTitle);

    var list = document.createElement('div');
    list.className = 'bot-voice-confirm-list';
    conclusions.forEach(function(c) {
        var row = document.createElement('label');
        row.className = 'bot-voice-confirm-item';
        row.innerHTML =
            '<input type="checkbox" data-conclusion-id="' + escapeHtmlText(c.id) + '"' + (c.checked ? ' checked' : '') + ' />' +
            '<span class="bot-voice-confirm-text">' + escapeHtmlText(c.label) + '</span>';
        list.appendChild(row);
    });
    conclusionSection.appendChild(list);
    sections.appendChild(conclusionSection);

    // 2) 保存产物分区（与“结论录入”分开确认）
    var saveSection = document.createElement('div');
    saveSection.className = 'bot-voice-confirm-section';
    var saveTitle = document.createElement('div');
    saveTitle.className = 'bot-voice-confirm-section-title';
    saveTitle.textContent = '保存产物确认';
    saveSection.appendChild(saveTitle);

    var saveWrap = document.createElement('div');
    saveWrap.className = 'bot-voice-confirm-save-wrap';
    saveWrap.innerHTML =
        '<label class="bot-voice-confirm-item">' +
        '  <input type="checkbox" id="botVoiceSaveTranscript" checked />' +
        '  <span class="bot-voice-confirm-text">保存会议原文转写（转写文本，不展示预览）</span>' +
        '</label>' +
        '<label class="bot-voice-confirm-item">' +
        '  <input type="checkbox" id="botVoiceSaveMinutes" checked />' +
        '  <span class="bot-voice-confirm-text">保存会议纪要（根据勾选结论生成）</span>' +
        '</label>';
    saveSection.appendChild(saveWrap);
    sections.appendChild(saveSection);

    var actions = document.createElement('div');
    actions.className = 'bot-voice-confirm-actions';

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'bot-voice-confirm-btn bot-voice-confirm-btn-primary';
    yes.textContent = '确认录入并保存会议纪要';

    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'bot-voice-confirm-btn';
    no.textContent = '不录入';

    actions.appendChild(yes);
    actions.appendChild(no);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(actions);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    no.onclick = function() {
        overlay.remove();
    };

    yes.onclick = function() {
        var selected = [];
        for (var i = 0; i < conclusions.length; i++) {
            var c = conclusions[i];
            var el = overlay.querySelector('input[data-conclusion-id="' + c.id + '"]');
            if (el && el.checked) selected.push(c);
        }

        var saveTranscript = false;
        var saveMinutes = false;
        var tEl = overlay.querySelector('#botVoiceSaveTranscript');
        var mEl = overlay.querySelector('#botVoiceSaveMinutes');
        if (tEl) saveTranscript = !!tEl.checked;
        if (mEl) saveMinutes = !!mEl.checked;

        // 三类产物都不勾选：不执行任何保存
        if (!selected.length && !saveTranscript && !saveMinutes) {
            var hint = document.createElement('div');
            hint.className = 'bot-voice-confirm-hint';
            hint.textContent = '至少勾选一项：录入结论，或保存会议原文转写，或保存会议纪要。';
            body.appendChild(hint);
            setTimeout(function() { hint.remove(); }, 2000);
            return;
        }

        // 1) 结论录入（仅演示：保存到本地）
        if (selected.length) {
            try {
                localStorage.setItem(
                    'botVoiceConclusionsSelected',
                    JSON.stringify(selected.map(function(c) { return { id: c.id, label: c.label }; }))
                );
            } catch (e) {}
            appendAIMessage('ai', '已确认：结论录入成功（demo，已保存本地）。', false);
        }

        // 2) 保存会议原文转写（转写文本）
        if (saveTranscript) {
            try { localStorage.setItem('botVoiceTranscript', transcript || ''); } catch (e) {}
            window.__botVoiceTranscript = transcript || '';
            appendAIMessage('user', transcript);
        }

        // 3) 保存会议纪要
        if (saveMinutes) {
            // “保存会议纪要”里是否包含“录音原文”，取决于用户是否也勾选了“保存会议原文转写”
            var minutesText = buildVoiceMeetingMinutes(selected, transcript, saveTranscript);
            try { localStorage.setItem('botMeetingMinutes', minutesText); } catch (e) {}
            window.__botMeetingMinutes = minutesText;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(minutesText).then(function() {
                    appendAIMessage('ai', '已保存会议纪要（已复制到剪贴板）。', false);
                }).catch(function() {
                    appendAIMessage('ai', '已保存会议纪要。', false);
                });
            } else {
                appendAIMessage('ai', '已保存会议纪要。', false);
            }
        }

        overlay.remove();
    };
}

function startAIVoiceRecognition() {
    var btn = document.getElementById('aiLeftRecordBtn');
    if (!btn) return;

    // 避免重复 start
    if (aiVoiceState.recognizing) return;
    aiVoiceState.recognizing = true;
    btn.classList.add('is-recording');
    btn.textContent = '录音中';
    aiVoiceState.modalShown = false;
    // demo：准备两条可验证的模拟录音稿
    // 你也可以继续扩展更多场景
    var demoSamples = [
        '李四连续两次不调薪，但是作为预备leader，下次周期为了维稳一定要调薪调职级。王五绩效差，需安排单独面谈。',
        '刚才的录音：李四连续两次不调薪。除此之外，王五绩效差，需要尽快安排单独面谈。'
    ];
    aiVoiceState.demoTranscript = demoSamples[Math.floor(Math.random() * demoSamples.length)];
}

function stopAIVoiceRecognition() {
    var btn = document.getElementById('aiLeftRecordBtn');
    if (btn) {
        btn.classList.remove('is-recording');
        btn.disabled = false;
        btn.innerHTML = '🎙 录音';
    }

    aiVoiceState.recognizing = false;
    aiVoiceState.recognition = null;

    var text = (aiVoiceState.demoTranscript || '').trim();
    if (!text) return;
    if (aiVoiceState.modalShown) return;
    aiVoiceState.modalShown = true;

    // demo：第二次点击直接弹出二次确认框
    showVoiceConfirmModal(text);
}

/* ── 构建上周期表格 HTML ── */
function buildLastCycleTable(cycle) {
    var rows = cycle.items.map(function(item) {
        var amountClass = item.amount >= 0 ? 'positive' : 'negative';
        var amountText = (item.amount >= 0 ? '+' : '') + item.amount.toLocaleString();
        var rateClass = item.rate.startsWith('-') ? 'negative' : 'positive';
        return '<tr><td>' + item.name + '</td><td class="' + amountClass + '">' + amountText + '</td><td class="' + rateClass + '">' + item.rate + '</td><td>' + item.reason + '</td></tr>';
    }).join('');

    // 总结
    var highNames = cycle.items.filter(function(i) { return parseFloat(i.rate) >= 15; }).map(function(i) { return i.name; });
    var negNames = cycle.items.filter(function(i) { return i.amount < 0; }).map(function(i) { return i.name; });
    var posCount = cycle.items.filter(function(i) { return i.amount > 0; }).length;

    var summary = '';
    if (highNames.length > 0) summary += highNames.join('和') + ' 涨幅较高；';
    summary += '共有 ' + posCount + ' 人涨薪';
    if (negNames.length > 0) summary += '；' + negNames.join('、') + ' 因处于激活状态且业绩不达标降薪';

    return '<div class="ai-msg-table-wrap">' +
        '<div class="ai-msg-table-title">📋 上周期调薪计划</div>' +
        '<table class="ai-msg-table">' +
            '<thead><tr><th>姓名</th><th>调整额</th><th>涨幅</th><th>原因</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
        '</table>' +
    '</div>' +
    '<div class="ai-msg-summary">' + summary + '</div>';
}

/* ── 追加消息 ── */
function appendAIMessage(from, content, isRawHtml) {
    var container = document.getElementById('meetingLeftMessages');
    if (!container) return;
    var msg = document.createElement('div');
    msg.className = 'ai-msg from-' + from;

    var avatar = document.createElement('div');
    avatar.className = 'ai-msg-avatar';
    avatar.textContent = from === 'ai' ? '🤖' : '👤';

    var bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    if (isRawHtml) {
        bubble.innerHTML = content;
    } else {
        bubble.innerHTML = content.replace(/\n/g, '<br>');
    }

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    container.appendChild(msg);

    // 滚动到底部
    requestAnimationFrame(function() {
        container.scrollTop = container.scrollHeight;
    });
}

/* ── 系统提示消息（居中小字） ── */
function showAISystemMessage(text) {
    var container = document.getElementById('meetingLeftMessages');
    if (!container) return;
    var el = document.createElement('div');
    el.style.cssText = 'text-align:center;font-size:11px;color:#94a3b8;padding:4px 0;';
    el.textContent = text;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

/* ── 发送用户消息 ── */
function sendAIMessage() {
    var input = document.getElementById('aiInput');
    var text = input.value.trim();
    if (!text) return;

    // 显示用户消息
    appendAIMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    // 显示"正在输入"
    showAITyping();

    // 延迟处理（模拟 AI 思考）
    setTimeout(function() {
        removeAITyping();
        processUserInput(text);
    }, 800);
}

/* ── 正在输入指示器 ── */
function showAITyping() {
    var container = document.getElementById('meetingLeftMessages');
    if (!container) return;
    var existing = container.querySelector('.ai-typing-wrap');
    if (existing) return;
    var wrap = document.createElement('div');
    wrap.className = 'ai-msg from-ai ai-typing-wrap';
    wrap.id = 'meetingTypingIndicator';
    wrap.innerHTML = '<div class="ai-msg-avatar">🤖</div><div class="ai-msg-bubble"><div class="ai-typing-indicator"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div></div>';
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function removeAITyping() {
    var typing = document.getElementById('meetingTypingIndicator');
    if (typing) typing.remove();
    var container = document.getElementById('meetingLeftMessages');
    if (!container) return;
    var wrap = container.querySelector('.ai-typing-wrap');
    if (wrap) wrap.remove();
}

/* ── 处理用户输入 ── */
function processUserInput(text) {
    var results = parseAdjustmentCommand(text);
    if (results.length === 0) {
        appendAIMessage('ai', '抱歉，我没有识别到有效的调薪指令。请按以下格式输入：\n\n' +
            '<div class="ai-msg-guide">' +
            '<div class="guide-example">姓名 金额 理由\n例如：赵六 2000 绩效优秀</div>' +
            '</div>\n' +
            '请确保姓名与团队成员匹配。当前团队成员包括：' + getTeamNameList());
        return;
    }

    // 执行调薪
    var undoEntries = [];
    var confirmItems = [];

    results.forEach(function(r) {
        var emp = r.emp;
        var amount = r.amount;
        var reason = r.reason;

        // 记录撤销信息
        undoEntries.push({
            empId: emp.id,
            origAdjustment: emp.adjustment || 0,
            origReason: emp.adjustmentReason || ''
        });

        // 计算调整百分比
        var pct = emp.salary ? Math.round((amount / emp.salary) * 100) : 0;
        emp.adjustment = (emp.adjustment || 0) + pct;
        if (reason) emp.adjustmentReason = reason;

        var newSalary = emp.salary + emp.salary * emp.adjustment / 100;
        confirmItems.push({
            name: emp.name,
            amount: amount,
            pct: pct,
            reason: reason,
            newSalary: Math.round(newSalary)
        });
    });

    // 记录到撤销栈
    undoStack.push({ entries: undoEntries });

    // 刷新视图
    if (typeof renderScatterView === 'function') renderScatterView();
    if (typeof renderTableView === 'function') renderTableView();
    if (typeof renderGridView === 'function') renderGridView();
    if (typeof updateStats === 'function') updateStats();
    if (typeof showDragUndoHint === 'function') showDragUndoHint();

    // 构建确认消息
    var confirmHtml = '<div class="ai-confirm-card">' +
        '<div class="ai-confirm-card-header">✅ 调薪已执行</div>' +
        '<div class="ai-confirm-card-body">';

    confirmItems.forEach(function(item) {
        var amountText = (item.amount >= 0 ? '+' : '') + item.amount.toLocaleString() + ' 元';
        var pctText = (item.pct >= 0 ? '+' : '') + item.pct + '%';
        var amountClass = item.amount >= 0 ? '' : ' negative';
        confirmHtml += '<div class="ai-confirm-item">' +
            '<span class="name">' + item.name + '</span> ' +
            '<span class="amount' + amountClass + '">' + amountText + '（' + pctText + '）</span>' +
            (item.reason ? ' <span class="reason">理由：' + item.reason + '</span>' : '') +
            '</div>';
    });

    confirmHtml += '</div></div>';

    var summaryText = '已为 ' + confirmItems.length + ' 位同学更新薪资调整，画布已同步刷新。\n\n' + confirmHtml +
        '\n如需继续调整其他同学，请直接输入。如需撤销，可使用画布上的撤销功能（Ctrl+Z）。';

    appendAIMessage('ai', summaryText, true);
}

/* ── 解析调薪指令 ── */
function parseAdjustmentCommand(text) {
    var results = [];
    var lines = text.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

    lines.forEach(function(line) {
        // 尝试多种格式匹配
        var match = null;

        // 格式1：姓名 加薪/减薪 金额，理由：xxx
        match = line.match(/^(.+?)\s+(?:加薪|涨薪)\s*(\d+)\s*[，,]?\s*(?:理由[：:]?)?\s*(.*)$/);
        if (!match) {
            match = line.match(/^(.+?)\s+(?:减薪|降薪)\s*(\d+)\s*[，,]?\s*(?:理由[：:]?)?\s*(.*)$/);
            if (match) match._negative = true;
        }
        // 格式2：姓名 金额 理由
        if (!match) {
            match = line.match(/^(.+?)\s+(-?\d+)\s*[，,]?\s*(?:理由[：:]?)?\s*(.*)$/);
        }

        if (match) {
            var nameStr = match[1].trim();
            var amount = parseInt(match[2], 10);
            if (match._negative) amount = -amount;
            var reason = (match[3] || '').trim();

            // 在 employees 中查找
            var emp = findEmployeeByName(nameStr);
            if (emp) {
                results.push({ emp: emp, amount: amount, reason: reason });
            }
        }
    });

    return results;
}

/* ── 按姓名查找员工（支持模糊匹配） ── */
function findEmployeeByName(name) {
    // 精确匹配
    var exact = employees.find(function(e) { return e.name === name; });
    if (exact) return exact;

    // 包含匹配
    var partial = employees.filter(function(e) { return e.name.indexOf(name) !== -1 || name.indexOf(e.name) !== -1; });
    if (partial.length === 1) return partial[0];

    return null;
}

/* ── 获取团队成员名单 ── */
function getTeamNameList() {
    return employees.map(function(e) { return e.name; }).join('、');
}

/* ── 从对话框生成任务总结（非会议模式） ── */
function generateSalaryReportFromDialog() {
    var adjusted = employees.filter(function(e) { return e.adjustment && e.adjustment !== 0; });

    if (adjusted.length === 0) {
        appendAIMessage('ai', '当前暂无调薪记录，请先进行调薪操作后再生成报告。');
        return;
    }

    // ── 构建报告内容 ──
    var reportHtml = buildSalaryReportHtml(adjusted);
    appendAIMessage('ai', reportHtml, true);

}

/* ── 构建调薪报告 HTML ── */
function buildSalaryReportHtml(adjusted) {
    var total = employees.length;

    // 1. 异常提醒：合同即将到期但未调薪的人员（模拟数据：recentPromotion 或 consecutiveNoRaise>=2 的人视为合同即将到期）
    var contractExpiringIds = [];
    employees.forEach(function(e) {
        // 模拟合同即将到期的人员：连续未调薪2次以上 或 id 尾数为特定值
        if ((e.consecutiveNoRaise && e.consecutiveNoRaise >= 2) || e.id === 5 || e.id === 13 || e.id === 15 || e.id === 23 || e.id === 29) {
            contractExpiringIds.push(e.id);
        }
    });
    var contractExpiringNoRaise = employees.filter(function(e) {
        return contractExpiringIds.indexOf(e.id) !== -1 && (!e.adjustment || e.adjustment === 0);
    });

    var anomalyHtml = '';
    if (contractExpiringNoRaise.length > 0) {
        var names = contractExpiringNoRaise.map(function(e) { return e.name; }).join('、');
        anomalyHtml = '<div class="ai-report-anomaly">' +
            '<div class="ai-report-anomaly-icon">⚠️</div>' +
            '<div class="ai-report-anomaly-text">以下同学合同即将到期但本次未调薪：<strong>' + names + '</strong>，建议关注保留风险。</div>' +
            '</div>';
    }

    // 2. 整体概况
    var totalBudget = 0;
    var totalRateSum = 0;
    adjusted.forEach(function(e) {
        var amount = Math.round(e.salary * e.adjustment / 100);
        totalBudget += amount;
        totalRateSum += Math.abs(e.adjustment);
    });
    var avgRate = adjusted.length > 0 ? (totalRateSum / adjusted.length).toFixed(1) : '0';
    var budgetText = totalBudget >= 0 ? 'CNY ' + totalBudget.toLocaleString() : 'CNY ' + totalBudget.toLocaleString();

    // 3. 调薪明细表格
    var tableRows = adjusted.map(function(e) {
        var amount = Math.round(e.salary * e.adjustment / 100);
        var amountText = (amount >= 0 ? '+' : '') + amount.toLocaleString();
        var rateText = (e.adjustment >= 0 ? '+' : '') + e.adjustment + '%';
        var amountClass = amount >= 0 ? 'positive' : 'negative';
        var reason = e.adjustmentReason || '—';
        return '<tr>' +
            '<td>' + e.name + '</td>' +
            '<td>' + e.salary.toLocaleString() + '</td>' +
            '<td class="' + amountClass + '">' + amountText + '</td>' +
            '<td class="' + amountClass + '">' + rateText + '</td>' +
            '<td>' + reason + '</td>' +
            '</tr>';
    }).join('');

    // 组装完整报告
    var html = '<div class="ai-salary-report">' +
        '<div class="ai-report-header">📊 调薪报告</div>';

    // 异常提醒
    if (anomalyHtml) {
        html += '<div class="ai-report-section">' +
            '<div class="ai-report-section-title">异常提醒</div>' +
            anomalyHtml +
            '</div>';
    }

    // 调薪分析
    html += '<div class="ai-report-section">' +
        '<div class="ai-report-section-title">调薪分析</div>' +
        '<div class="ai-report-overview">' +
            '<div class="ai-report-overview-title">1. 整体概况</div>' +
            '<div class="ai-report-overview-text">本次调薪周期，团队共 <strong>' + total + '</strong> 人，对 <strong>' + adjusted.length + '</strong> 位同学进行薪酬调整。总调薪预算 <strong>' + budgetText + '</strong>，人均涨幅 <strong>' + avgRate + '%</strong>。</div>' +
        '</div>' +
        '<div class="ai-report-detail">' +
            '<div class="ai-report-overview-title">2. 调薪明细</div>' +
            '<div class="ai-report-table-wrap">' +
                '<table class="ai-report-table">' +
                    '<thead><tr><th>姓名</th><th>当前薪资</th><th>调整额</th><th>涨幅</th><th>调整理由</th></tr></thead>' +
                    '<tbody>' + tableRows + '</tbody>' +
                '</table>' +
            '</div>' +
        '</div>' +
        '</div>';

    // 一键复制按钮
    html += '<div class="ai-report-copy-wrap">' +
        '<button class="ai-report-copy-btn" onclick="copySalaryReportText()">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            '一键复制总结文本' +
        '</button>' +
        '</div>';

    html += '</div>';
    return html;
}

/* ── 复制调薪报告纯文本 ── */
function copySalaryReportText() {
    var adjusted = employees.filter(function(e) { return e.adjustment && e.adjustment !== 0; });
    if (adjusted.length === 0) return;

    var total = employees.length;
    var totalBudget = 0;
    var totalRateSum = 0;
    adjusted.forEach(function(e) {
        var amount = Math.round(e.salary * e.adjustment / 100);
        totalBudget += amount;
        totalRateSum += Math.abs(e.adjustment);
    });
    var avgRate = adjusted.length > 0 ? (totalRateSum / adjusted.length).toFixed(1) : '0';

    // 异常提醒
    var contractExpiringIds = [];
    employees.forEach(function(e) {
        if ((e.consecutiveNoRaise && e.consecutiveNoRaise >= 2) || e.id === 5 || e.id === 13 || e.id === 15 || e.id === 23 || e.id === 29) {
            contractExpiringIds.push(e.id);
        }
    });
    var contractExpiringNoRaise = employees.filter(function(e) {
        return contractExpiringIds.indexOf(e.id) !== -1 && (!e.adjustment || e.adjustment === 0);
    });

    var text = '【调薪报告】\n\n';

    if (contractExpiringNoRaise.length > 0) {
        text += '⚠️ 异常提醒\n';
        text += '以下同学合同即将到期但本次未调薪：' + contractExpiringNoRaise.map(function(e) { return e.name; }).join('、') + '，建议关注保留风险。\n\n';
    }

    text += '📊 调薪分析\n\n';
    text += '1. 整体概况\n';
    text += '本次调薪周期，团队共 ' + total + ' 人，对 ' + adjusted.length + ' 位同学进行薪酬调整。总调薪预算 CNY ' + totalBudget.toLocaleString() + '，人均涨幅 ' + avgRate + '%。\n\n';
    text += '2. 调薪明细\n';
    text += '姓名\t当前薪资\t调整额\t涨幅\t调整理由\n';
    adjusted.forEach(function(e) {
        var amount = Math.round(e.salary * e.adjustment / 100);
        var amountText = (amount >= 0 ? '+' : '') + amount.toLocaleString();
        var rateText = (e.adjustment >= 0 ? '+' : '') + e.adjustment + '%';
        var reason = e.adjustmentReason || '—';
        text += e.name + '\t' + e.salary.toLocaleString() + '\t' + amountText + '\t' + rateText + '\t' + reason + '\n';
    });

    // 复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showCopyToast('已复制到剪贴板');
        }).catch(function() {
            fallbackCopyText(text);
        });
    } else {
        fallbackCopyText(text);
    }
}

/* ── 复制回退方案 ── */
function fallbackCopyText(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showCopyToast('已复制到剪贴板');
    } catch (e) {
        showCopyToast('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
}

/* ── 复制成功提示 ── */
function showCopyToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'ai-copy-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
        toast.classList.add('show');
    });
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, 2000);
}

