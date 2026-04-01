/* === intentRecognizer.js === 文本意图识别 */

(function() {
    /**
     * 识别用户输入文本的 Bot 意图
     * @param {string} text - 用户输入文本
     * @returns {{intent: string, name?: string}} 识别结果，包含意图类型和可选的人名
     */
    function recognizeBotIntent(text) {
        var t = String(text || '').trim();
        if (!t) return { intent: BOT_INTENTS.FALLBACK };
        if (/还剩|进度|到哪|几个/.test(t)) return { intent: BOT_INTENTS.QUERY_PROGRESS };
        if (/去看|打开|切到|找/.test(t)) {
            var name = extractName(t);
            return { intent: BOT_INTENTS.JUMP_TO_PERSON, name: name };
        }
        if (/停|等等|暂停|先不/.test(t)) return { intent: BOT_INTENTS.PAUSE };
        if (/怎么样|情况|状态/.test(t)) {
            return { intent: BOT_INTENTS.QUERY_PERSON, name: extractName(t) };
        }
        return { intent: BOT_INTENTS.FALLBACK };
    }

    /**
     * 从文本中提取最后一个中文人名（2~4 个汉字）
     * @param {string} text - 输入文本
     * @returns {string} 提取到的人名，未找到时返回空字符串
     */
    function extractName(text) {
        if (!text) return '';
        var m = text.match(/([\u4e00-\u9fa5]{2,4})/g);
        if (!m || !m.length) return '';
        return m[m.length - 1];
    }

    window.recognizeBotIntent = recognizeBotIntent;
})();
