(function(){
'use strict';

/* ---------- 言語 ----------
   html の lang は index.html 先頭のスクリプトが ?lang= と保存した設定から決める。
   HTML の文言は data-l="ja|en" を CSS で切り替え、属性は data-en-*、スクリプトが組み立てる文言は assets/i18n.js の辞書から取る。
   データの文言は *_en(note_en、why_en など)があれば使い、無ければ日本語のまま lang="ja" を付けて出す */
var L = document.documentElement.lang === 'en' ? 'en' : 'ja';
var S = (window.I18N && window.I18N[L]) || window.I18N.ja;
function t(key, vars){
  var s = S[key];
  if (Object.prototype.toString.call(s) === '[object Array]') s = s[vars && vars.n === 1 ? 0 : 1];
  if (typeof s !== 'string') return key;
  return s.replace(/\{(\w+)\}/g, function(m, k){ return vars && vars[k] !== undefined ? vars[k] : m; });
}
function tx(o, f){ return L === 'en' && o[f + '_en'] ? o[f + '_en'] : o[f]; }
function hasTx(o, f){ return L === 'ja' || !!o[f + '_en'] || !o[f]; }
if (L === 'en') {
  var es = document.querySelectorAll('[data-en]'), i;
  for (i = 0; i < es.length; i++) es[i].textContent = es[i].getAttribute('data-en');
  ['placeholder', 'aria-label', 'title', 'content'].forEach(function(a){
    var els = document.querySelectorAll('[data-en-' + a + ']');
    for (var k = 0; k < els.length; k++) els[k].setAttribute(a, els[k].getAttribute('data-en-' + a));
  });
}
/* 言語の切り替えリンクは、いま見ている場所(#picks など)を保つ */
function langLinks(){
  var as = document.querySelectorAll('.lang a');
  for (var i = 0; i < as.length; i++) as[i].href = '?lang=' + as[i].hreflang + location.hash;
}
langLinks();
window.addEventListener('hashchange', langLinks);

/* データは data/ の JSON から読み込む。
   catalog.json: 資料の種類・確認区分の名前と全件の行 / order.json: 読む順の章立て(記事は URL で指す) / picks.json: 厳選 100
   形式は README.md を参照 */
function load(path){
  return fetch(path).then(function(res){
    if (!res.ok) throw new Error(path + ': HTTP ' + res.status);
    return res.json();
  });
}
Promise.all([load('data/catalog.json'), load('data/order.json'), load('data/picks.json')]).then(function(r){
  var D = r[0]; D.order = r[1];
  main(D, r[2]);
}, function(err){
  var m = document.getElementById('load-error');
  m.hidden = false;
  if (window.console) console.error(err);
});

function main(D, P){
var PREFIX = ['https://aws.amazon.com/blogs/publicsector/','https://aws.amazon.com/jp/blogs/news/'];
var BADGE = S.badge;
var SRC_CLASS = ['en','jp','xs'];
var QUICK = ['Technical How-to','Best Practices','Customer Solutions','Higher education','K12','EdTechs','Research','Generative AI','Security Identity & Compliance','AWS Educate'];
var MARK_TEXT = S.markText;
var OUT_TEXT = S.outText;
var NODATE = '0000';
var CHUNK = 150, BAR_H = 92;

function $(id){ return document.getElementById(id); }
function fmt(n){ return n.toLocaleString(L === 'en' ? 'en-US' : 'ja-JP'); }
function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/* データの文言を出す。英語表示で *_en が無いものは日本語のまま lang="ja" を付ける */
function elT(tag, cls, o, f){ var e = el(tag, cls, tx(o, f)); if (!hasTx(o, f)) e.lang = 'ja'; return e; }
function nameOf(list, listEn, i){ return L === 'en' && listEn && listEn[i] ? listEn[i] : list[i]; }
function kindName(i){ return nameOf(D.kinds, D.kinds_en, i); }
function statusName(i){ return nameOf(D.status, D.status_en, i); }
function nameEl(tag, cls, list, listEn, i){ var e = el(tag, cls, nameOf(list, listEn, i)); if (L === 'en' && !(listEn && listEn[i])) e.lang = 'ja'; return e; }

/* ---------- データ ---------- */
function normUrl(u){
  var m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#]*)([^?#]*)/i.exec(String(u).trim());
  if (!m) return String(u).trim();
  var host = m[1].toLowerCase().replace(/^www\./, '');
  return host + m[2].replace(/\/+$/, '');
}
function warn(msg){ if (window.console) console.warn('[data] ' + msg); }
/* 名前を一覧の番号に変える。一覧に無い名前は末尾に足す */
function indexer(list, label){
  var idx = {};
  list.forEach(function(name, i){ idx[name] = i; });
  return function(name){
    if (idx[name] === undefined) { if (label) warn(label + ' に無い名前: ' + name); idx[name] = list.length; list.push(name); }
    return idx[name];
  };
}
var SRC = { en:0, jp:1, other:2 };
var MARK = { '★':1, '☆':2 };
var LISTING = { gap:1, outside:2 };
var pickByUrl = {};
P.forEach(function(p){ pickByUrl[normUrl(p.url)] = p.no; });
D.cats = [];
var catIndex = {}, catOf = indexer(D.cats, null), kindOf = indexer(D.kinds, 'kinds'), statusOf = indexer(D.status, 'status');
/* 厳選の kind(「英語ブログ」「日本語ブログ」と資料の種類)の英語名 */
var KIND_EN = {};
(D.kinds_en || []).forEach(function(k, i){ if (k) KIND_EN[D.kinds[i]] = k; });
KIND_EN['英語ブログ'] = S.blog[0]; KIND_EN['日本語ブログ'] = S.blog[1];
var rowByUrl = {};
var rows = [];
D.rows.forEach(function(x, i){
  var s = SRC[x.src], o;
  if (s === undefined) { warn('rows[' + i + '] の src が不明: ' + x.src); return; }
  if (rowByUrl[x.url] !== undefined) warn('URL が重複: ' + x.url);
  if (s === 2) {
    o = { s:2, d:x.date, t:x.title, u:x.url, c:[], cn:[], m:0, g:0, k:kindOf(x.kind), v:statusOf(x.status), n:x.note || '', n_en:x.note_en || '', l:x.lang };
    o.h = (o.d + ' ' + o.t + ' ' + x.kind + ' ' + x.status + ' ' + o.n + ' ' + o.n_en + ' ' + o.u).toLowerCase();
  } else {
    var names = x.cats || [];
    o = { s:s, d:x.date, t:x.title, u:x.url, c:names.map(catOf), cn:names, m:MARK[x.mark] || 0, g:LISTING[x.listing] || 0, k:-1, v:-1, n:'', n_en:'', l:s === 0 ? 'en' : 'ja' };
    /* ブログの URL は共通の前半を除いて検索の対象にする(「jp」などで全件に当たらないように) */
    var slug = o.u.indexOf(PREFIX[s]) === 0 ? o.u.slice(PREFIX[s].length).replace(/\/$/, '') : o.u;
    o.h = (o.d + ' ' + o.t + ' ' + names.join(' ') + ' ' + slug).toLowerCase();
  }
  o.y = o.d ? o.d.slice(0,4) : NODATE;
  o.p = pickByUrl[normUrl(o.u)] || 0;
  if (o.p) o.h += ' 厳選 top 100';
  rowByUrl[o.u] = rows.length;
  rows.push(o);
});
D.cats.forEach(function(c,i){ catIndex[c] = i; });
/* 読む順は URL で記事を指す。行の番号に置き換え、見つからない URL は飛ばす */
function rowOf(url, where){
  var i = rowByUrl[url];
  if (i === undefined) warn(where + ' の URL が catalog.json に無い: ' + url);
  return i;
}
function defined(v){ return v !== undefined; }
D.order.forEach(function(th){
  var where = 'order.json「' + th.name + '」';
  th.picks = th.picks.map(function(pk){ var i = rowOf(pk.url, where); return i === undefined ? undefined : { i:i, why:pk.why, why_en:pk.why_en }; }).filter(defined);
  th.rest = th.rest.map(function(u){ return rowOf(u, where); }).filter(defined);
  th.extras = th.extras.map(function(u){ return rowOf(u, where); }).filter(defined);
});
var catCount = D.cats.map(function(){ return 0; });
var kindCount = D.kinds.map(function(){ return 0; });
rows.forEach(function(r){ r.c.forEach(function(ci){ catCount[ci]++; }); if (r.k >= 0) kindCount[r.k]++; });
var years = [];
(function(){
  var lo = 9999, hi = 0;
  rows.forEach(function(r){ if (r.y === NODATE) return; var y = +r.y; if (y < lo) lo = y; if (y > hi) hi = y; });
  for (var y = lo; y <= hi; y++) years.push(String(y));
})();

/* ---------- 件数: HTML の data-stat="名前" の中身をデータから数えた値に置き換える ---------- */
(function(){
  var st = { total:rows.length, picks:P.length, 'order.themes':D.order.length, 'order.picks':0, 'order.pickArticles':0, 'order.articles':0 };
  var secs = {};
  P.forEach(function(p){ secs[p.section] = 1; });
  st['picks.sections'] = Object.keys(secs).length;
  ['en', 'jp', 'x'].forEach(function(k){ st[k + '.total'] = 0; });
  var howto = [catIndex['Technical How-to'], catIndex['Best Practices']];
  rows.forEach(function(r){
    var k = SRC_CLASS[r.s] === 'xs' ? 'x' : SRC_CLASS[r.s];
    function inc(name){ st[k + '.' + name] = (st[k + '.' + name] || 0) + 1; }
    inc('total');
    if (r.s === 2) {
      if (r.l === 'ja') inc('ja');
      st['status:' + D.status[r.v]] = (st['status:' + D.status[r.v]] || 0) + 1;
      return;
    }
    if (r.d) {
      if (!st[k + '.first'] || r.d < st[k + '.first']) st[k + '.first'] = r.d;
      if (!st[k + '.last'] || r.d > st[k + '.last']) st[k + '.last'] = r.d;
    }
    if (r.g === 0) inc('listed');                 // カテゴリの一覧に出てきた記事
    if (r.g === 1) inc('gap');                    // カテゴリはあるが一覧のページ送りに出てこなかった記事
    if (r.g !== 2) inc('category'); else inc('outside');
    if (r.m === 1) inc('star');
    if (r.m === 2) inc('star2');
    if (r.c.indexOf(howto[0]) >= 0 || r.c.indexOf(howto[1]) >= 0) inc('howto');
  });
  D.order.forEach(function(th){
    th.picks.forEach(function(pk){ st['order.picks']++; if (rows[pk.i].s !== 2) st['order.pickArticles']++; });
    th.picks.forEach(function(pk){ if (rows[pk.i].s !== 2) st['order.articles']++; });
    th.rest.forEach(function(i){ if (rows[i].s !== 2) st['order.articles']++; });
  });
  var els = document.querySelectorAll('[data-stat]');
  for (var i = 0; i < els.length; i++) {
    var v = st[els[i].dataset.stat];
    if (v === undefined) { warn('data-stat の名前が不明: ' + els[i].dataset.stat); continue; }
    els[i].textContent = typeof v === 'number' ? fmt(v) : v;
  }
})();

/* ---------- 共通: 1 行 ---------- */
function markEl(p, r){
  if (r.m) { var mk = el('span', 'mark', r.m === 1 ? '★' : '☆'); mk.title = MARK_TEXT[r.m]; mk.setAttribute('role', 'img'); mk.setAttribute('aria-label', MARK_TEXT[r.m]); p.appendChild(mk); }
  if (r.g === 2) { var pl = el('span', 'mark', '＋'); pl.title = OUT_TEXT; pl.setAttribute('role', 'img'); pl.setAttribute('aria-label', OUT_TEXT); p.appendChild(pl); }
}
function pickBadge(p, r){
  if (!r.p) return;
  var v = { n:P.length, no:r.p };
  var a = el('a', 'pk-badge', t('pickBadge', v)); a.href = '#p-' + r.p; a.title = t('pickOpen', v);
  a.setAttribute('aria-label', t('pickLabel', v)); p.appendChild(a);
}
function linkEl(r){
  var a = el('a', null, r.t); a.href = r.u; a.target = '_blank'; a.rel = 'noopener'; if (r.l !== L) a.lang = r.l; return a;
}
function rowEl(r, withTags){
  var li = el('li', 'row');
  li.appendChild(el('span', 'date', r.d || '―'));
  li.appendChild(el('span', 'src ' + SRC_CLASS[r.s], BADGE[r.s]));
  var main = el('div', 'main'), p = el('p', 'ttl');
  markEl(p, r); pickBadge(p, r); p.appendChild(linkEl(r)); main.appendChild(p);
  if (r.s === 2) {
    if (r.n) main.appendChild(elT('p', 'memo', r, 'n'));
    var tx = el('div', 'tags');
    if (withTags) {
      var kb = nameEl('button', 'tag' + (state.kinds.indexOf(r.k) >= 0 ? ' on' : ''), D.kinds, D.kinds_en, r.k); kb.type = 'button'; kb.dataset.ki = String(r.k); tx.appendChild(kb);
    } else {
      tx.appendChild(nameEl('span', 'kindlab', D.kinds, D.kinds_en, r.k));
    }
    tx.appendChild(nameEl('span', 'stat', D.status, D.status_en, r.v));
    main.appendChild(tx);
  } else if (withTags && r.c.length) {
    var tg = el('div', 'tags');
    r.c.forEach(function(ci, k){
      var b = el('button', 'tag' + (state.cats.indexOf(ci) >= 0 ? ' on' : ''), r.cn[k]); b.type = 'button'; b.dataset.ci = String(ci); tg.appendChild(b);
    });
    main.appendChild(tg);
  }
  li.appendChild(main);
  return li;
}

/* ====================== 読む順 ====================== */
var themesEl = $('themes'), tnav = $('tnav');
(function(){
  D.order.forEach(function(th, ti){
    var no = ti + 1;
    var a = el('a'); a.href = '#t-' + th.id; a.appendChild(el('b', null, String(no))); a.appendChild(document.createTextNode(tx(th, 'name'))); if (!hasTx(th, 'name')) a.lang = 'ja'; tnav.appendChild(a);

    var sec = el('section', 'theme'); sec.id = 't-' + th.id;
    var head = el('div', 'theme-head');
    head.appendChild(el('span', 'theme-no', (no < 10 ? '0' : '') + no));
    head.appendChild(elT('h2', null, th, 'name'));
    head.appendChild(elT('p', 'theme-lead', th, 'lead'));
    sec.appendChild(head);

    if (th.picks.length) {
      sec.appendChild(el('h3', 'sub', t('startHere')));
      var ol = el('ol', 'picks');
      th.picks.forEach(function(pk){
        var r = rows[pk.i], li = el('li', 'pick'), box = el('div', 'main'), p = el('p', 'ttl');
        markEl(p, r); p.appendChild(linkEl(r)); box.appendChild(p);
        box.appendChild(elT('p', 'why', pk, 'why'));
        var by = el('p', 'byline');
        by.appendChild(r.s === 2 ? nameEl('span', 'b-x', D.kinds, D.kinds_en, r.k) : el('span', 'b-' + SRC_CLASS[r.s], S.blog[r.s]));
        if (r.d) by.appendChild(el('span', null, r.d));
        if (r.s === 2) by.appendChild(el('span', null, t('checked', { s:statusName(r.v) })));
        box.appendChild(by);
        li.appendChild(box); ol.appendChild(li);
      });
      sec.appendChild(ol);
    }
    function block(label, idxs, hint){
      if (!idxs.length) return;
      var d = el('details', 'more-list'), s = el('summary', null, label);
      s.appendChild(el('small', null, t('items', { n:idxs.length })));
      d.appendChild(s);
      if (hint) d.appendChild(el('p', 'hint', hint));
      var ul = el('ul', 'rows');
      d.appendChild(ul);
      var filled = false;
      d.addEventListener('toggle', function(){
        if (!d.open || filled) return; filled = true;
        var frag = document.createDocumentFragment();
        idxs.forEach(function(i){ frag.appendChild(rowEl(rows[i], false)); });
        ul.appendChild(frag);
      });
      sec.appendChild(d);
    }
    block(th.picks.length ? t('readNext') : t('themePosts'), th.rest, t('readNextHint'));
    block(t('related'), th.extras, '');
    themesEl.appendChild(sec);
  });
})();
tnav.addEventListener('click', function(e){
  var a = e.target.closest('a'); if (!a) return;
  var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ block:'start' });
});
$('open-all').addEventListener('click', function(){
  var ds = themesEl.querySelectorAll('details.more-list'), anyClosed = false, i;
  for (i = 0; i < ds.length; i++) if (!ds[i].open) anyClosed = true;
  for (i = 0; i < ds.length; i++) ds[i].open = anyClosed;
  this.textContent = anyClosed ? t('closeAll') : t('openAll');
});
function mdEscape(t){ return t.replace(/([\[\]])/g, '\\$1'); }
function orderText(){
  var out = [];
  D.order.forEach(function(th, ti){
    if (!th.picks.length) return;
    out.push('## ' + (ti + 1) + '. ' + tx(th, 'name'));
    th.picks.forEach(function(pk, k){
      var r = rows[pk.i];
      out.push((k + 1) + '. [' + mdEscape(r.t) + '](' + r.u + ')' + (r.d ? '(' + r.d + ')' : '') + S.mdSep + tx(pk, 'why'));
    });
    out.push('');
  });
  return out.join('\n');
}
/* ボタンの中身(言語ごとの span)を残して、表示だけ一時的に差し替える */
function copyText(text, btn, doneLabel, fbId, taId){
  var label = btn.innerHTML;
  function done(){ btn.textContent = doneLabel; setTimeout(function(){ btn.innerHTML = label; }, 1800); }
  function fallback(){ var fb = $(fbId), ta = $(taId); fb.hidden = false; ta.value = text; ta.focus(); ta.select(); }
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (err) { fallback(); }
}
$('copy-order').addEventListener('click', function(){ copyText(orderText(), this, t('copied'), 'fallback-o', 'fallback-o-text'); });

/* ====================== 全件索引 ====================== */
var state = { q:'', tokens:[], src:'all', edu:false, year:null, cats:[], kinds:[], asc:false };
var list = $('list'), barsEl = $('bars'), chipsEl = $('chips'), activeEl = $('active');
var current = [], shown = 0, lastYear = null, curUl = null, yearTotals = {}, indexReady = false;

var ybtn = {};
barsEl.style.setProperty('--n', years.length);
years.forEach(function(y){
  var b = el('button', 'ybar'); b.type = 'button'; b.dataset.year = y;
  var n = el('span', 'n', '0'), xs = el('span', 'seg-x'), jp = el('span', 'seg-jp'), en = el('span', 'seg-en'), lab = el('span', 'y');
  lab.appendChild(el('span', 'yl', y)); lab.appendChild(el('span', 'ys', "'" + y.slice(2)));
  b.appendChild(n); b.appendChild(xs); b.appendChild(jp); b.appendChild(en); b.appendChild(lab);
  barsEl.appendChild(b);
  ybtn[y] = { el:b, n:n, jp:jp, en:en, xs:xs };
});
(function(){
  var order = D.cats.map(function(c,i){ return i; }).sort(function(a,b){ return catCount[b] - catCount[a] || D.cats[a].localeCompare(D.cats[b]); });
  var sel = $('catsel');
  order.forEach(function(ci){
    var o = document.createElement('option'); o.value = String(ci); o.textContent = t('withCount', { name:D.cats[ci], n:catCount[ci] }); sel.appendChild(o);
  });
  var ks = $('kindsel');
  D.kinds.forEach(function(k, ki){
    var o = document.createElement('option'); o.value = String(ki); o.textContent = t('withCount', { name:kindName(ki), n:kindCount[ki] }); ks.appendChild(o);
  });
})();

function match(r, ignoreYear){
  if (state.src === 'en' && r.s !== 0) return false;
  if (state.src === 'jp' && r.s !== 1) return false;
  if (state.src === 'x' && r.s !== 2) return false;
  if (state.edu && r.s === 1 && r.m === 0) return false;
  if (!ignoreYear && state.year && r.y !== state.year) return false;
  var i;
  for (i = 0; i < state.cats.length; i++) { if (r.c.indexOf(state.cats[i]) < 0) return false; }
  if (state.kinds.length && state.kinds.indexOf(r.k) < 0) return false;
  for (i = 0; i < state.tokens.length; i++) { if (r.h.indexOf(state.tokens[i]) < 0) return false; }
  return true;
}
function drawYears(base){
  var c = {}, max = 1;
  years.forEach(function(y){ c[y] = [0,0,0]; });
  base.forEach(function(r){ if (c[r.y]) c[r.y][r.s]++; });
  years.forEach(function(y){ var t = c[y][0] + c[y][1] + c[y][2]; if (t > max) max = t; });
  years.forEach(function(y){
    var b = ybtn[y], v = c[y], tot = v[0] + v[1] + v[2], on = state.year === y;
    b.n.textContent = fmt(tot);
    b.en.style.height = (v[0] / max * BAR_H) + 'px';
    b.jp.style.height = (v[1] / max * BAR_H) + 'px';
    b.xs.style.height = (v[2] / max * BAR_H) + 'px';
    b.el.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.el.classList.toggle('dim', !!state.year && !on);
    b.el.disabled = tot === 0 && !on;
    b.el.setAttribute('aria-label', t('yearAria', { y:y, t:tot, en:v[0], jp:v[1], x:v[2] }));
  });
}
function drawChips(){
  chipsEl.textContent = '';
  var names = QUICK.slice();
  state.cats.forEach(function(ci){ if (names.indexOf(D.cats[ci]) < 0) names.push(D.cats[ci]); });
  names.forEach(function(name){
    var ci = catIndex[name]; if (ci === undefined) return;
    var b = el('button', 'chip'); b.type = 'button'; b.dataset.ci = String(ci);
    b.setAttribute('aria-pressed', state.cats.indexOf(ci) >= 0 ? 'true' : 'false');
    b.appendChild(document.createTextNode(name));
    b.appendChild(el('span', 'cnt', fmt(catCount[ci])));
    chipsEl.appendChild(b);
  });
}
function drawActive(){
  activeEl.textContent = '';
  function pill(label, kind, val){
    var b = el('button', 'pill', label + ' ×'); b.type = 'button'; b.dataset.kind = kind; if (val != null) b.dataset.val = String(val);
    b.setAttribute('aria-label', t('removeFilter', { label:label })); activeEl.appendChild(b);
  }
  if (state.year) pill(t('year', { y:state.year }), 'year');
  state.cats.forEach(function(ci){ pill(D.cats[ci], 'cat', ci); });
  state.kinds.forEach(function(ki){ pill(kindName(ki), 'kindf', ki); });
  if (state.edu) pill(t('eduPill'), 'edu');
  if (state.year || state.cats.length || state.kinds.length || state.edu || state.q || state.src !== 'all' || state.asc) {
    var r = el('button', 'linkbtn', t('reset')); r.type = 'button'; r.dataset.kind = 'reset'; activeEl.appendChild(r);
  }
}
function appendChunk(){
  var frag = document.createDocumentFragment();
  var end = Math.min(shown + CHUNK, current.length);
  for (var i = shown; i < end; i++) {
    var r = current[i];
    if (r.y !== lastYear) {
      lastYear = r.y;
      var h = el('h2', 'yh', r.y === NODATE ? t('noDate') : t('year', { y:r.y })); h.appendChild(el('small', null, t('items', { n:yearTotals[r.y] }))); frag.appendChild(h);
      curUl = el('ul', 'rows'); frag.appendChild(curUl);
    }
    curUl.appendChild(rowEl(r, true));
  }
  list.appendChild(frag);
  shown = end;
  var rest = current.length - shown;
  $('more-wrap').hidden = rest <= 0;
  $('more').textContent = t('more', { n:fmt(rest) });
}
function refresh(){
  var base = rows.filter(function(r){ return match(r, true); });
  drawYears(base);
  current = state.year ? base.filter(function(r){ return r.y === state.year; }) : base;
  if (state.asc) {
    var dated = current.filter(function(r){ return r.y !== NODATE; }).reverse();
    current = dated.concat(current.filter(function(r){ return r.y === NODATE; }));
  }
  var n = [0,0,0]; yearTotals = {};
  current.forEach(function(r){ n[r.s]++; yearTotals[r.y] = (yearTotals[r.y] || 0) + 1; });
  var c = $('count'); c.textContent = '';
  c.appendChild(document.createTextNode(t('countPre')));
  c.appendChild(el('b', null, t('countN', { n:fmt(current.length) })));
  c.appendChild(document.createTextNode(t('countPost', { en:fmt(n[0]), jp:fmt(n[1]), x:fmt(n[2]), all:fmt(rows.length) })));
  list.textContent = ''; shown = 0; lastYear = null; curUl = null;
  $('empty').hidden = current.length > 0;
  $('fallback').hidden = true;
  appendChunk();
  drawChips(); drawActive();
  var segs = document.querySelectorAll('#view-index .seg button');
  for (var i = 0; i < segs.length; i++) segs[i].setAttribute('aria-pressed', segs[i].dataset.src === state.src ? 'true' : 'false');
  $('edu').checked = state.edu; $('asc').checked = state.asc;
  if ($('q').value !== state.q) $('q').value = state.q;
}
function toggle(arr, v){ var k = arr.indexOf(v); if (k >= 0) arr.splice(k, 1); else arr.push(v); }
function backToTop(){
  var a = $('anchor');
  if (a.getBoundingClientRect().top < 0) a.scrollIntoView({ block:'start' });
}

var qTimer = null;
$('q').addEventListener('input', function(){
  var v = this.value;
  clearTimeout(qTimer);
  qTimer = setTimeout(function(){
    state.q = v; state.tokens = v.toLowerCase().split(/\s+/).filter(Boolean); refresh();
  }, 140);
});
document.querySelector('#view-index .seg').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return; state.src = b.dataset.src; refresh();
});
$('edu').addEventListener('change', function(){ state.edu = this.checked; refresh(); });
$('asc').addEventListener('change', function(){ state.asc = this.checked; refresh(); });
chipsEl.addEventListener('click', function(e){
  var b = e.target.closest('.chip'); if (!b) return; toggle(state.cats, +b.dataset.ci); refresh();
});
$('catsel').addEventListener('change', function(){
  if (this.value === '') return; var ci = +this.value; if (state.cats.indexOf(ci) < 0) state.cats.push(ci); this.value = ''; refresh();
});
$('kindsel').addEventListener('change', function(){
  if (this.value === '') return; var ki = +this.value; if (state.kinds.indexOf(ki) < 0) state.kinds.push(ki); this.value = ''; refresh();
});
barsEl.addEventListener('click', function(e){
  var b = e.target.closest('.ybar'); if (!b || b.disabled) return;
  state.year = state.year === b.dataset.year ? null : b.dataset.year; refresh();
});
list.addEventListener('click', function(e){
  var b = e.target.closest('button.tag'); if (!b) return;
  if (b.dataset.ki !== undefined) toggle(state.kinds, +b.dataset.ki); else toggle(state.cats, +b.dataset.ci);
  refresh(); backToTop();
});
activeEl.addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return;
  var kind = b.dataset.kind;
  if (kind === 'year') state.year = null;
  else if (kind === 'cat') toggle(state.cats, +b.dataset.val);
  else if (kind === 'kindf') toggle(state.kinds, +b.dataset.val);
  else if (kind === 'edu') state.edu = false;
  else if (kind === 'reset') { state.q = ''; state.tokens = []; state.src = 'all'; state.edu = false; state.year = null; state.cats = []; state.kinds = []; state.asc = false; }
  refresh();
});
$('more').addEventListener('click', appendChunk);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(function(entries){
    if (entries[0].isIntersecting && shown < current.length) appendChunk();
  }, { rootMargin:'700px 0px' }).observe($('more-wrap'));
}
function buildText(kind){
  return current.map(function(r){
    var mark = (r.m === 1 ? '★' : (r.m === 2 ? '☆' : '')) + (r.g === 2 ? '＋' : '');
    if (kind === 'md') return '- ' + (r.d ? r.d + ' ' : '') + (mark ? mark + ' ' : '') + '[' + mdEscape(r.t) + '](' + r.u + ')' + (r.s === 2 ? '(' + kindName(r.k) + ')' : '');
    return [r.d, BADGE[r.s], mark, r.t.replace(/\t/g, ' '), r.u, r.s === 2 ? kindName(r.k) + ' / ' + statusName(r.v) : r.cn.join(', ')].join('\t');
  }).join('\n');
}
$('copy-md').addEventListener('click', function(){ copyText(buildText('md'), this, t('copiedN', { n:current.length }), 'fallback', 'fallback-text'); });
$('copy-tsv').addEventListener('click', function(){ copyText(buildText('tsv'), this, t('copiedN', { n:current.length }), 'fallback', 'fallback-text'); });

