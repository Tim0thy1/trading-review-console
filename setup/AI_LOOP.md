# AI 分析回写链路（AI LOOP）

> 目标：让「东财数据 → 确定性脚本」与「AI 判断文字 → 回写 JSON → 页面动态更新」两条通道清晰分离，
> 每次复盘按同一套步骤执行，保证口径一致、数字不被 AI 污染。

## 总体流向

```text
东财 API
  │  sync_eastmoney.py（确定性，脚本）
  ▼
live-snapshot.json ──┐
ledger.json (gen_ledger.py 重建) ──┼─▶ setup/ai_pipeline.py 汇总
review.json ─────────┘        │
                              ▼
                  data/_ai_context.json（AI 的输入原料）
                              │  AI 分析（判断文字，禁止改数字）
                              ▼
  回写 eval.json / realm.json / journal.json / review.json（仅判断字段）
                              │  git commit + push
                              ▼
                  GitHub Pages 动态更新（data-loader.js 渲染）
```

## 职责边界（最关键）

| 数据 | 归属 | 由谁产出 | AI 能否改 |
|---|---|---|---|
| 账户总资产 / 收益率 / 仓位 / 现金 / 当日盈亏 | live-snapshot.json → account | sync_eastmoney.py（东财权威） | ❌ 禁止 |
| 逐日净值 / 已了结逐票盈亏 / 胜率 | ledger.json / review.json 数字字段 | gen_ledger.py / 东财口径 | ❌ 禁止改数字 |
| 盘前预测与复盘评分 | forecast.json | 用户填写 + 收盘对账 | ❌ 禁止改用户输入 |
| 全面评测文字（eval.sections[].html/summary） | eval.json | AI | ✅ 只写判断文字 |
| 修炼境界定位与各块（realm.current / sections） | realm.json | AI（依托 ledger+journal） | ✅ 只写判断文字 |
| 修炼手记条目（journal.entries[]） | journal.json | 用户/AI 协作 | ✅ 可追加（标注 AI 生成） |
| 已了结持仓的「教训/归因」文字字段 | review.json（note/hint 类） | AI | ✅ 只写文字 |

**核心纪律**：AI 只能写 `html / summary / note / desc / content` 这类**判断与叙述字段**；
凡是带数字的权威字段（pnl、total_assets、win_rate、equity_points…）一律以脚本/东财为准，
AI 不得改写，也**不得凭空编造缺失的数字**——缺的字段留空并向用户说明。

**评分标准（满 100 = 方向25 + 个股25 + 预案25 + 纪律25）——按「上班族 + 开盘半小时盯盘 + 中线持有」真实能力设计，绝不逼精确点位**：
- 方向 25分：只判方向级（涨/跌/平，或低开高走/高开低走），完全命中 25 / 相邻 10 / 反向 0。
- 个股 25分：中线口径。不追价位，看是否守住持有逻辑（趋势/主线/基本面未破）：守住=满分，趋势走坏仍不处理=扣分。方向对 15 + 中线持有合理性 10。
- 预案 25分：轻量触发句。开盘半小时能执行、有"条件+动作"=25；写了未触发=20；模糊=8；没写=0。
- 纪律 25分：操作是否在预案内、是否守住中线不加乱仓：全在=25；1 笔计划外=扣8；焦躁/亢奋仍交易=再扣7。
- 判分时不要因"点位不精确"扣分——那不是他该有的能力项；他做得到的是方向、持有逻辑、预案、纪律这四项。

## 触发暗号：`前辈，干活了`（= 每日改作业）

> 用户喊出这句暗号，即要求执行一轮完整「改作业」。执行体把当天数据、AI 批改、
> 修炼进度、推送全部一次做完，并回报一句复盘小结。口径与边界遵循上文职责表。

### 改作业 = 5 步（按序）
1. **取数对账**：跑 `sync_eastmoney.py`（或读已由 GitHub Actions 同步好的 `live-snapshot.json`），
   再 `python3 gen_ledger.py` 重建账本；确保账户数字为东财权威、净值到当日。
2. **核验成交位置**：`python3 tools/trade_position_check.py` 把当日成交对照日K算出位置%；
   **仅作复盘证据**，识别是否临场情绪冲动，绝不据此判定买卖权限（见该文件定位边界）。
3. **汇总原料**：`python3 setup/ai_pipeline.py` 生成 `data/_ai_context.json`。
4. **AI 批改**：读当日盘前预测+盘中+盘后+成交+盘面，产出并回写：
   - `forecast.json` 当日 review（盘面实际 actual + 七维 judge + overall）——只动判断字段
     - **对账点评只点评当天**：当日 review 的 actual / judge / overall 一律聚焦当天这台行情
       与实际操作，不得把历史单（如往日的追高/杀跌/满仓）拉进当天点评做对照；
       跨周期的综合评估（追涨杀跌成性、止损节奏、能力进化）只放在全景评估里做。
   - `realm.json` `current`（境界/进度随资金与成熟度演进）
   - `eval.json` sections（全面评测当日复盘）
   - `journal.json` entries 头部插入当日修炼手记（`latest:true`，去掉旧 latest）
   - 复盘里「位置% 高 ≠ 不能买」等判读口径，落进批改注释而非当禁令
