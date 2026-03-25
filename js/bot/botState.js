/* === botState.js === Bot 全局状态 */
(function() {
    var PHASES = {
        IDLE: 'idle',
        ONBOARDING: 'onboarding',
        IN_PROGRESS_PERF: 'perf',
        PERF_CONFIRM: 'perf_confirm',
        IN_PROGRESS_COMP: 'comp',
        COMP_CONFIRM: 'comp_confirm',
        DONE: 'done'
    };

    var INTENTS = {
        SKIP_HISTORY: 'skip_history',
        VIEW_LAST_REVIEW: 'view_last_review',
        MODE_SEQUENTIAL: 'mode_sequential',
        MODE_PERF_FIRST: 'mode_perf_first',
        HAS_PRIORITY: 'has_priority',
        NO_PRIORITY: 'no_priority',
        ALL_PERF_FILLED: 'all_perf_filled',
        CONFIRM_PERF: 'confirm_perf',
        EDIT_PERF: 'edit_perf',
        CONFIRM_COMP: 'confirm_comp',
        EDIT_COMP: 'edit_comp',
        COMP_SUBMIT: 'comp_submit',
        GENERATE_SUMMARY: 'generate_summary',
        SUBMIT_PLAN: 'submit_plan',
        QUERY_PROGRESS: 'query_progress',
        QUERY_PERSON: 'query_person',
        JUMP_TO_PERSON: 'jump_to_person',
        PAUSE: 'pause',
        FALLBACK: 'fallback'
    };

    function createInitialBotState() {
        return {
            phase: PHASES.IDLE,
            taskId: null,
            peopleIds: [],
            userPrefs: {
                reviewHistory: false,
                historyCycle: null,
                mode: 'sequential'
            },
            onboardingDone: false,
            taskProgress: {
                perfDone: [],
                compDone: [],
                perfConfirmed: false,
                compConfirmed: false
            }
        };
    }

    window.BOT_PHASES = PHASES;
    window.BOT_INTENTS = INTENTS;
    window.createInitialBotState = createInitialBotState;
})();

