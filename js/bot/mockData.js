/* === mockData.js === Bot mock 文案数据 */

(function() {
    /**
     * Bot 演示用 mock 数据（引导语、历史摘要等）
     * @namespace BOT_MOCK
     */
    window.BOT_MOCK = {
        /** Demo：左侧对话中「用户」展示名 */
        displayUserName: 'Hoyo',

        /** 引导问卷配置 */
        onboarding: {
            /** Q1：是否先查看上次调薪结果 */
            q1: {
                text: '需要先看上次调薪结果再开始吗？',
                options: [
                    { label: '直接开始',       intent: BOT_INTENTS.SKIP_HISTORY },
                    { label: '先看上次调薪',   intent: BOT_INTENTS.VIEW_LAST_REVIEW, payload: { cycle: 'last' } },
                    { label: '看上上次调薪',   intent: BOT_INTENTS.VIEW_LAST_REVIEW, payload: { cycle: 'last2' } }
                ]
            },
            /** Q2：推进模式选择 */
            q2: {
                text: '你希望怎么推进？',
                options: [
                    { label: '逐人处理（绩效+薪酬一起做完再下一个）', intent: BOT_INTENTS.MODE_SEQUENTIAL },
                    { label: '先给所有人打完绩效，再统一处理薪酬',   intent: BOT_INTENTS.MODE_PERF_FIRST }
                ]
            }
        },

        /** 历史调薪摘要数据 */
        history: {
            last:  { title: '上次调薪摘要',   adjusted: 9, avg: '6.8%', budget: 'CNY 352,000' },
            last2: { title: '上上次调薪摘要', adjusted: 7, avg: '5.9%', budget: 'CNY 281,000' }
        }
    };
})();