5. **六处自检 + 推送**：先按下方「每日六处同步自检」逐项打勾（账户总览/调仓流水/复盘日历/收益日历/盘前预测/全景评估）；
   `python3 setup/ai_pipeline.py --check` 校验 JSON 合法 && 时间戳更新；
   **六处全部命中当日** 才 `git add data/ setup/ tools/ && git commit -m "改作业: <日期>" && git push`，再由 AI 回报小结。

### 改作业的边界（不许越）
- 数字权威字段（total_assets / pnl / win_rate / equity_points…）一律以脚本/东财为准，AI 只读不改。
- 用户写的盘前/盘中/盘后文字，AI 不改写，只据此批改与点评。
- 位置% 是复盘信号不是买卖令；是否有预案、是否破止损，才是开平仓的判断依据。
- 数据缺失、接口不可达 → 如实标注 `[MISSING]` 并告知，绝不臆造数字。

## 标准步骤（每次复盘）

1. **取数**：运行 `sync_eastmoney.py` 与 `gen_ledger.py`（在 portfolio-update-0807 目录），
   确保 `live-snapshot.json` / `ledger.json` / `review.json` 为最新权威数据。
2. **汇总原料**：`python3 setup/ai_pipeline.py` → 生成 `data/_ai_context.json`。
3. **AI 分析**：读取 `_ai_context.json`，对照当前 eval / realm / journal 已有内容，
   分析后**只回写判断字段**：
   - eval.json：追加/更新 `sections[]`（清仓复盘、阶段总结等）
   - realm.json：更新 `current`（境界定位随资金+成熟度演进）与 `sections[]`
   - journal.json：向 `entries[]` 头部插入当日手记（`latest: true` 标记，并去掉旧条目的 latest）
   - review.json：补充已了结票的归因文字（不动 pnl）
4. **校验**：`python3 setup/ai_pipeline.py --check` 确认全部 JSON 合法、时间戳已更新。
5. **提交推送**：`git add data/ setup/ && git commit -m "复盘: ..." && git push`，
   GitHub Pages 自动更新，页面即时反映。

## 数据文件与渲染对照

| 文件 | 渲染位置 | 渲染方式 |
|---|---|---|
| review.json | #review-cards（已了结持仓盈亏） | data-loader.js 点开展开 |
| eval.json | #eval-sections（交易者全面评测） | data-loader.js 点开展开 |
| realm.json | #realm-current + #realm-sections（修仙境界） | data-loader.js 点开展开 |
| journal.json | #realmJournal（修炼手记） | data-loader.js 折叠显示最新一条 |
| forecast.json | #fc-history-body（盘前预测历史） | 内联脚本，默认前 10 条 |
| ledger.json | 净值曲线/收益日历/历史盈亏/胜率 | charts.js + 内联脚本 |

> 修改这些 JSON 后**无需改 HTML**；页面强刷即可看到新值。

## 每日六处同步自检（防漏铁律）

> 历史教训：曾只同步 forecast 却漏同步 `eval.json`（复盘日历缺当日），又漏同步 `ledger.json` 权益点与 `equity_history.json`（收益日历缺当日），用户反复提醒仍未根治。**根因是数据源分散、靠记忆补，必须改成逐项穷举打勾。**

每次「前辈，干活了」收尾、推送前，必须对下面六处**逐项确认当日日期已出现**，缺一即视为未完成、不得推送：

| # | 控制台模块 | 数据文件 → 字段 | 当日必验 |
|---|---|---|---|
| 1 | 账户总览 / 顶部汇总卡 | `live-snapshot.json` → `account` | 总资产/收益率/仓位/现金与东财一致 |
| 2 | 调仓流水 / 当前持仓 | `live-snapshot.json` → `positions` `all_trades` | 当日新增成交逐条齐全（时间/标的/方向/价） |
| 3 | 复盘日历 / 当日复盘 | `data/eval.json` → `sections[]`（带 `date`） | 日历出现当日、展开可见全文 |
| 4 | 收益日历 / 权益曲线 | `data/ledger.json` → `equity_points` `daily_calendar` + `data/equity_history.json` | 三处末点=当日（收盘总资产/当日盈亏/累计收益率） |
| 5 | 盘前预测 / AI判读七维 | `data/forecast.json` | 当日预测 + `review`(actual/judge/overall) |
| 6 | 历史盈亏 / 胜率 / 全景评估 | `data/ledger.json` → `closed_positions` `summary`（全景另读 forecast） | 当日已了结结算、实时胜率 |

**收尾检验命令**（在 `trading-review-console/` 目录运行）：
```bash
python3 - <<'PY'
import json
def t(x): return x['date']
d=json.load(open('data/ledger.json',encoding='utf-8'))
for k in ('daily_calendar','equity_points'): print(k,'末点',t(d[k][-1]))
print('equity_history 末点', t(json.load(open('data/equity_history.json',encoding='utf-8'))[-1]))
print('eval sections 日期', [s['date'] for s in json.load(open('data/eval.json',encoding='utf-8'))['sections']][:3])
f=json.load(open('data/forecast.json',encoding='utf-8'))
print('forecast 最新', t(f[-1]), '| 有review' if 'review' in f[-1] else '| 无review!(漏同步)')
PY
```
期望每处「末点/最新」都是**当日**。任何一处落后 → 先定位补齐（脚本产出 or AI 补判断字段）再推送，禁止带着旧日期提交。
