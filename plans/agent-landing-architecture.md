# 薪资调整 AI Agent 落地架构设计

> 基于当前 Demo（V10）的分析，面向真实生产环境的落地方案
> 作者：产品经理视角 × 技术架构视角
> 版本：v1.0 | 2026-03

---

## 一、从 Demo 到落地：差距分析

| 维度 | 当前 Demo | 落地要求 |
|------|-----------|----------|
| 意图识别 | 正则关键词匹配 | LLM 语义理解 + 槽位提取 |
| 数据来源 | 前端硬编码 mockData | 后端 API / HR 系统集成 |
| Agent 数量 | 5个前端模块 | 多 Agent 协作 + 工具调用 |
| 状态管理 | 前端 setInterval 轮询 | 后端事件驱动 + 实时推送 |
| 权限控制 | 无 | RBAC + 审批流 |
| 审计追踪 | 无 | 完整操作日志 |
| 多人协作 | 无 | 实时协同 + 冲突处理 |

---

## 二、整体系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层（Web App）                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  薪资调整工作台 │  │  AI 对话面板  │  │  审批/通知中心        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼────────────────────┼──────────────┘
          │                 │  WebSocket / SSE    │
┌─────────▼─────────────────▼────────────────────▼──────────────┐
│                      API Gateway / BFF 层                       │
│              （鉴权 / 限流 / 路由 / 日志）                       │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                      Agent 编排层（核心）                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Orchestrator Agent（总调度）                 │   │
│  │  - 接收用户意图                                           │   │
│  │  - 分解任务 → 调度子 Agent                               │   │
│  │  - 汇总结果 → 生成回复                                    │   │
│  └──────┬──────────┬──────────┬──────────┬──────────────────┘  │
│         │          │          │          │                       │
│  ┌──────▼──┐ ┌─────▼──┐ ┌────▼───┐ ┌───▼──────┐              │
│  │ Intent  │ │ Data   │ │ Comp   │ │ Approval │              │
│  │ Agent   │ │ Agent  │ │ Agent  │ │ Agent    │              │
│  │ 意图理解 │ │ 数据查询 │ │ 薪酬计算 │ │ 审批流转  │              │
│  └──────┬──┘ └─────┬──┘ └────┬───┘ └───┬──────┘              │
│         │          │          │          │                       │
│  ┌──────▼──────────▼──────────▼──────────▼──────────────────┐  │
│  │                    Tool Layer（工具层）                     │  │
│  │  HR_Query | Salary_Calc | Policy_Check | Notify | Audit   │  │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
          │                              │
┌─────────▼──────────┐      ┌───────────▼────────────┐
│   HR 系统 / 数据库   │      │   LLM 服务（大模型）     │
│  员工数据 / 薪酬数据  │      │  GPT-4o / Claude / 自研  │
└────────────────────┘      └────────────────────────┘
```

---

## 三、Agent 详细设计（5个核心 Agent）

### 3.1 Orchestrator Agent（总调度 Agent）

**职责**：整个对话的"大脑"，负责理解上下文、分解任务、协调其他 Agent

**输入**：用户自然语言 + 当前会话上下文 + 任务状态

**输出**：结构化指令 → 分发给子 Agent；最终回复 → 返回前端

**核心能力**：
- 多轮对话上下文管理（Memory）
- 任务分解（Task Decomposition）
- 子 Agent 调度与结果聚合
- 异常处理与兜底回复

**System Prompt 关键要素**（PM 需定义）：
```
你是一个薪资调整助手，帮助 HR/管理者完成年度调薪工作。
当前用户角色：{role}（HR/部门经理/HRBP）
当前任务：{task_name}，截止日期：{deadline}
你的团队：{team_members}（共 {count} 人）
公司调薪政策：{policy_summary}
你只能在授权范围内操作，超出范围需上报审批。
```

---

### 3.2 Intent Agent（意图理解 Agent）

**职责**：将用户自然语言转化为结构化意图 + 槽位

**对比 Demo**：Demo 用正则匹配，落地用 LLM Function Calling

**意图分类**（PM 需完整定义）：

| 意图 ID | 意图名称 | 示例话术 | 必填槽位 |
|---------|---------|---------|---------|
| `QUERY_PROGRESS` | 查询进度 | "还有几个人没填？" | - |
| `QUERY_PERSON` | 查询个人信息 | "张三现在薪资多少？" | name |
| `SET_SALARY` | 设置薪资 | "给李四涨 15%" | name, value, type |
| `BATCH_ADJUST` | 批量调整 | "A 级员工统一涨 12%" | perf_level, value |
| `QUERY_POLICY` | 查询政策 | "今年调薪上限是多少？" | - |
| `SUBMIT_PLAN` | 提交方案 | "提交审批" | - |
| `UNDO_ACTION` | 撤销操作 | "刚才那个撤销" | - |
| `COMPARE_MARKET` | 市场对标 | "张三薪资在市场什么水位？" | name |
| `EXPLAIN_REASON` | 填写理由 | "张三涨薪原因是晋升" | name, reason |

**槽位提取示例**：
```json
{
  "intent": "SET_SALARY",
  "slots": {
    "name": "张三",
    "employee_id": "EMP001",  // 通过名字查询补全
    "value": 15,
    "type": "percentage",     // percentage | absolute
    "reason": null            // 需要追问
  },
  "confidence": 0.95,
  "need_confirm": true        // 金额变更需二次确认
}
```

---

### 3.3 Data Agent（数据查询 Agent）

**职责**：所有数据的读取操作，对接 HR 系统 API

**工具调用**：

```python
# Tool 1: 查询员工基本信息
def get_employee_info(employee_id: str) -> dict:
    """
    返回：姓名、工号、部门、职级、当前薪资、绩效历史、在职年限
    """

