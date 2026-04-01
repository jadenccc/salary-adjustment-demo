/* === stateAgent.js === 状态监听（定时轮询绩效/薪酬填报进度） */

(function() {
    /** Demo：绩效填报专用的3个员工 ID（与 orchestratorAgent 保持一致） */
    var PERF_DEMO_IDS = [22, 4, 6];

    /**
     * 获取全局员工列表
     * @returns {Array} 员工数组
     */
    function getAllEmployees() {
        if (typeof employees !== 'undefined') return employees;
        return window.employees || [];
    }

    /**
     * 获取指定人员中已完成绩效填报的 ID 列表
     * @param {number[]} peopleIds - 待检查的员工 ID 列表
     * @returns {number[]} 已完成绩效填报的员工 ID 列表
     */
    function getPerfDoneIds(peopleIds) {
        var set = typeof perfFilledIds !== 'undefined' ? perfFilledIds : new Set();
        var out = [];
        var seen = {};
        for (var i = 0; i < (peopleIds || []).length; i++) {
            var id = peopleIds[i];
            if (seen[id]) continue;
            var ok = false;
            if (set.has(id)) {
                ok = true;
            } else {
                var emp = getAllEmployees().find(function(e) { return e.id === id; });
                ok = !!(emp && emp.leaderSummaryEval);
            }
            if (!ok) continue;
            seen[id] = true;
            out.push(id);
        }
        return out;
    }

    /**
     * 获取指定人员中已完成薪酬调整的 ID 列表（adjustment !== 0 视为已完成）
     * @param {number[]} peopleIds - 待检查的员工 ID 列表
     * @returns {number[]} 已完成薪酬调整的员工 ID 列表
     */
    function getCompDoneIds(peopleIds) {
        var out = [];
        var seen = {};
        for (var i = 0; i < (peopleIds || []).length; i++) {
            var id = peopleIds[i];
            if (seen[id]) continue;
            var emp = getAllEmployees().find(function(e) { return e.id === id; });
            if (!emp) continue;
            if (Number(emp.adjustment || 0) === 0) continue;
            seen[id] = true;
            out.push(id);
        }
        return out;
    }

    /**
     * 状态代理：定时轮询绩效/薪酬填报进度，并通知 orchestrator 刷新进度卡片
     * @constructor
     * @param {Object} orchestrator - OrchestratorAgent 实例
     */
    function StateAgent(orchestrator) {
        this.orchestrator = orchestrator;
        this.tid = null;
    }

    /**
     * 启动状态轮询（每 600ms 检查一次）
     */
    StateAgent.prototype.start = function() {
        this.stop();
        var self = this;
        this.tid = setInterval(function() {
            var bs = self.orchestrator.botState;
            if (!bs || !bs.peopleIds || !bs.peopleIds.length) return;
            // 绩效进度：只监听3个绩效填报员工
            var perfDone = getPerfDoneIds(PERF_DEMO_IDS);
            var compDone = getCompDoneIds(bs.peopleIds);
            bs.taskProgress.perfDone = perfDone.slice();
            bs.taskProgress.compDone = compDone.slice();
            self.orchestrator.refreshProgressCard();
        }, 600);
    };

    /**
     * 停止状态轮询
     */
    StateAgent.prototype.stop = function() {
        if (this.tid) clearInterval(this.tid);
        this.tid = null;
    };

    window.StateAgent = StateAgent;
})();
