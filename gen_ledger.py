#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
东方财富模拟组合「翻81681」账本生成器（gen_ledger.py）
======================================================
从三类输入自动重建 data/ledger.json（含逐日收益日历 equity_points）：
  1) data/equity_history.json  逐日净值历史源（权威/测算，每天更新）
  2) live-snapshot.json        当日账户权威快照（总资产/收益率/仓位/现金）
  3) data/ledger.json 旧版     保留 closed_positions / realized_pnl_total / trades

收益日历（equity_points）按 equity_history 逐日推进，末点对齐当日权威总资产；
另附可选 daily_calendar（date→当日盈亏/累计）便于前端渲染收益日历。

用法：python3 gen_ledger.py [--snap live-snapshot.json] [--out data/ledger.json]
"""
import json, os, argparse, datetime

def load(p, default=None):
    try:
        with open(p, encoding="utf-8") as f: return json.load(f)
    except Exception:
        return default

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snap", default="live-snapshot.json")
    ap.add_argument("--out", default="data/ledger.json")
    ap.add_argument("--hist", default="data/equity_history.json")
    a = ap.parse_args()

    hist  = load(a.hist, []) or []
    snap  = load(a.snap, {}) or {}
    prev  = load(a.out, {}) or {}

    # ---- 逐日收益日历（来源：逐日净值历史，按日期升序、去重保序） ----
    seen, eq = set(), []
    for p in sorted(hist, key=lambda x: x["date"]):
        d = p["date"]; c = round(float(p["close"]), 2)
        if d in seen: continue
        seen.add(d); eq.append({"date": d, "close": c})

    # 末点对齐当日权威总资产
    snap_total = float((snap.get("account") or {}).get("total_assets") or 0)
    if snap_total and eq and eq[-1]["date"] == (snap.get("synced_at") or "")[:10]:
        eq[-1]["close"] = round(snap_total, 2)

    # ---- 收益日历：date -> 当日盈亏 / 累计 ----
    daily_calendar = []
    run_total = 0.0
    base = 50000.0
    for i, p in enumerate(eq):
        close = p["close"]
        daily = round(close - (eq[i-1]["close"] if i else close), 2) if i else 0.0
        run_total = round(close - base, 2)
        daily_calendar.append({
            "date": p["date"],
            "close": close,
            "daily_pnl": daily,
            "cum_return_pct": round((close - base) / base * 100, 2) if i else 0.0,
        })

    # ---- 账户块：以当日权威快照覆盖，缺失字段保留旧值 ----
    acct = dict((prev.get("account") or {}))
    if snap_account := (snap.get("account") or {}):
        acct.update({
            "nominal_assets": round(float(snap_account.get("total_assets") or 0) + 950000.0, 2),
            "real_assets": round(float(snap_account.get("total_assets") or 0), 2),
            "real_return_pct": round(float(snap_account.get("total_return_pct") or 0), 2),
            "position_pct": round(float(snap_account.get("position_pct") or 0), 2),
            "cash": round(float(snap_account.get("cash") or 0), 2),
            "daily_pnl_today": round(float(snap_account.get("daily_pnl") or 0), 2)
            if snap_account.get("daily_pnl") is not None else acct.get("daily_pnl_today"),
        })
        if snap_account.get("start_date"): acct["start_date"] = snap_account["start_date"]
        if prev.get("account", {}).get("survey"):
            acct["survey"] = prev["account"]["survey"]

    # ---- 汇总（沿用旧值，_meta/data_date 更新） ----
    summary = dict((prev.get("summary") or {
        "realized_today": 0, "closed_count": 0, "win_count": 0, "lose_count": 0}))

    meta = {
        "desc": prev.get("_meta", {}).get("desc", "模拟盘完整账本：由 gen_ledger.py 从 equity_history+快照重建。equity_points 为逐日净值序列，末点对齐当日权威总资产。"),
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d"),
        "data_date": (snap.get("synced_at") or datetime.date.today().isoformat())[:10],
        "equity_rebuild": "daily-sequence(gen_ledger)",
    }

    ledger = {
        "_meta": meta,
        "account": acct,
        "closed_positions": prev.get("closed_positions", {}),
        "realized_pnl_total": prev.get("realized_pnl_total", 0.0),
        "reconcil": prev.get("reconcil", {}),
        "trades": prev.get("trades", []),
        "trade_count": prev.get("trade_count", len(prev.get("trades", []))),
        "equity_points": eq,
        "daily_calendar": daily_calendar,
        "summary": summary,
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)
    print(f"已重建账本: {a.out}")
    print(f"  收益日历点数: {len(eq)}  末点: {eq[-1]['date']} {eq[-1]['close']}")
    print(f"  当日权威: 总资产 {acct.get('real_assets')} 收益率 {acct.get('real_return_pct')}% 仓位 {acct.get('position_pct')}%")
    try:
        p = daily_calendar[-3:]
        print("  最近3日(日历): " + " | ".join(f"{x['date']} {x['daily_pnl']:+.0f}" for x in p))
    except Exception:
        pass

if __name__ == "__main__":
    main()