# Tool 2: 查询团队薪酬分布
def get_team_salary_distribution(manager_id: str, period: str) -> dict:
    """
    返回：团队薪酬分位数、绩效分布、调薪预算余额
    """

# Tool 3: 查询历史调薪记录
def get_salary_history(employee_id: str, periods: int = 3) -> list:
    """
    返回：近 N 期调薪记录（时间、幅度、原因、审批人）
    """

# Tool 4: 查询市场薪酬数据
def get_market_benchmark(job_level: str, city: str) -> dict:
    """
    返回：P25/P50/P75/P90 市场薪酬数据
    """

# Tool 5: 查询调薪政策
def get_salary_policy(year: str, employee_type: str) -> dict:
    """
    返回：调薪上下限、预算比例、绩效-调薪对应表
    """
```

---

### 3.4 Comp Agent（薪酬计算 Agent）

**职责**：所有薪资的写入/计算操作，包含规则校验

**工具调用**：

```python
# Tool 1: 计算调薪方案
def calculate_salary_adjustment(
    employee_id: str,
    adjustment_type: str,  # "percentage" | "absolute"
    adjustment_value: float,
    reason: str
) -> dict:
    """
    返回：
    - new_salary: 调整后薪资
    - adjustment_amount: 调整金额
    - budget_impact: 预算影响
    - policy_check: 是否符合政策
    - warnings: 风险提示列表
    """

# Tool 2: 批量计算
def batch_calculate_adjustment(
    filter_criteria: dict,  # {"perf_level": "A", "department": "技术部"}
    adjustment_rule: dict   # {"type": "percentage", "value": 12}
) -> list:
    """
    返回：批量计算结果列表 + 预算汇总
    """

# Tool 3: 保存调薪方案（草稿）
def save_salary_draft(
    employee_id: str,
    new_salary: float,
    reason: str,
    operator_id: str
) -> dict:
    """
    写入草稿，不触发审批
    返回：draft_id, timestamp
    """

# Tool 4: 撤销调薪
def undo_salary_adjustment(
    employee_id: str,
    operator_id: str
) -> bool:
    """
    恢复到上一个草稿状态
    """

# Tool 5: 政策合规检查
def check_policy_compliance(
    employee_id: str,
    new_salary: float
) -> dict:
    """
    返回：
    - is_compliant: bool
    - violations: 违规项列表
    - requires_approval: 是否需要额外审批
    """
```

---

### 3.5 Approval Agent（审批流转 Agent）

**职责**：管理调薪方案的审批生命周期

**工具调用**：

```python
# Tool 1: 提交审批
def submit_for_approval(
    plan_id: str,
    submitter_id: str,
    summary: dict
) -> dict:
    """
    触发审批流，返回：approval_id, next_approver, deadline
    """

# Tool 2: 查询审批状态
def get_approval_status(plan_id: str) -> dict:
    """
    返回：当前审批节点、审批人、状态、历史记录
    """

# Tool 3: 发送通知
def send_notification(
    recipients: list,
    notification_type: str,  # "reminder" | "approval_request" | "result"
    content: dict
) -> bool:
    """
    通过企业微信/钉钉/邮件发送通知
    """

# Tool 4: 催办
def send_reminder(
    approval_id: str,
    operator_id: str
) -> bool:
    """
    向当前审批人发送催办消息
    """
```

---

## 四、技术框架选型

### 4.1 推荐方案：LangGraph（首选）

```
为什么选 LangGraph：
✅ 原生支持多 Agent 有状态图（State Graph）
✅ 支持 Human-in-the-loop（人工介入节点）
✅ 内置 Checkpoint 机制（对话状态持久化）
✅ 支持流式输出（Streaming）
✅ 与 LangChain 生态无缝集成
✅ 可视化调试工具（LangSmith）
```

**技术栈**：
```
后端：Python + LangGraph + FastAPI
LLM：GPT-4o / Claude 3.5 Sonnet（可配置）
向量库：Chroma / Pinecone（政策文档 RAG）
数据库：PostgreSQL（业务数据）+ Redis（会话状态）
消息队列：Kafka / RabbitMQ（异步任务）
前端：现有 Vue/React + WebSocket
```

**Agent 图结构**：
```python
from langgraph.graph import StateGraph, END

