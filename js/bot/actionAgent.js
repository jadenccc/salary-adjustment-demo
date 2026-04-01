/* === actionAgent.js === 画布/抽屉联动动作 */

(function() {
    /**
     * 获取全局员工列表
     * @returns {Array} 员工数组
     */
    function getAllEmployees() {
        if (typeof employees !== 'undefined') return employees;
        return window.employees || [];
    }

    /**
     * Bot 动作代理：封装对画布、抽屉的联动操作
     * @namespace actionAgent
     */
    var actionAgent = {
        /**
         * 通过员工 ID 打开详情抽屉
         * @param {number} empId - 员工 ID
         * @param {string} [tab='basic'] - 初始激活的 tab
         * @returns {boolean} 是否成功打开
         */
        openPersonById: function(empId, tab) {
            var emp = getAllEmployees().find(function(e) { return e.id === empId; });
            if (!emp || typeof openDrawer !== 'function') return false;
            // 通过 showDetail 打开，确保 selectedEmployee 被正确设置
            if (typeof showDetail === 'function') {
                showDetail(emp, false, false, tab || 'basic');
            } else {
                openDrawer(emp, tab || 'basic');
            }
            return true;
        },

        /**
         * 提交当前任务调薪方案
         * @returns {boolean} 是否成功触发提交
         */
        submitPlan: function() {
            if (typeof onTaskCtxSubmitClick === 'function') {
                onTaskCtxSubmitClick();
                return true;
            }
            return false;
        },

        /**
         * 切换到宽表视图
         * @returns {boolean} 是否成功切换
         */
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
