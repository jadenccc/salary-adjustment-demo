/* === intentRecognizer.js === 文本意图识别 */
(function() {
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

    function extractName(text) {
        if (!text) return '';
        var m = text.match(/([\u4e00-\u9fa5]{2,4})/g);
        if (!m || !m.length) return '';
        return m[m.length - 1];
    }

    window.recognizeBotIntent = recognizeBotIntent;
})();

