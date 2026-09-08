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
