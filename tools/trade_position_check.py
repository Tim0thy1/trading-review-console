#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
trade_position_check.py — 成交位置核验（每日 AI 改作业的复盘证据引擎）
======================================================================
定位边界（重要，勿越界）：
    位置% 是【事后复盘】的证据、用来识别"这笔单是不是临场情绪冲动"，
    是给 AI 判断「追涨杀跌/止损止盈」维度提供客观依据；它【绝不是】
    买卖与否的判定标准。是否开仓由盘前预案与触发价决定，是否止损由
    预设止损位决定——位置% 高≠不能买（强趋势股右侧突破买入天然在高位，
    只要那是预案里写好的计划就行）；位置% 低也不代表就该无脑买。

原则：AI 判断"追涨杀跌/止损止盈"等行为维度时，不得仅依赖文字回忆，
而是对照每笔成交与该股当天的日K（开/高/低/收），算出成交价处于当日
振幅的百分位，作为行为特征的客观信号。

用法：
    python3 tools/trade_position_check.py            # 读 live-snapshot.json 全量核验
    python3 tools/trade_position_check.py 20260911   # 只核验指定日期之后

依赖：pip install akshare --break-system-packages -q
来源：腾讯/新浪开盘数据(akshare)  ·  时效：以当日日K为准
行为特征标签（仅复盘用，非买卖指令；同笔单换周期结论会变，当日尺度≈
识别"是否跟着分时情绪在高点冲动/低点恐慌"的一个线索）：
    买入位置% >=70 → 追高⚠️   >=55 → 偏高   否则 → 理性✓
    卖出位置% <=30 → 杀跌⚠️   <=45 → 偏低   否则 → 理性✓
   （位置% = (成交价-当日最低)/(当日最高-当日最低)*100）
"""
import sys, json, os, time
import akshare as ak

HERE = os.path.dirname(os.path.abspath(__file__))
SNAP = os.path.join(HERE, '..', 'live-snapshot.json')

def symbol_of(code):
    if code.startswith(('0', '3')): return 'sz' + code
    if code.startswith('6'): return 'sh' + code
    if code.startswith('43') or code.startswith('8'): return 'bj' + code
    return 'sh' + code

def pos_pct(px, o, h, l):
    if h - l < 1e-9: return 50.0
    return (px - l) / (h - l) * 100

def judge(trade, o, h, l, c):
    px = float(trade['px'])
    p = pos_pct(px, o, h, l)
    d = trade['dir']
    if d == '买':
        if p >= 70: verdict, flag = '追高⚠️', 'red'
        elif p >= 55: verdict, flag = '偏高', 'warn'
        else: verdict, flag = '理性✓', 'green'
    else:
        if p <= 30: verdict, flag = '杀跌⚠️', 'red'
        elif p <= 45: verdict, flag = '偏低', 'warn'
        else: verdict, flag = '理性✓', 'green'
    return p, verdict, flag

def load_snapshot_trades():
    try:
        with open(SNAP, 'r', encoding='utf-8') as f:
            snap = json.load(f)
        at = snap.get('all_trades') or snap.get('trade_history')
        if at: return at
    except Exception:
        pass
    # 回退：快照若无全量流水，读账本已合并的全量调仓（带 code/dir/px/time）
    p = os.path.join(HERE, '..', 'data', 'ledger.json')
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f).get('trades', [])
    except Exception as e:
        print(f'[MISSING] 无法读取成交记录: {e}')
        return []

def main():
    since = sys.argv[1] if len(sys.argv) > 1 else None
    trades = load_snapshot_trades()
    if not trades:
        print(f'[MISSING] live-snapshot.json 无成交记录: {SNAP}'); return
    # 缓存日K，避免重复请求
    cache = {}
    rows = []
    for t in trades:
        dt = t['time'][:10]
        if since and dt < since: continue
        code = t['code']
        key = (code, dt)
        if key in cache:
            k = cache[key]
        else:
            try:
                df = ak.stock_zh_a_daily(symbol=symbol_of(code),
                                         start_date=dt.replace('-', ''),
                                         end_date=dt.replace('-', ''),
                                         adjust='qfq')
                k = None if df.empty else (float(df.iloc[0]['open']), float(df.iloc[0]['high']),
                                           float(df.iloc[0]['low']), float(df.iloc[0]['close']))
            except Exception as e:
                k = None; print(f'[FAIL] {dt} {t["name"]} 取K线失败: {str(e)[:60]}', file=sys.stderr)
            cache[key] = k
        if not k:
            print(f'[MISSING] {dt} {t["name"]} 无该股日K，无法核验点位'); continue
        o, h, l, c = k
        p, verdict, flag = judge(t, o, h, l, c)
        rows.append((dt, t['name'], t['dir'], t['px'], o, h, l, c, round(p, 1), verdict, flag, t['time'][11:]))
    # 按日期倒序输出
    rows.sort(key=lambda r: r[0], reverse=True)
    print(f"{'日期':<12}{'个股':<8}{'方向':<4}{'成交价':<9}{'开':<8}{'高':<8}{'低':<8}{'收':<8}{'位置%':<7}判定")
    print('-' * 95)
    for r in rows:
        print(f"{r[0]:<12}{r[1]:<8}{r[2]:<4}{r[3]:<9}{r[4]:<8}{r[5]:<8}{r[6]:<8}{r[7]:<8}{r[8]:<7}{r[9]}({r[11]})")

if __name__ == '__main__':
    main()