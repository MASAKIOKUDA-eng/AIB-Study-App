(function () {
  "use strict";

  var CFG = window.AIB.exam;
  var DOMAINS = window.AIB.domains;
  var REFS = window.AIB.refs;
  var ALL = window.QUESTIONS;
  var BY_ID = {};
  ALL.forEach(function (q) { BY_ID[q.id] = q; });

  var LETTERS = "ABCDEFGH";
  var STORE_KEY = "aib-c01-study-v1";
  var EXAM_KEY = "aib-c01-exam-session-v1";

  // ---------- storage ----------
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
  function getStore() {
    var s = load(STORE_KEY, null) || {};
    s.wrong = s.wrong || {};
    s.seen = s.seen || {};
    s.history = s.history || [];
    return s;
  }

  // ---------- utils ----------
  function $(id) { return document.getElementById(id); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function range(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }
  function show(screen) {
    ["home", "quiz", "result"].forEach(function (s) { $(s).hidden = s !== screen; });
    window.scrollTo(0, 0);
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ":" : "") + String(m).padStart(h ? 2 : 1, "0") + ":" + String(s).padStart(2, "0");
  }
  function scaled(correct, total) {
    return total ? Math.round(100 + 900 * correct / total) : 100;
  }

  // ---------- theme ----------
  (function initTheme() {
    var t = load("aib-theme", null);
    if (t) document.documentElement.setAttribute("data-theme", t);
    $("themeBtn").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      if (!cur) cur = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      save("aib-theme", next);
    });
  })();

  // ---------- session ----------
  var session = null;
  var timerId = null;

  function makeItem(q) {
    return { id: q.id, order: shuffle(range(q.choices.length)), picked: [], checked: false, flagged: false };
  }

  function pickExamQuestions() {
    var n = CFG.questions;
    var ids = Object.keys(DOMAINS);
    var alloc = ids.map(function (d) {
      var exact = n * DOMAINS[d].weight / 100;
      return { d: +d, count: Math.floor(exact), frac: exact - Math.floor(exact) + Math.random() * 1e-6 };
    });
    var rest = n - alloc.reduce(function (s, a) { return s + a.count; }, 0);
    alloc.slice().sort(function (a, b) { return b.frac - a.frac; }).slice(0, rest)
      .forEach(function (a) { a.count += 1; });
    var picked = [];
    alloc.forEach(function (a) {
      var pool = shuffle(ALL.filter(function (q) { return q.domain === a.d; }));
      picked = picked.concat(pool.slice(0, a.count));
    });
    return shuffle(picked);
  }

  function startPractice() {
    var sel = document.querySelector('input[name="pdomain"]:checked').value;
    var pool;
    if (sel === "wrong") {
      var w = getStore().wrong;
      pool = ALL.filter(function (q) { return w[q.id]; });
      if (!pool.length) { alert("間違えた問題はまだありません。"); return; }
    } else if (sel === "0") {
      pool = ALL;
    } else {
      pool = ALL.filter(function (q) { return q.domain === +sel; });
    }
    // 未出題の問題を優先
    var seen = getStore().seen;
    var fresh = shuffle(pool.filter(function (q) { return !seen[q.id]; }));
    var old = shuffle(pool.filter(function (q) { return seen[q.id]; }));
    var qs = shuffle(fresh.concat(old).slice(0, CFG.practiceSize));
    session = { mode: "practice", filter: sel, items: qs.map(makeItem), idx: 0 };
    stopTimer();
    renderQuestion();
    show("quiz");
  }

  function startExam() {
    var qs = pickExamQuestions();
    session = {
      mode: "exam",
      items: qs.map(makeItem),
      idx: 0,
      endAt: Date.now() + CFG.minutes * 60 * 1000
    };
    persistExam();
    startTimer();
    renderQuestion();
    show("quiz");
  }

  function resumeExam() {
    var s = load(EXAM_KEY, null);
    if (!s) return;
    session = s;
    session.items = session.items.filter(function (it) { return BY_ID[it.id]; });
    if (Date.now() >= session.endAt) { finish(); return; }
    startTimer();
    renderQuestion();
    show("quiz");
  }

  function persistExam() {
    if (session && session.mode === "exam") save(EXAM_KEY, session);
  }

  function startTimer() {
    stopTimer();
    var el = $("timer");
    el.hidden = false;
    function tick() {
      var left = (session.endAt - Date.now()) / 1000;
      el.textContent = "残り " + fmtTime(left);
      el.classList.toggle("low", left < 600);
      if (left <= 0) {
        stopTimer();
        alert("試験時間が終了しました。採点します。");
        finish();
      }
    }
    tick();
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    $("timer").hidden = true;
  }

  // ---------- rendering ----------
  function currentQ() { return BY_ID[session.items[session.idx].id]; }

  function isCorrect(item) {
    var q = BY_ID[item.id];
    var pickedOrig = item.picked.map(function (p) { return item.order[p]; }).sort();
    return pickedOrig.length === q.answer.length &&
      pickedOrig.every(function (v, i) { return v === q.answer[i]; });
  }

  function renderQuestion() {
    var item = session.items[session.idx];
    var q = BY_ID[item.id];
    var total = session.items.length;
    var isExam = session.mode === "exam";
    var multi = q.type === "multi";

    $("qProgress").textContent = (isExam ? "本番試験 " : "演習 ") + "問題 " + (session.idx + 1) + " / " + total;
    $("qDomain").textContent = DOMAINS[q.domain].short;
    $("progressBar").style.width = ((session.idx + 1) / total * 100) + "%";
    $("qText").textContent = q.question;
    $("qHint").textContent = multi ? "（" + q.answer.length + " つ選択してください）" : "";

    var locked = !isExam && item.checked;
    var box = $("choices");
    box.innerHTML = "";
    item.order.forEach(function (orig, disp) {
      var label = document.createElement("label");
      label.className = "choice";
      var input = document.createElement("input");
      input.type = multi ? "checkbox" : "radio";
      input.name = "choice";
      input.checked = item.picked.indexOf(disp) !== -1;
      input.disabled = locked;
      if (input.checked) label.classList.add("selected");
      if (locked) {
        if (q.answer.indexOf(orig) !== -1) label.classList.add("correct");
        else if (input.checked) label.classList.add("wrong");
      }
      input.addEventListener("change", function () { onPick(disp, input.checked); });
      var letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = LETTERS[disp] + ".";
      var text = document.createElement("span");
      text.textContent = q.choices[orig];
      label.appendChild(input);
      label.appendChild(letter);
      label.appendChild(text);
      box.appendChild(label);
    });

    // feedback
    var fb = $("feedback");
    if (locked) {
      var ok = isCorrect(item);
      var ansLetters = item.order.map(function (orig, disp) { return q.answer.indexOf(orig) !== -1 ? LETTERS[disp] : null; })
        .filter(Boolean).join(", ");
      fb.innerHTML =
        '<div class="verdict ' + (ok ? "ok" : "ng") + '">' + (ok ? "正解！" : "不正解") + '</div>' +
        '<div>正解: <strong>' + ansLetters + '</strong></div>' +
        '<p>' + esc(q.explanation) + '</p>' + refHtml(q.ref);
      fb.hidden = false;
    } else {
      fb.hidden = true;
    }

    // actions
    $("prevBtn").hidden = !isExam;
    $("prevBtn").disabled = session.idx === 0;
    $("flagWrap").hidden = !isExam;
    $("flagBox").checked = item.flagged;
    $("examNav").hidden = !isExam;
    if (isExam) {
      $("checkBtn").hidden = true;
      $("nextBtn").hidden = session.idx === total - 1;
      $("nextBtn").textContent = "次へ";
      renderNav();
    } else {
      $("checkBtn").hidden = item.checked;
      $("checkBtn").disabled = item.picked.length !== q.answer.length;
      $("nextBtn").hidden = !item.checked;
      $("nextBtn").textContent = session.idx === total - 1 ? "結果を見る" : "次へ";
    }
  }

  function refHtml(key) {
    var r = REFS[key];
    if (!r) return "";
    return '<div class="small muted">参考: <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + "</a></div>";
  }

  function renderNav() {
    var grid = $("navGrid");
    grid.innerHTML = "";
    var answered = 0;
    session.items.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
      if (it.picked.length) { b.classList.add("answered"); answered++; }
      if (it.flagged) b.classList.add("flagged");
      if (i === session.idx) b.classList.add("current");
      b.addEventListener("click", function () { go(i); });
      grid.appendChild(b);
    });
    var flagged = session.items.filter(function (it) { return it.flagged; }).length;
    $("answeredCount").textContent = "（解答済 " + answered + " / " + session.items.length + "・見直し " + flagged + "）";
  }

  function onPick(disp, checked) {
    var item = session.items[session.idx];
    var q = BY_ID[item.id];
    if (q.type === "multi") {
      if (checked && item.picked.indexOf(disp) === -1) item.picked.push(disp);
      if (!checked) item.picked = item.picked.filter(function (p) { return p !== disp; });
    } else {
      item.picked = [disp];
    }
    persistExam();
    renderQuestion();
  }

  function go(i) {
    session.idx = Math.max(0, Math.min(session.items.length - 1, i));
    persistExam();
    renderQuestion();
    window.scrollTo(0, 0);
  }

  // ---------- finish ----------
  function finish() {
    stopTimer();
    var store = getStore();
    var items = session.items;
    var correct = 0;
    var byDomain = {};
    items.forEach(function (it) {
      var q = BY_ID[it.id];
      var ok = isCorrect(it);
      it.ok = ok;
      if (ok) correct++;
      byDomain[q.domain] = byDomain[q.domain] || { c: 0, t: 0 };
      byDomain[q.domain].t++;
      if (ok) byDomain[q.domain].c++;
      store.seen[it.id] = (store.seen[it.id] || 0) + 1;
      if (ok) delete store.wrong[it.id];
      else store.wrong[it.id] = true;
    });
    var total = items.length;
    var score = scaled(correct, total);
    store.history.unshift({
      mode: session.mode,
      date: new Date().toISOString(),
      correct: correct,
      total: total,
      score: session.mode === "exam" ? score : null,
      byDomain: byDomain
    });
    store.history = store.history.slice(0, 50);
    save(STORE_KEY, store);
    if (session.mode === "exam") remove(EXAM_KEY);

    renderResult(correct, total, score, byDomain);
    show("result");
  }

  function renderResult(correct, total, score, byDomain) {
    var isExam = session.mode === "exam";
    var pct = Math.round(correct / total * 100);
    var html = "<h2>" + (isExam ? "本番試験モード 結果" : "演習モード 結果") + "</h2>";
    if (isExam) {
      var pass = score >= CFG.passScore;
      html += '<div class="score">' + score + '<span class="small muted"> / 1000</span></div>' +
        '<div class="' + (pass ? "pass" : "fail") + '">' + (pass ? "合格ライン到達" : "不合格（合格ライン " + CFG.passScore + "）") + "</div>";
    } else {
      html += '<div class="score">' + correct + '<span class="small muted"> / ' + total + "</span></div>";
    }
    html += '<p class="muted">正答数 ' + correct + " / " + total + "（" + pct + "%）</p>";
    if (isExam) html += '<p class="small muted">※ スコアは正答率を100〜1000点に換算した目安です。</p>';
    $("resultSummary").innerHTML = html;

    var rows = Object.keys(byDomain).sort().map(function (d) {
      var b = byDomain[d];
      var p = Math.round(b.c / b.t * 100);
      return "<tr><td>" + esc(DOMAINS[d].short) + "</td><td class=\"num\">" + b.c + "/" + b.t +
        '</td><td style="width:40%"><div class="bar"><div style="width:' + p + '%"></div></div></td><td class="num">' + p + "%</td></tr>";
    }).join("");
    $("domainResult").innerHTML = "<h2>ドメイン別の正答率</h2><table>" + rows + "</table>";

    renderReview();
  }

  function renderReview() {
    var onlyWrong = $("onlyWrong").checked;
    var html = "";
    session.items.forEach(function (it, i) {
      if (onlyWrong && it.ok) return;
      var q = BY_ID[it.id];
      var pickedOrig = it.picked.map(function (p) { return it.order[p]; });
      var lis = it.order.map(function (orig, disp) {
        var cls = q.answer.indexOf(orig) !== -1 ? "ans" : (pickedOrig.indexOf(orig) !== -1 ? "picked-wrong" : "");
        var mark = pickedOrig.indexOf(orig) !== -1 ? " ← あなたの解答" : "";
        return '<li class="' + cls + '">' + LETTERS[disp] + ". " + esc(q.choices[orig]) + mark + "</li>";
      }).join("");
      html += '<div class="review">' +
        '<div><span class="' + (it.ok ? "ok-mark" : "ng-mark") + '">' + (it.ok ? "○" : "×") + "</span> 問" + (i + 1) +
        ' <span class="tag">' + esc(DOMAINS[q.domain].short) + "</span>" + (it.picked.length ? "" : ' <span class="ng-mark small">未解答</span>') + "</div>" +
        '<div class="rq">' + esc(q.question) + "</div><ul>" + lis + "</ul>" +
        '<div class="expl">' + esc(q.explanation) + refHtml(q.ref) + "</div></div>";
    });
    $("reviewList").innerHTML = html || '<p class="muted">すべて正解です。</p>';
  }

  // ---------- home ----------
  function renderHome() {
    $("totalCount").textContent = ALL.length;
    $("examInfo").textContent = CFG.questions + "問・" + CFG.minutes + "分";

    var radios = Object.keys(DOMAINS).map(function (d) {
      var n = ALL.filter(function (q) { return q.domain === +d; }).length;
      return '<label><input type="radio" name="pdomain" value="' + d + '"> ' + esc(DOMAINS[d].short + "：" + DOMAINS[d].name) + " (" + n + ")</label>";
    }).join("");
    $("domainRadios").innerHTML = radios;

    var store = getStore();
    $("wrongCount").textContent = Object.keys(store.wrong).filter(function (id) { return BY_ID[id]; }).length;
    $("resumeExam").hidden = !load(EXAM_KEY, null);

    // stats
    var seenCount = Object.keys(store.seen).filter(function (id) { return BY_ID[id]; }).length;
    var agg = {};
    store.history.forEach(function (h) {
      Object.keys(h.byDomain || {}).forEach(function (d) {
        agg[d] = agg[d] || { c: 0, t: 0 };
        agg[d].c += h.byDomain[d].c;
        agg[d].t += h.byDomain[d].t;
      });
    });
    var s = "<p>解いた問題: <strong>" + seenCount + "</strong> / " + ALL.length + " 問</p>";
    var domRows = Object.keys(DOMAINS).map(function (d) {
      var a = agg[d];
      var p = a && a.t ? Math.round(a.c / a.t * 100) : null;
      return "<tr><td>" + esc(DOMAINS[d].short) + '</td><td style="width:45%"><div class="bar"><div style="width:' + (p || 0) + '%"></div></div></td><td class="num">' +
        (p === null ? "-" : p + "%") + "</td></tr>";
    }).join("");
    s += "<table><tr><th>ドメイン</th><th>累計正答率</th><th></th></tr>" + domRows + "</table>";
    var exams = store.history.filter(function (h) { return h.mode === "exam"; }).slice(0, 5);
    if (exams.length) {
      s += '<h3 class="small">最近の本番試験</h3><table>' + exams.map(function (h) {
        return "<tr><td>" + new Date(h.date).toLocaleString("ja-JP") + '</td><td class="num">' + h.score + '点</td><td class="num">' +
          (h.score >= CFG.passScore ? '<span class="ok-mark">合格</span>' : '<span class="ng-mark">不合格</span>') + "</td></tr>";
      }).join("") + "</table>";
    }
    $("stats").innerHTML = s;

    $("domainTable").innerHTML = "<table><tr><th>ドメイン</th><th class=\"num\">比率</th></tr>" +
      Object.keys(DOMAINS).map(function (d) {
        return "<tr><td>" + esc(DOMAINS[d].short + "：" + DOMAINS[d].name) + '</td><td class="num">' + DOMAINS[d].weight + "%</td></tr>";
      }).join("") + "</table>";
    $("refList").innerHTML = Object.keys(REFS).map(function (k) {
      return '<li><a href="' + esc(REFS[k].url) + '" target="_blank" rel="noopener">' + esc(REFS[k].title) + "</a></li>";
    }).join("");
  }

  function goHome() {
    stopTimer();
    session = null;
    renderHome();
    show("home");
  }

  // ---------- events ----------
  $("startPractice").addEventListener("click", startPractice);
  $("startExam").addEventListener("click", function () {
    if (load(EXAM_KEY, null) && !confirm("中断中の試験は破棄されます。新しい試験を開始しますか？")) return;
    startExam();
  });
  $("resumeExam").addEventListener("click", resumeExam);
  $("checkBtn").addEventListener("click", function () {
    var item = session.items[session.idx];
    item.checked = true;
    renderQuestion();
  });
  $("nextBtn").addEventListener("click", function () {
    if (session.mode === "practice" && session.idx === session.items.length - 1) { finish(); return; }
    go(session.idx + 1);
  });
  $("prevBtn").addEventListener("click", function () { go(session.idx - 1); });
  $("flagBox").addEventListener("change", function () {
    session.items[session.idx].flagged = $("flagBox").checked;
    persistExam();
    renderNav();
  });
  $("submitExam").addEventListener("click", function () {
    var un = session.items.filter(function (it) { return !it.picked.length; }).length;
    var msg = un ? "未解答が " + un + " 問あります。試験を終了して採点しますか？" : "試験を終了して採点しますか？";
    if (confirm(msg)) finish();
  });
  $("quitBtn").addEventListener("click", function () {
    if (session && session.mode === "exam") {
      if (!confirm("試験を中断してホームに戻りますか？（ホームから再開できます）")) return;
    } else if (session && !confirm("演習を中断してホームに戻りますか？")) return;
    goHome();
  });
  $("brand").addEventListener("click", function (e) {
    e.preventDefault();
    if (!$("quiz").hidden) $("quitBtn").click();
    else goHome();
  });
  $("onlyWrong").addEventListener("change", renderReview);
  $("againBtn").addEventListener("click", function () {
    var mode = session.mode;
    if (mode === "exam") startExam();
    else startPractice();
  });
  $("homeBtn").addEventListener("click", goHome);
  $("resetStats").addEventListener("click", function () {
    if (confirm("学習記録（履歴・間違えた問題）をすべて削除しますか？")) { remove(STORE_KEY); renderHome(); }
  });

  renderHome();
})();
