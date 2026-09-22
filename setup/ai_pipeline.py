#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ai_pipeline.py — AI 分析回写链路的「取数 + 规整」封装
=====================================================
角色：在本机本地执行的辅助脚本，负责：

 1. 汇总「待 AI 分析的原料上下文」，输出到 data/_ai_context.json：
    - 账户权威数据（live-snapshot.json）
    - 完整账本摘要（ledger.json：account / summary / equity_points 尾部）
    - 近期盘前预测与复盘（forecast.json）
    - 近若干条修炼手记（journal.json）
    生成后，AI 基于这份上下文，对 eval / realm / journal / review 等
    涉及判断文字的部分作分析，并把结果回写对应 JSON。

 2. 规整各数据文件的 updated_at / data_date（缺则补，不覆盖已有的）。

用法：
  python3 setup/ai_pipeline.py                # 生成 data/_ai_context.json
  python3 setup/ai_pipeline.py --check        # 只校验 JSON 合法性 + 打印最新时间戳

输出：
  data/_ai_context.json（可由 data-loader 忽略，仅作 AI 输入）
"""
import json, os, datetime, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TODAY = datetime.date.today().isoformat()


def load(name, default=None, in_data=True):
    p = os.path.join(DATA, name) if in_data else os.path.join(ROOT, name)
    if not os.path.exists(p):
        return default
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[warn] {name} 解析失败: {e}")
        return default


def tail(seq, n=10):
    return seq[-n:] if isinstance(seq, list) else seq


def head(seq, n=10):  # entries 等按新→旧倒序排列，取头部=最近的
    return seq[:n] if isinstance(seq, list) else seq


def build_context():
    snap = load("live-snapshot.json", {}, in_data=False)  # 根目录
    ledger = load("ledger.json", {})
    forecast = load("forecast.json", {})
    journal = load("journal.json", {})
    review = load("review.json", {})
    eval_ = load("eval.json", {})
    realm = load("realm.json", {})

    acc = snap.get("account", {})
    led_acc = ledger.get("account", {})
    eq = ledger.get("equity_points", [])

    ctx = {
        "generated_by": "setup/ai_pipeline.py",
        "generated_at": TODAY,
        "今日账户权威数据": {
            "总资产(real)": acc.get("total_assets"),
            "收益率%": acc.get("total_return_pct"),
            "仓位%": acc.get("position_pct"),
            "现金": acc.get("cash"),
            "当日盈亏(daily_pnl)": acc.get("daily_pnl"),
            "前收总资产": acc.get("prev_total_assets"),
            "基准说明": acc.get("basis"),
            "历史总收益率(ledger)": led_acc.get("real_return_pct"),
            "当日净值变化(ledger)": (
                round(eq[-1]["close"] - eq[-2]["close"], 2)
                if len(eq) >= 2 else None
            ) if eq else None,
        },
        "当前持仓": snap.get("positions", []),
        "近期调仓(近15笔)": tail(ledger.get("trades", []), 15),
        "已了结盈亏摘要": {
            "summary": review.get("summary"),
            "positions": review.get("positions", []),
        },
        "胜率口径": {
            "成交级": {"win": acc.get("deal_win"), "fail": acc.get("deal_fail"),
                      "rate": acc.get("deal_rate")},
            "股票级": ledger.get("summary") if isinstance(ledger.get("summary"), dict)
                      else led_acc,
        },
        "近期修炼手记": head(journal.get("entries", []), 6),
        "近期盘前预测与复盘": (
            tail(forecast, 10)
            if isinstance(forecast, list)
            else (tail(forecast.get("history", []), 10) if isinstance(forecast, dict) else forecast)
        ),
        "当前评测与境界(摘要，供延续上下文)": {
            "eval_sections": [{"id": s.get("id"), "title": s.get("title"),
                                "summary": s.get("summary")} for s in eval_.get("sections", [])],
            "realm_current": realm.get("current"),
        },
    }
    return ctx


def touch_meta(obj, where):
    """补 _meta.updated_at/data_date（不覆盖已有）"""
    if not isinstance(obj, dict):
        return
    meta = obj.setdefault("_meta", {})
    meta.setdefault("updated_at", TODAY)
    meta.setdefault("data_date", TODAY)
    meta["touched_by"] = "ai_pipeline.py"


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print("written:", os.path.relpath(path, ROOT))


def main():
    do_check = "--check" in sys.argv

    # —— 规整所有 AI 交付 JSON 的 meta（不覆盖已有值）——
    if not do_check:
        for fn in ("review.json", "eval.json", "realm.json", "journal.json"):
            d = load(fn, {})
            if isinstance(d, dict):
                touch_meta(d, fn)
                write_json(os.path.join(DATA, fn), d)

    # —— 生成 AI 上下文 ——
    ctx = build_context()
    out_path = os.path.join(DATA, "_ai_context.json")
    if do_check:
        # check 模式只打印不写
        stamp = {"review": (load("review.json") or {}).get("_meta"),
                 "eval": (load("eval.json") or {}).get("_meta"),
                 "realm": (load("realm.json") or {}).get("_meta"),
                 "journal": (load("journal.json") or {}).get("_meta")}
        print("== 最新 data 时间戳 ==")
        for k, v in stamp.items():
            m = v or {}
            print(f"  {k:8s} updated_at={m.get('updated_at')}  data_date={m.get('data_date')}")
        print("== 上下文关键量 ==")
        print("  报告生成于:", ctx.get("generated_at"),
              "| 总资产:", ctx["今日账户权威数据"]["总资产(real)"],
              "| 手记条目:", len((load('journal.json') or {}).get('entries', [])),
              "| forecast 条:", forecast_list_len(load('forecast.json')))
        return
    write_json(out_path, ctx)
    print("AI 上下文已生成:", os.path.relpath(out_path, ROOT))
    print("下一步：AI 读取 data/_ai_context.json 分析 → 回写 eval/realm/journal/review → 再跑 check 校验 → commit+push")


def forecast_list_len(fc):
    if isinstance(fc, list):
        return len(fc)
    if isinstance(fc, dict):
        return len(fc.get("history", []))
    return 0


if __name__ == "__main__":
    main()