# 定义状态
class SalaryAdjustState(TypedDict):
    messages: list          # 对话历史
    user_intent: dict       # 当前意图
    current_task: dict      # 当前任务上下文
    pending_actions: list   # 待执行动作
    requires_confirm: bool  # 是否需要用户确认
    operator_id: str        # 操作人 ID

# 构建图
workflow = StateGraph(SalaryAdjustState)
workflow.add_node("intent_agent", intent_node)
workflow.add_node("data_agent", data_node)
workflow.add_node("comp_agent", comp_node)
workflow.add_node("approval_agent", approval_node)
workflow.add_node("human_confirm", human_confirm_node)  # 关键：人工确认节点

# 条件路由
workflow.add_conditional_edges(
    "intent_agent",
    route_by_intent,
    {
        "query": "data_agent",
        "modify": "human_confirm",  # 修改操作先确认
        "submit": "approval_agent",
    }
)
```

### 4.2 备选方案对比

| 框架 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **LangGraph** | 有状态图、Human-in-loop、可视化 | 学习曲线 | **推荐，复杂业务流** |
| AutoGen | 多 Agent 对话自然 | 状态管理弱 | 研究/探索型任务 |
| CrewAI | 上手快、角色定义清晰 | 定制化弱 | 快速原型 |
| Dify | 无代码/低代码 | 灵活性差 | 非技术团队 |
| 自研 | 完全可控 | 开发成本高 | 有强定制需求 |

---

## 五、产品经理需要定义的内容

### 5.1 用户角色与权限矩阵（RBAC）

| 角色 | 查看薪资 | 修改薪资 | 批量调整 | 提交审批 | 审批 | 查看全员 |
|------|---------|---------|---------|---------|------|---------|
| 部门经理 | 本团队 | 本团队 | 本团队 | ✅ | ❌ | ❌ |
| HRBP | 负责部门 | ❌（建议） | ❌ | ❌ | ✅ | 负责部门 |
| HR 管理员 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 高管 | 直属团队 | 直属团队 | ❌ | ✅ | ✅ | ❌ |

**PM 需定义**：
- [ ] 每个角色的 Agent 可调用哪些 Tool
- [ ] 超出权限时 Agent 的话术（拒绝 or 引导审批）
- [ ] 敏感操作（如批量调整）的二次确认规则

---

### 5.2 对话流程设计（Happy Path + 异常路径）

**PM 需输出**：完整的对话流程图，包含：

```
Happy Path 示例：
用户："给张三涨 15%"
  → Agent 确认："张三，当前薪资 20000，涨 15% 后为 23000，是否确认？"
  → 用户："确认"
  → Agent 执行 + 反馈："已保存，预算消耗 3000/月，剩余预算 XX 万"

异常路径（PM 必须定义）：
1. 超出调薪上限 → 提示上限 + 引导走特批流程
2. 预算不足 → 显示剩余预算 + 建议调整方案
3. 员工不存在 → 模糊匹配 + 让用户确认
4. 权限不足 → 说明原因 + 引导联系 HR
5. 系统异常 → 友好提示 + 保存草稿
6. 用户意图不明确 → 追问槽位（最多追问 2 次）
```

---

### 5.3 调薪政策规则（Policy Engine）

**PM 需与 HR 确认并文档化**：

```yaml
salary_policy_2026:
  # 调薪幅度限制
  adjustment_limits:
    A_plus:  { min: 10%, max: 25%, budget_weight: 1.5 }
    A:       { min: 8%,  max: 20%, budget_weight: 1.3 }
    B_plus:  { min: 5%,  max: 15%, budget_weight: 1.1 }
    B:       { min: 3%,  max: 10%, budget_weight: 1.0 }
    C:       { min: 0%,  max: 5%,  budget_weight: 0.5 }

  # 特殊情况
  special_cases:
    promotion:     { additional_max: 10% }  # 晋升额外上限
    market_adjust: { requires_approval: HRBP }

  # 预算控制
  budget:
    total_ratio: 8%          # 总薪酬包涨幅
    department_cap: 12%      # 单部门上限
    individual_cap: 30%      # 单人上限（含晋升）

  # 审批触发条件
  approval_triggers:
    - condition: "adjustment > 20%"
      approver: "HR Director"
    - condition: "adjustment > 15% AND no_promotion"
      approver: "HRBP"
