/* === actionAgent.js === 画布/抽屉联动动作 */
(function() {
    function getAllEmployees() {
        if (typeof employees !== 'undefined') return employees;
        return window.employees || [];
    }
    var actionAgent = {
        openPersonById: function(empId, tab) {
            var emp = getAllEmployees().find(function(e) { return e.id === empId; });
            if (!emp || typeof openDrawer !== 'function') return false;
            openDrawer(emp, tab || 'basic');
            return true;
        },
        submitPlan: function() {
            if (typeof onTaskCtxSubmitClick === 'function') {
                onTaskCtxSubmitClick();
                return true;
            }
            return false;
        },
        openWideTable: function() {
            if (typeof backToWideTable === 'function') {
                backToWideTable();
                return true;
            }
            return false;
        }
    };

    window.actionAgent = actionAgent;
})();

