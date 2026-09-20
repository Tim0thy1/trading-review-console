/* assets/holdings.js — 持仓档案模块：以「每笔持股」为单位的作战记录
   记录结构：开仓(赚什么钱/理由/预计走势/止盈止损点位) → 持有过程(想法/操作修改) → 清仓(止盈止损理由/是否遵守) → AI整笔评分
   数据文件：data/holdings.json（GitHub 同步，复用 forecast 的 amend 保存机制，避免同天堆多条提交） */
(function(){
  var REPO = 'Tim0thy1/trading-review-console';
  var FILE = 'data/holdings.json';
  var TOKEN_KEY = 'wb_token_v1';

  function getToken(){ try{ return localStorage.getItem(TOKEN_KEY) || ''; }catch(e){ return ''; } }
  function todayStr(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function nowTime(){
    var d = new Date();
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function nlbr(s){ return esc(s||'').replace(/\n/g,'<br>'); }
  function tx(cls,s){ return esc(s==null?'':String(s)).replace(/"/g,'&quot;'); }

  var holdings = [];

  /* ---------- 加载（本地 + GitHub，双源兜底） ---------- */
  async function loadLocal(){ try{ var r=await fetch('data/holdings.json',{cache:'no-store'}); if(!r.ok) return null; var j=await r.json(); return j&&Array.isArray(j.holdings)?j:null; }catch(e){ return null; } }
  async function loadFromGit(){
    var t=getToken(); if(!t) return null;
    try{
      var res=await fetch('https://api.github.com/repos/'+REPO+'/contents/'+FILE,{ headers:{'Authorization':'token '+t,'Accept':'application/vnd.github+json'},cache:'no-store'});
      if(res.status===404) return { holdings:[] };
      if(!res.ok) throw new Error('HTTP '+res.status);
      var j=await res.json();
      return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,'')))));
    }catch(e){ console.warn('holdings 从 GitHub 加载失败，回退本地:',e.message); return null; }
  }

  /* ---------- 保存（amend：若主分支头部同为当天 holdings 提交则改写，否则普通追加） ---------- */
  async function saveToGit(data){
    var t=getToken(); if(!t) return false;
    var msg='holdings: 更新持仓档案 ('+todayStr()+')';
    var content=JSON.stringify(data,null,2);
    var headers={'Authorization':'token '+t,'Accept':'application/vnd.github+json','Content-Type':'application/json'};
    var base='https://api.github.com/repos/'+REPO;
    try{
      var refRes=await fetch(base+'/git/ref/heads/main',{headers:headers,cache:'no-store'});
      if(!refRes.ok) throw new Error('ref '+refRes.status);
      var headSha=(await refRes.json()).object.sha;
      var headCommit=await (await fetch(base+'/git/commits/'+headSha,{headers:headers})).json();
      var isSame=(headCommit.message||'').indexOf(msg)===0;
      if(isSame){
        var blobRes=await fetch(base+'/git/blobs',{method:'POST',headers:headers,body:JSON.stringify({content:content,encoding:'utf-8'})});
        var blobSha=(await blobRes.json()).sha;
        var treeRes=await fetch(base+'/git/trees',{method:'POST',headers:headers,body:JSON.stringify({base_tree:headCommit.tree.sha,tree:[{path:FILE,mode:'100644',type:'blob',sha:blobSha}]})});
        var treeSha=(await treeRes.json()).sha;
        var parentSha=(headCommit.parents&&headCommit.parents.length)?headCommit.parents[0].sha:null;
        var comRes=await fetch(base+'/git/commits',{method:'POST',headers:headers,body:JSON.stringify({message:msg,tree:treeSha,parents:parentSha?[parentSha]:[]})});
        var newSha=(await comRes.json()).sha;
        var curRes=await fetch(base+'/git/ref/heads/main',{headers:headers,cache:'no-store'});
        if((await curRes.json()).object.sha===headSha){
          var upd=await fetch(base+'/git/refs/heads/main',{method:'PATCH',headers:headers,body:JSON.stringify({sha:newSha,force:true})});
          return upd.ok;
        }
      }
      var sha=null; var r0=await fetch(base+'/contents/'+FILE,{headers:headers});
      if(r0.ok){ sha=(await r0.json()).sha; }
      var body={message:msg,content:btoa(unescape(encodeURIComponent(content))),branch:'main'};
      if(sha) body.sha=sha;
      var res=await fetch(base+'/contents/'+FILE,{method:'PUT',headers:headers,body:JSON.stringify(body)});
      return res.ok;
    }catch(e){ console.warn('holdings 保存失败:',e.message); return false; }
  }

  /* ---------- 渲染单笔持股卡片 ---------- */
  function moneyBadge(t){
    var map={};
    var col,lab;
    if((t||'').indexOf('筹码')>=0){ col='var(--red)'; }
    else if((t||'').indexOf('情绪')>=0){ col='var(--red)'; }
    else if((t||'').indexOf('α')>=0 && (t||'').indexOf('β')>=0){ col='var(--accent)'; }
    else if((t||'').indexOf('α')>=0){ col='var(--accent2)'; }
    else if((t||'').indexOf('β')>=0){ col='var(--green)'; }
    else { col='var(--muted)'; }
    return '<span style="font-size:11px;font-weight:700;color:'+col+';border:1px solid '+col+';border-radius:99px;padding:2px 9px">'+esc(t||'未标赚钱类型')+'</span>';
  }
  function stPill(st){
    if(st==='closed') return '<span class="pill r">已清仓</span>';
    if(st==='open') return '<span class="pill g">持有中</span>';
    return '<span class="pill">—</span>';
  }

  function renderHoldRecord(h){
    var o=h.open||{};
    var fid='hd-'+h.id;
    var holdList=(h.hold||[]).map(function(n){
      var tag = n.type==='操作修改' ? '<span style="font-size:10.5px;color:#fff;background:#d97706;border-radius:4px;padding:0 5px;font-weight:700">操作修改</span>'
        : '<span style="font-size:10.5px;color:var(--muted)">想法</span>';
      return '<div style="margin-bottom:6px;padding:8px 10px;background:var(--bg3);border:1px solid var(--rule);border-radius:8px">'
        + '<div style="font-size:11px;color:var(--muted);margin-bottom:3px"><span class="mono">'+esc(n.date)+'</span> '+tag+'</div>'
        + '<div style="font-size:12.5px;line-height:1.65;color:var(--ink)">'+nlbr(n.content)+'</div></div>';
    }).join('') || '<div style="font-size:12px;color:var(--muted)">暂无持有记录。</div>';

    var exitHtml;
    if(h.exit){
      var ex=h.exit;
      var follow = ex.follow_plan ?
        '<span style="color:var(--green);font-weight:700">✓ 遵守开仓约定</span>'
        : '<span style="color:var(--red);font-weight:700">✗ 偏离开仓约定</span>';
      exitHtml = '<div style="background:var(--bg3);border:1px solid '+(ex.follow_plan?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)')+';border-radius:10px;padding:10px 12px;margin-top:10px">'
        + '<div style="font-size:11px;color:var(--muted)">清仓 · <span class="mono">'+esc(ex.date)+'</span> · '+esc(ex.action||'')+' @ '+esc(ex.price||'—')+'</div>'
        + '<div style="font-size:12.5px;line-height:1.65;margin-top:5px">'+nlbr(ex.reason)+'</div>'
        + '<div style="margin-top:6px;font-size:12.5px">'+follow+'</div></div>';
    } else {
      exitHtml = '<div style="font-size:12px;color:var(--muted);margin-top:8px">尚未清仓。</div>';
    }

    var aiHtml;
    if(h.ai_review){
      var ar=h.ai_review;
      aiHtml = '<div style="background:linear-gradient(135deg,rgba(13,148,136,.10),rgba(217,119,6,.06));border:1px solid rgba(13,148,136,.35);border-radius:10px;padding:12px 14px;margin-top:10px">'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:11px;letter-spacing:.08em;color:var(--muted)">AI 整笔评分</span>'
        + '<b class="mono" style="font-size:22px;color:'+(ar.score>=70?'var(--green)':ar.score>=40?'var(--accent2)':'var(--red)')+'">'+esc(String(ar.score==null?'—':ar.score))+'</b><span style="color:var(--muted)">/100</span>'
        + '<span style="font-size:10.5px;color:var(--muted)">结算于 '+esc(ar.judged_at||'')+'</span></div>'
        + '<div style="font-size:12.5px;line-height:1.7;margin-top:6px;color:var(--ink)">'+nlbr(ar.verdict)+'</div></div>';
    } else if(h.status==='closed'){
      aiHtml = '<div style="font-size:12px;color:var(--muted);margin-top:8px">该笔已清仓，AI 评分待结算复盘补充。</div>';
    }

    return '<div class="dl-block" style="border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--bg2)" data-hid="'+esc(h.id)+'">'
      + '<div class="dl-head" style="padding:15px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
      + '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-weight:800;font-size:16px">'+esc(h.name)+'</span>'
      + '<span class="mono" style="color:var(--muted);font-size:12px">'+esc(h.code)+' · '+esc(h.round||'')+'</span>'
      + stPill(h.status)+' '+moneyBadge(o.money_type)+'</div>'
      + '<div style="font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.6">'+esc(firstLine(o.reason||'（开仓理由待补）'))+'</div></div>'
      + '<span class="dl-arrow" style="flex:0 0 auto;color:var(--muted);font-size:12.5px;white-space:nowrap">展开 ▾</span></div>'
      + '<div class="hd-body" style="display:none;padding:4px 18px 18px;border-top:1px solid var(--rule)">'

      + '<div style="margin-top:14px"><div style="font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">① 开仓 · '+esc(o.date||'')+'</div>'
      + '<div style="display:grid;gap:8px">'+field('赚钱类型', moneyBadge(o.money_type), '', 'money', h.id, o)
      + field('理由 / 看法', o.reason, '', 'reason', h.id, o)
      + field('预计走势', o.view, '预计怎么走', 'view', h.id, o)
      + field('预计止盈', o.tp, '到什么地方止盈', 'tp', h.id, o)
      + field('止损点位', o.sl, '到什么地方止损', 'sl', h.id, o)
      + '</div></div>'

      + '<div style="margin-top:14px"><div style="font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">② 持有过程 · 想法 / 操作修改的理由</div>'
      + holdList
      + '<div style="display:flex;gap:8px;margin-top:8px"><input id="nhc-'+fid+'" placeholder="新增想法/操作修改的一句话…" value=""'
      + ' style="flex:1;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:8px 10px;color:var(--ink);font-size:12.5px">'
      + '<button type="button" class="nhc-btn" data-hid="'+esc(h.id)+'" style="padding:8px 14px;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;color:var(--accent);font-weight:700;font-size:12.5px;cursor:pointer">＋ 记录</button></div>'
      + '<span id="nhst-'+fid+'" class="token-status" style="display:block;margin-top:4px"></span></div>'

      + '<div style="margin-top:14px"><div style="font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">③ 止盈止损 / 清仓</div>'+exitHtml+'</div>'

      + '<div style="margin-top:14px"><div style="font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">④ AI 整笔评分（结算后生成）</div>'
      + (aiHtml||'<div style="font-size:12px;color:var(--muted)">清仓结算后由 AI 对该整笔持股评分。</div>')+'</div>'

      + '<div style="margin-top:14px;border-top:1px dashed var(--rule);padding-top:10px;display:flex;gap:10px;flex-wrap:wrap">'
      + '<button type="button" class="hd-save" data-hid="'+esc(h.id)+'" style="flex:1;padding:10px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:700;font-size:13px;cursor:pointer">💾 保存本笔档案</button>'
      + '<span class="token-status" data-save-status="'+fid+'"></span></div>'
      + '</div></div>';
  }

  function field(label, val, placeholder, key, id, o){
    var fid='hd-'+id+'-'+key;
    var ph = placeholder ? ('placeholder="'+esc(placeholder)+'"') : '';
    return '<label style="font-size:12px;color:var(--muted)"><span style="display:inline-block;min-width:64px">'+esc(label)+'</span>'
      + '<textarea data-hid="'+esc(id)+'" data-k="'+key+'" rows="'+((key==='reason'||key==='view')?2:1)+'" '+ph+' style="width:100%;box-sizing:border-box;background:var(--bg3);color:var(--ink);border:1px solid var(--rule);border-radius:8px;padding:7px 9px;font-size:12.5px;line-height:1.6;margin-top:2px">'+tx('', val)+'</textarea></label>';
  }

  function firstLine(s){ s=(s||'').trim(); var i=s.indexOf('\n'); return i>0?s.slice(0,i):s; }

  function renderAll(){
    var cont=document.getElementById('holdings-list');
    var kpiDays=document.getElementById('hk-days');
    if(kpiDays) kpiDays.textContent=holdings.length;
    var open=holdings.filter(function(h){return h.status!=='closed';}).length;
    var closed=holdings.length-open;
    if(document.getElementById('hk-open')) document.getElementById('hk-open').textContent=open;
    if(document.getElementById('hk-closed')) document.getElementById('hk-closed').textContent=closed;
    var rated=holdings.filter(function(h){return h.ai_review;});
    if(document.getElementById('hk-rated')) document.getElementById('hk-rated').textContent=rated.length;
    if(document.getElementById('hk-avg')){
      document.getElementById('hk-avg').textContent=rated.length?Math.round(rated.reduce(function(s,h){return s+(h.ai_review.score||0);},0)/rated.length)+'':'—';
    }
    if(!cont) return;
    if(!holdings.length){ cont.innerHTML='<div class="panel-sub" style="color:var(--muted)">暂无持仓档案。在开仓一笔持股后，把「赚什么钱/理由/止盈止损点位」写进开仓记录，成为这一笔的作战账本。</div>'; return; }
    cont.innerHTML=holdings.map(renderHoldRecord).join('');
    /* 折叠交互 */
    cont.querySelectorAll('.dl-head').forEach(function(head){
      head.addEventListener('click', function(){
        var body=head.parentElement.querySelector('.hd-body');
        var arrow=head.querySelector('.dl-arrow');
        var open2=body.style.display==='block';
        body.style.display=open2?'none':'block';
        if(arrow) arrow.textContent=open2?'展开 ▾':'收起 ▴';
      });
    });
    bindCardEvents();
  }

  /* 绑定：保存本笔 + 新增持有记录 */
  function bindCardEvents(){
    var saveBtns=document.querySelectorAll('.hd-save');
    saveBtns.forEach(function(btn){
      if(btn.__bound) return; btn.__bound=true;
      btn.addEventListener('click', function(){ saveCard(btn.getAttribute('data-hid')); });
    });
    var nhc=document.querySelectorAll('.nhc-btn');
    nhc.forEach(function(btn){
      if(btn.__bound) return; btn.__bound=true;
      btn.addEventListener('click', function(){
        addHold(btn.getAttribute('data-hid'));
      });
    });
  }

  function cardScope(hid){ return document.querySelector('[data-hid="'+hid+'"]'); }

  /* 保存本笔：把该卡所有开仓 textarea 写回对应 holding，再整份存 GitHub */
  async function saveCard(hid){
    var st=document.querySelector('[data-save-status="'+hid+'"]');
    var h=findH(hid); if(!h) return;
    var scope=cardScope(hid);
    if(!scope) return;
    scope.querySelectorAll('textarea[data-k]').forEach(function(t){
      var k=t.getAttribute('data-k');
      h.open[k]=t.value.trim();
    });
    var ok=await saveAll();
    if(st){
      st.textContent=ok?'✅ 已保存':'❌ 保存失败（检查 token/网络）';
      st.className='token-status'+(ok?'':' err');
      setTimeout(function(){ st.textContent=''; },1800);
    }
    if(ok){ renderAll(); }
  }

  async function addHold(hid){
    var h=findH(hid); if(!h) return;
    var inp=cardScope(hid) ? cardScope(hid).querySelector('.nhc-btn').previousElementSibling : null;
    var val=inp?inp.value.trim():'';
    if(!val){ var stn=document.getElementById('nhst-'+'hd-'+hid); if(stn){ stn.textContent='先写下一点内容吧'; stn.className='token-status err'; } return; }
    if(!h.hold) h.hold=[];
    h.hold.push({ date: todayStr(), type:'想法', content:val });
    var ok=await saveAll();
    if(ok){
      if(inp) inp.value='';
      var stn=document.getElementById('nhst-'+'hd-'+hid);
      if(stn){ stn.textContent='✅ 已记录'; stn.className='token-status'; setTimeout(function(){ stn.textContent=''; },1500); }
      renderAll();
    } else {
      var stn2=document.getElementById('nhst-'+'hd-'+hid);
      if(stn2){ stn2.textContent='❌ 保存失败'; stn2.className='token-status err'; }
    }
  }

  function findH(hid){ return holdings.filter(function(h){return h.id===hid;})[0]||null; }

  async function saveAll(){
    var data={ _meta: holdings._meta || { desc:'每笔持股档案', updated_at:todayStr(), count:holdings.length, data_date:todayStr() }, holdings:holdings };
    data._meta.updated_at=todayStr(); data._meta.count=holdings.length; data._meta.data_date=todayStr();
    var ok=await saveToGit(data);
    if(ok){ localStorage.setItem('holdings_last_saved', JSON.stringify(data)); }
    return ok;
  }

  async function init(){
    var git=await loadFromGit();
    if(git && Array.isArray(git.holdings)){ holdings=git.holdings; holdings._meta=git._meta; }
    else { var local=await loadLocal(); if(local){ holdings=local.holdings||[]; holdings._meta=local._meta; } }
    holdings=holdings||[];
    if(!Array.isArray(holdings)) holdings=[];
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();