```

---

### 5.4 Agent 话术规范（Tone & Voice）

**PM 需定义**：

```
基本原则：
- 专业但不冷漠，像一个靠谱的 HR 助理
- 数字必须精确，不能模糊
- 操作前必须确认，操作后必须反馈
- 错误提示要给出解决方案，不只说"不行"

话术示例：
✅ "张三（P6，技术部）当前月薪 20,000 元，涨 15% 后为 23,000 元，
    月增 3,000 元。本次调整符合 A 级绩效政策范围（8%-20%）。
    确认保存吗？"

❌ "已更新张三薪资。"（信息不足）
❌ "操作失败，请重试。"（没有原因和解决方案）

禁止行为：
- 不得主动推荐调薪幅度（避免合规风险）
- 不得透露其他员工薪资给无权限用户
- 不得在未确认的情况下执行写入操作
```

---

### 5.5 数据埋点与可观测性

**PM 需定义的埋点事件**：

| 事件 | 触发时机 | 关键属性 |
|------|---------|---------|
| `agent_session_start` | 打开 AI 面板 | user_id, role, task_id |
| `intent_recognized` | 意图识别完成 | intent, confidence, latency |
| `tool_called` | 调用工具 | tool_name, params, duration |
| `action_confirmed` | 用户确认操作 | action_type, employee_id |
| `action_cancelled` | 用户取消操作 | action_type, cancel_reason |
| `salary_saved` | 薪资保存成功 | employee_id, old_salary, new_salary, adjustment_pct |
| `plan_submitted` | 方案提交审批 | plan_id, total_people, total_budget |
| `agent_error` | Agent 报错 | error_type, intent, tool_name |

---

### 5.6 Human-in-the-Loop 节点定义

**哪些操作必须人工确认**（PM 必须明确）：

```
Level 1 - 自动执行（无需确认）：
  - 查询类操作（查进度、查薪资、查政策）
  - 生成建议（不写入）

Level 2 - 单次确认（展示变更摘要后确认）：
  - 单人薪资调整
  - 填写调薪理由

Level 3 - 二次确认（高风险操作）：
  - 批量调整（影响 5 人以上）
  - 调整幅度 > 15%
  - 提交审批（不可撤销）

Level 4 - 需要额外审批人介入：
  - 超出政策上限的特批
  - 预算超支
```

---

## 六、落地路线图（分阶段）

### Phase 1：MVP（4-6 周）
```
目标：替换 Demo 的 mock 数据，接入真实 HR 系统
范围：
  ✅ Orchestrator Agent + Intent Agent（LLM 意图识别）
  ✅ Data Agent（接入 HR 系统 API）
  ✅ Comp Agent（基础调薪计算 + 政策校验）
  ✅ 单人调薪对话流程
  ✅ 基础权限控制
不包含：
  ❌ 批量调整
  ❌ 审批流
  ❌ 市场对标
```

### Phase 2：完整功能（6-8 周）
```
目标：完整的调薪工作流
范围：
  ✅ Approval Agent（审批流集成）
  ✅ 批量调整功能
  ✅ 企业微信/钉钉通知
  ✅ 操作审计日志
  ✅ 多轮对话上下文记忆
```

### Phase 3：智能增强（持续迭代）
```
目标：从"执行工具"升级为"决策助手"
范围：
  ✅ 市场薪酬对标分析
  ✅ 调薪建议生成（基于绩效+市场+内部公平性）
  ✅ 预算优化建议
  ✅ 异常检测（薪酬倒挂、内部公平性问题）
  ✅ RAG 接入政策文档库
```

---

## 七、关键风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| LLM 幻觉导致错误调薪 | 高 | 所有写操作必须人工确认；数字计算用代码而非 LLM |
| 薪资数据泄露 | 极高 | 严格 RBAC；日志脱敏；传输加密 |
| 意图识别错误 | 中 | 低置信度时追问；操作前展示解析结果 |
| HR 系统 API 不稳定 | 中 | 降级到草稿模式；友好错误提示 |
| 用户不信任 AI | 中 | 透明展示 AI 的推理过程；保留人工操作入口 |

---

## 八、与现有 Demo 的映射关系

| Demo 模块 | 落地对应 | 升级点 |
|-----------|---------|-------|
| `intentRecognizer.js`（正则） | Intent Agent | 换成 LLM Function Calling |
| `orchestratorAgent.js` | Orchestrator Agent | 加入 LangGraph 状态图 |
| `actionAgent.js` | Comp Agent Tools | 接入真实 HR API |
| `stateAgent.js`（轮询） | 后端事件推送 | WebSocket 实时更新 |
| `uiRenderAgent.js` | 前端 UI 层 | 保留，接入 SSE 流式输出 |
| `botState.js` | Redis 会话状态 | 持久化到后端 |
| `mockData.js` | HR 系统 API | 替换为真实数据接口 |
