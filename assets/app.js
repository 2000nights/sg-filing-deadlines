(function () {
  "use strict";
  var E = window.SGDeadlines, $ = function (s) { return document.querySelector(s); };
  var form = $("#calc-form"), out = $("#results-body");
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function fmt(t) { return t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + " " + t.getUTCFullYear(); }
  function fmtW(t) { return DAYS[t.getUTCDay()] + ", " + fmt(t); }
  function today() { var n = new Date(); return E.D(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var LABEL = { FS: "Financial statements", AGM: "AGM", AR: "Annual return", ECI: "ECI", TAX: "Corporate tax return", GST: "GST F5", CPF: "CPF", IR8A: "IR8A / AIS", AUDIT: "Audit", RORC: "Controllers notice", SETUP: "Company set-up" };
  var SHOW = ["AUDIT", "FS", "AGM", "AR", "ECI", "TAX", "GST", "CPF", "IR8A"];
  var FIELDS = ["fye", "agm", "dormant", "branch", "eciWaiver", "form", "sffs", "gst", "gstFreq", "gstMonth", "auditExempt", "epc", "solvent", "taxWaived", "employees", "nEmployees"];

  function val(name) {
    var el = form.elements[name]; if (!el) return null;
    if (el.length && el[0] && el[0].type === "radio") { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return null; }
    return el.value;
  }
  function setVal(name, v) {
    var el = form.elements[name]; if (!el || v == null) return;
    if (el.length && el[0] && el[0].type === "radio") { for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === v; }
    else el.value = v;
  }
  function periodText(r) {
    if (r.type === "CPF") return "Wages for " + MONTHS[r.period.getUTCMonth()] + " " + r.period.getUTCFullYear() + ", due " + fmt(r.due);
    if (r.type === "GST") return "Period to " + fmt(r.period);
    if (r.type === "IR8A") return "Income year " + r.period;
    if (r.type === "TAX") return "YA " + r.ya + ", FY ending " + fmt(r.period);
    return "FY ending " + fmt(r.period);
  }
  function pill(r) {
    if (r.flag === "Overdue") return '<span class="pill over">Date passed ' + (-r.days) + ' days ago</span>';
    if (r.flag === "Due in 30 days") return '<span class="pill soon">' + (r.days === 0 ? "Due today" : r.days + (r.days === 1 ? " day" : " days") + " left") + "</span>";
    return '<span class="pill up">' + r.days + " days left</span>";
  }
  function inputs() {
    var o = {}; FIELDS.forEach(function (f) { o[f] = val(f); });
    o.gstMonth = +o.gstMonth; o.nEmployees = o.nEmployees === "5" ? 5 : 1;
    return o;
  }
  var last = null;
  function render() {
    var o = inputs();
    $("#gst-opts").hidden = o.gst !== "Yes";
    $("#gst-q").hidden = o.gst !== "Yes" || o.gstFreq !== "Quarterly";
    $("#sffs-f").hidden = o.form !== "Form C-S";
    $("#emp-n").hidden = o.employees !== "Yes";
    if (!o.fye) { out.innerHTML = '<p class="empty">Enter your financial year end to see your deadlines.</p>'; return; }
    var t = today(); o.today = E.iso(t);
    var res = E.schedule(o); last = { res: res, o: o };
    var rows = res.rows.filter(function (r) { return r.applies === "Yes" && r.actby && SHOW.indexOf(r.type) >= 0; });
    var cards = SHOW.map(function (ty) {
      var c = rows.filter(function (r) { return r.type === ty && r.actby >= t; }).sort(function (a, b) { return a.actby - b.actby; });
      return c[0];
    }).filter(Boolean).sort(function (a, b) { return a.actby - b.actby; });
    var passed = rows.filter(function (r) { return r.actby < t; }).sort(function (a, b) { return a.actby - b.actby; });
    var h = '<ul class="next">';
    cards.forEach(function (r) {
      h += '<li><div class="k">' + LABEL[r.type] + '</div><div class="t">' + esc(r.ob) + '</div><div class="d">' + fmt(r.actby) + "</div>" +
        '<div class="p">' + esc(periodText(r)) + (r.type === "CPF" ? ". Pay by the 14th to avoid interest." : "") + "</div>" + pill(r) + "</li>";
    });
    if (o.dormant === "Yes") h += '<li class="na"><div class="k">AGM and financial statements</div><div class="t">Not needed for a dormant relevant company</div><div class="d">Declare it in the annual return</div></li>';
    else if (o.agm !== "Hold an AGM") h += '<li class="na"><div class="k">AGM</div><div class="t">No AGM needed on your answers</div><div class="d">A member can still ask for one</div></li>';
    if (o.gst !== "Yes") h += '<li class="na"><div class="k">GST F5</div><div class="t">Not GST registered</div><div class="d">Check the S$1m threshold yearly</div></li>';
    h += "</ul>";
    if (passed.length) {
      h += '<div class="passed"><h3>Already passed in this window: check these are done</h3><ul>';
      passed.slice(-8).forEach(function (r) { h += "<li><strong>" + fmt(r.actby) + "</strong>: " + esc(r.ob) + " (" + esc(periodText(r)) + ")</li>"; });
      if (passed.length > 8) h += "<li>and " + (passed.length - 8) + " earlier items in the full list below</li>";
      h += "</ul></div>";
    }
    var all = rows.slice().sort(function (a, b) { return a.actby - b.actby; });
    h += '<details class="all"><summary>All ' + all.length + " dates for the next three financial years (" + MONTHS[res.start.getUTCMonth()] + " " + res.start.getUTCFullYear() + " onwards)</summary>" +
      '<div class="tbl-wrap"><table><thead><tr><th>Act by</th><th>Obligation</th><th>Period</th><th>Rule</th></tr></thead><tbody>';
    all.forEach(function (r) {
      h += '<tr class="' + (r.flag === "Overdue" ? "is-over" : "") + '"><td class="dt">' + fmtW(r.actby) + "</td><td>" + esc(r.ob) + "</td><td>" + esc(periodText(r)) + "</td><td>" + esc(r.note || "") + "</td></tr>";
    });
    h += "</tbody></table></div></details>";
    out.innerHTML = h;
    var p = new URLSearchParams(); FIELDS.forEach(function (f) { var v = val(f); if (v != null && v !== "") p.set(f, v); });
    history.replaceState(null, "", "#" + p.toString());
  }
  function ics() {
    if (!last) return;
    var t = today();
    var rows = last.res.rows.filter(function (r) { return r.applies === "Yes" && r.actby && r.actby >= t && SHOW.indexOf(r.type) >= 0; });
    var d = function (x) { return E.iso(x).replace(/-/g, ""); };
    var stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    var fold = function (s) { var o = [], i = 0; while (s.length - i > 74) { o.push(s.slice(i, i + 74)); i += 74; } o.push(s.slice(i)); return o.join("\r\n "); };
    var escI = function (s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); };
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SG Filing Deadlines//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Company filing deadlines"];
    rows.forEach(function (r, i) {
      L.push("BEGIN:VEVENT", "UID:" + d(r.actby) + "-" + r.type + "-" + i + "@sg-filing-deadlines", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + d(r.actby), "DTEND;VALUE=DATE:" + d(new Date(r.actby.getTime() + 86400000)),
        fold("SUMMARY:" + escI(r.ob)), fold("DESCRIPTION:" + escI(periodText(r) + ". " + (r.note || "") + " Confirm in BizFile or myTax Portal.")),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escI(r.ob), "TRIGGER:-P7D", "END:VALARM", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    var blob = new Blob([L.join("\r\n") + "\r\n"], { type: "text/calendar" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "company-filing-deadlines.ics";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function quickFye(day, month) { setVal("fye", E.iso(E.latestFye(day, month, E.iso(today())))); render(); }

  // initial state: from link, else most recent 31 Dec
  var hp = new URLSearchParams(location.hash.slice(1));
  FIELDS.forEach(function (f) { if (hp.has(f)) setVal(f, hp.get(f)); });
  if (!val("fye")) setVal("fye", E.iso(E.latestFye(31, 12, E.iso(today()))));
  form.addEventListener("input", render); form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  document.querySelectorAll("[data-fye]").forEach(function (b) { b.addEventListener("click", function () { var p = b.getAttribute("data-fye").split("-"); quickFye(+p[0], +p[1]); }); });
  $("#btn-ics").addEventListener("click", ics);
  $("#btn-print").addEventListener("click", function () { var d = document.querySelector("details.all"); if (d) d.open = true; window.print(); });
  $("#btn-link").addEventListener("click", function () {
    var b = this; (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () { b.textContent = "Link copied"; setTimeout(function () { b.textContent = "Copy link"; }, 1800); }, function () { prompt("Copy this link", location.href); });
  });
  document.documentElement.classList.add("js");
  render();
})();
