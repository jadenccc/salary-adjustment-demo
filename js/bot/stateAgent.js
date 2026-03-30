/* === stateAgent.js === 状态监听 */
(function() {
    // Demo：绩效填报专用的3个员工 ID（与 orchestratorAgent 保持一致）
    var PERF_DEMO_IDS = [22, 4, 6];

    function getAllEmployees() {
        if (typeof employees !== 'undefined') return employees;
        return window.employees || [];
    }
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

    function StateAgent(orchestrator) {
        this.orchestrator = orchestrator;
        this.tid = null;
    }

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

    StateAgent.prototype.stop = function() {
        if (this.tid) clearInterval(this.tid);
        this.tid = null;
    };

    window.StateAgent = StateAgent;
})();