/* ====================== 厳選 100 ====================== */
var SECS = [], secByName = {};
var ps = { q:'', tokens:[], secs:[], level:'all', lang:'all' }, pshown = [];
var plist = $('plist'), pchips = $('pchips'), pactive = $('pactive');
function pad2(n){ return (n < 10 ? '0' : '') + n; }
function kindClass(k){ return k === '日本語ブログ' ? 'b-jp' : ((k === '英語ブログ' || k === 'ほかの AWS ブログ') ? 'b-en' : 'b-x'); }
function cardEl(p){
  var li = el('li', 'px-card'); li.id = 'p-' + p.no;
  li.appendChild(el('span', 'px-no', String(p.no)));
  var box = el('div', 'main'), t0 = el('p', 'ttl'), a = el('a', null, p.title);
  a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; if (p.lang !== L) a.lang = p.lang;
  t0.appendChild(a); box.appendChild(t0);
  var by = el('p', 'byline');
  if (p.date) by.appendChild(el('span', null, p.date));
  var kd = el('span', kindClass(p.kind), L === 'en' && KIND_EN[p.kind] ? KIND_EN[p.kind] : p.kind); if (L === 'en' && !KIND_EN[p.kind]) kd.lang = 'ja'; by.appendChild(kd);
  var lv = el('span', 'lv', 'L' + p.level); lv.title = t('level', { l:p.level }); by.appendChild(lv);
  if (p.jp) { var j = el('span', 'jpb', 'JP'); j.title = t('jpTitle'); j.setAttribute('aria-label', t('jpLabel')); by.appendChild(j); }
  box.appendChild(by);
  var dl = el('dl', 'px-body');
  dl.appendChild(el('dt', null, t('learn'))); dl.appendChild(elT('dd', null, p, 'why'));
  dl.appendChild(el('dt', null, t('synopsis'))); dl.appendChild(elT('dd', null, p, 'synopsis'));
  box.appendChild(dl);
  if (p.caveat) { var cv = el('p', 'px-note', t('note', { s:tx(p, 'caveat') })); if (!hasTx(p, 'caveat')) cv.lang = 'ja'; box.appendChild(cv); }
  li.appendChild(box);
  return li;
}
(function(){
  P.forEach(function(p){
    var s = secByName[p.section];
    if (!s) { s = secByName[p.section] = { name:p.section, name_en:p.section_en, n:0, items:[] }; SECS.push(s); }
    s.n++; s.items.push(p);
    p.g = (p.jp || p.lang === 'ja') ? 'jp' : 'en';
    p.h = [p.title, p.why, p.synopsis, p.caveat, p.section, p.kind, p.url, p.why_en, p.synopsis_en, p.caveat_en, p.section_en].join(' ').toLowerCase();
  });
  var frag = document.createDocumentFragment();
  SECS.forEach(function(s, si){
    var sec = el('section', 'px-sec'); sec.id = 'ps-' + (si + 1);
    var head = el('div', 'theme-head');
    head.appendChild(el('span', 'theme-no', pad2(si + 1)));
    var h = elT('h2', null, s, 'name'); s.cnt = el('small', null, ''); h.appendChild(s.cnt); head.appendChild(h);
    sec.appendChild(head);
    var ol = el('ol', 'px-list');
    s.items.forEach(function(p){ p.el = cardEl(p); ol.appendChild(p.el); });
    sec.appendChild(ol); s.el = sec; frag.appendChild(sec);
    var b = el('button', 'chip'); b.type = 'button'; b.dataset.sec = s.name; b.setAttribute('aria-pressed', 'false');
    var bn = elT('span', null, s, 'name'); b.appendChild(bn); b.appendChild(el('span', 'cnt', fmt(s.n)));
    s.chip = b; pchips.appendChild(b);
  });
  plist.appendChild(frag);
})();
function pmatch(p){
  if (ps.secs.length && ps.secs.indexOf(p.section) < 0) return false;
  if (ps.level !== 'all' && String(p.level) !== ps.level) return false;
  if (ps.lang !== 'all' && p.g !== ps.lang) return false;
  for (var i = 0; i < ps.tokens.length; i++) { if (p.h.indexOf(ps.tokens[i]) < 0) return false; }
  return true;
}
function pfiltered(){ return !!(ps.q || ps.secs.length || ps.level !== 'all' || ps.lang !== 'all'); }
function preset(){ ps.q = ''; ps.tokens = []; ps.secs = []; ps.level = 'all'; ps.lang = 'all'; }
function prefresh(){
  var filtered = pfiltered();
  pshown = [];
  SECS.forEach(function(s){
    var k = 0;
    s.items.forEach(function(p){ var ok = pmatch(p); p.el.hidden = !ok; if (ok) { k++; pshown.push(p); } });
    s.el.hidden = k === 0;
    s.cnt.textContent = filtered ? t('shownOf', { k:k, n:s.n }) : t('items', { n:s.n });
    s.chip.setAttribute('aria-pressed', ps.secs.indexOf(s.name) >= 0 ? 'true' : 'false');
  });
  var c = $('pcount'); c.textContent = '';
  c.appendChild(document.createTextNode(t('countPre')));
  c.appendChild(el('b', null, t('countN', { n:fmt(pshown.length) })));
  c.appendChild(document.createTextNode(t('pcountPost', { all:fmt(P.length) })));
  $('pempty').hidden = pshown.length > 0;
  $('fallback-p').hidden = true;
  var i, bs = document.querySelectorAll('#plevel button');
  for (i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.level === ps.level ? 'true' : 'false');
  bs = document.querySelectorAll('#plang button');
  for (i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.lang === ps.lang ? 'true' : 'false');
  pactive.textContent = '';
  if (filtered) { var r = el('button', 'linkbtn', t('reset')); r.type = 'button'; r.dataset.kind = 'reset'; pactive.appendChild(r); }
  if ($('pq').value !== ps.q) $('pq').value = ps.q;
}
var pqTimer = null;
$('pq').addEventListener('input', function(){
  var v = this.value;
  clearTimeout(pqTimer);
  pqTimer = setTimeout(function(){ ps.q = v; ps.tokens = v.toLowerCase().split(/\s+/).filter(Boolean); prefresh(); }, 140);
});
pchips.addEventListener('click', function(e){
  var b = e.target.closest('.chip'); if (!b) return; toggle(ps.secs, b.dataset.sec); prefresh();
});
$('plevel').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return; ps.level = b.dataset.level; prefresh();
});
$('plang').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return; ps.lang = b.dataset.lang; prefresh();
});
pactive.addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return; preset(); prefresh();
});
function picksText(){
  return pshown.map(function(p){ return '- [' + mdEscape(p.title) + '](' + p.url + ') — ' + tx(p, 'why'); }).join('\n');
}
$('copy-picks').addEventListener('click', function(){ copyText(picksText(), this, t('copiedN', { n:pshown.length }), 'fallback-p', 'fallback-p-text'); });
prefresh();

/* ====================== 表示の切り替え ====================== */
var viewBtns = document.querySelectorAll('.views button');
var VIEWS = ['picks', 'order', 'index'];
function setView(v){
  VIEWS.forEach(function(x){ $('view-' + x).hidden = x !== v; });
  for (var i = 0; i < viewBtns.length; i++) viewBtns[i].setAttribute('aria-pressed', viewBtns[i].dataset.view === v ? 'true' : 'false');
  if (v === 'index' && !indexReady) { indexReady = true; refresh(); }
}
document.querySelector('.views').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return; setView(b.dataset.view);
  try { history.replaceState(null, '', '#' + b.dataset.view); } catch (err) {}
  langLinks();
});
/* #picks #order #index で表示を選ぶ。#p-12 は厳選の 12 番、#t-… は読む順のテーマへ */
function fromHash(initial){
  var h = location.hash.slice(1), t;
  try { h = decodeURIComponent(h); } catch (err) {}
  if (VIEWS.indexOf(h) >= 0) { setView(h); return; }
  if (/^p-\d+$/.test(h) && (t = $(h))) {
    setView('picks');
    if (t.hidden) { preset(); prefresh(); }
    t.scrollIntoView({ block:'start' });
    return;
  }
  if (/^ps-\d+$/.test(h) && (t = $(h))) {
    setView('picks');
    if (t.hidden) { preset(); prefresh(); }
    t.scrollIntoView({ block:'start' });
    return;
  }
  if (/^t-/.test(h) && (t = $(h))) { setView('order'); t.scrollIntoView({ block:'start' }); return; }
  if (initial) setView('picks');
}
window.addEventListener('hashchange', function(){ fromHash(false); });
fromHash(true);
}
})();
