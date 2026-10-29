/* Singapore company filing deadline rules. Same logic as the 2000 Nights
   Singapore Company Compliance Tracker workbook (rules checked 30 Oct 2026). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SGDeadlines = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // Dates are plain {y, m, d} handled in UTC to avoid time-zone drift.
  function D(y, m, d) { var t = new Date(Date.UTC(y, m - 1, d)); return t; }
  function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function Y(t) { return t.getUTCFullYear(); }
  function M(t) { return t.getUTCMonth() + 1; }
  function Dd(t) { return t.getUTCDate(); }
  // Excel EDATE
  function edate(t, n) {
    var z = (M(t) - 1) + n, y = Y(t) + Math.floor(z / 12), m = ((z % 12) + 12) % 12 + 1;
    return D(y, m, Math.min(Dd(t), dim(y, m)));
  }
  // Excel EOMONTH
  function eomonth(t, n) { var f = edate(D(Y(t), M(t), 1), n); return D(Y(f), M(f), dim(Y(f), M(f))); }
  // Excel DATE with month overflow
  function xdate(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
  function addDays(t, n) { return new Date(t.getTime() + n * 86400000); }
  function diffDays(a, b) { return Math.round((a.getTime() - b.getTime()) / 86400000); }
  function iso(t) { return t.toISOString().slice(0, 10); }
  function parse(s) { if (s instanceof Date) return s; var p = String(s).split("-"); return D(+p[0], +p[1], +p[2]); }

  var DEFAULTS = {
    inc: null, fye: null, first: "No", agm: "Send FS within 5 months", dormant: "No", epc: "Yes", solvent: "Yes",
    auditExempt: "Yes", branch: "No", eciWaiver: "No", form: "Form C-S", sffs: "No", taxWaived: "No",
    gst: "Yes", gstFreq: "Quarterly", gstMonth: 12, employees: "Yes", nEmployees: 2, today: null
  };

  function schedule(input) {
    var c = {}, k;
    for (k in DEFAULTS) c[k] = DEFAULTS[k];
    for (k in input) if (input[k] !== undefined && input[k] !== null && input[k] !== "") c[k] = input[k];
    var FYE = parse(c.fye), INC = c.inc ? parse(c.inc) : null;
    var TODAY = c.today ? parse(c.today) : (function () { var n = new Date(); return D(n.getFullYear(), n.getMonth() + 1, n.getDate()); })();
    var S = xdate(Y(FYE), M(FYE) + 1, 1), E = eomonth(S, 35);
    var MEND = iso(FYE) === iso(eomonth(FYE, 0));
    var FIRSTMAX = INC ? addDays(edate(INC, 18), -1) : null;
    var NEWCO = INC ? (c.first === "Yes" || edate(INC, 24) >= S) : false;
    var AIS = c.employees !== "Yes" ? "Not applicable" : (+c.nEmployees >= 5 ? "AIS compulsory: submit to IRAS by 1 Mar" : "Give hard-copy IR8A to staff by 1 Mar (or join AIS voluntarily)");
    var GSTFIRST = c.gst !== "Yes" ? null : (c.gstFreq === "Monthly" ? eomonth(S, 0) : eomonth(S, (((+c.gstMonth - M(S)) % 3) + 3) % 3));
    var rows = [];
    function add(r) { r.actby = r.actby || r.due; rows.push(r); }
    var yn = function (b) { return b ? "Yes" : "N/A"; };

    if (INC) {
      add({ type: "SETUP", area: "ACRA", ob: "Set up registers of controllers (RORC) and nominee directors / shareholders (ROND, RONS)", period: INC, due: INC, applies: yn(NEWCO), src: ["S6"] });
      add({ type: "SETUP", area: "ACRA", ob: "Appoint an auditor (unless audit exempt)", period: INC, due: edate(INC, 3), applies: yn(NEWCO && c.auditExempt === "No" && c.dormant === "No"), src: ["S5"] });
      add({ type: "SETUP", area: "ACRA", ob: "Appoint a company secretary", period: INC, due: edate(INC, 6), applies: yn(NEWCO), src: ["S5"] });
      add({ type: "SETUP", area: "ACRA", ob: "First financial year end no later than", period: INC, due: FIRSTMAX, applies: yn(NEWCO && c.first === "Yes"), src: ["S4"] });
    }
    for (var i = 0; i < 3; i++) {
      var fy = MEND ? eomonth(FYE, 12 * i) : edate(FYE, 12 * i);
      var hold = c.agm === "Hold an AGM";
      var fs = hold ? addDays(edate(fy, 6), -14) : edate(fy, 5);
      var ya = Y(fy) + 1;
      var ext = c.form === "Form C-S" && c.sffs === "Yes" && ya >= 2023 && ya <= 2027;
      add({ type: "AUDIT", area: "ACRA", ob: "Audit of financial statements completed", period: fy, due: fs, applies: yn(c.auditExempt === "No" && c.dormant === "No"), src: ["S8"],
        note: "Needed before the financial statements go to members. The date shown is the latest date the statements can be sent." });
      add({ type: "FS", area: "ACRA", ob: "Send financial statements to members", period: fy, due: fs, applies: yn(c.dormant === "No"), src: ["S2", "S17"],
        note: hold ? "At least 14 days before the AGM. The date shown assumes the AGM is held on its last allowed day." : "Within 5 months after FYE. This is what lets a private company skip the AGM (and it is required when the AGM is dispensed with)." });
      add({ type: "AGM", area: "ACRA", ob: "Hold the AGM", period: fy, due: edate(fy, 6), applies: yn(hold && c.dormant === "No"), src: ["S1", "S2"],
        note: c.dormant === "Yes" ? "Dormant relevant company: no AGM needed. Declare this in the annual return." : (hold ? "Within 6 months after FYE (non-listed company)." : "Not needed on your answers. A member can still ask for one up to 14 days before the 6-month deadline. Declare AGM details in the annual return.") });
      add({ type: "AR", area: "ACRA", ob: "File the annual return (BizFile)", period: fy, due: edate(fy, c.branch === "Yes" ? 8 : 7), applies: "Yes", src: ["S3", "S7", "S23"],
        note: (c.branch === "Yes" ? "Within 8 months after FYE (branch register outside Singapore). " : "Within 7 months after FYE. ") +
          (c.dormant === "Yes" ? "Dormant relevant company: no financial statements needed." : (c.epc === "Yes" && c.solvent === "Yes" ? "Solvent exempt private company: no financial statements to file; declare solvency in the return." : "File financial statements (usually in XBRL) with the return.")) +
          " Fee S$60. Late: S$300, or S$600 if more than 3 months late." });
      add({ type: "ECI", area: "IRAS", ob: "File Estimated Chargeable Income (ECI)", period: fy, due: edate(fy, 3), applies: (c.eciWaiver === "Yes" || c.taxWaived === "Yes") ? "N/A" : "Yes", src: ["S9"],
        note: "Within 3 months after FYE. Not needed if revenue is S$5m or less AND ECI is nil. Filing within 1 or 2 months gives more GIRO instalments." + (c.eciWaiver === "Not sure" ? " You chose Not sure: check the waiver conditions." : "") });
      add({ type: "TAX", area: "IRAS", ob: "File " + c.form, period: fy, due: ext ? D(ya, 12, 15) : D(ya, 11, 30), applies: c.taxWaived === "Yes" ? "N/A" : "Yes", src: ["S10", "S11", "S22"], ya: ya,
        note: "Year of Assessment " + ya + ". Due 30 Nov of the YA" + (ext ? "; 15 Dec because Form C-S is filed through accounting software (YA 2023 to 2027)." : ".") + " Late filing: composition of up to S$5,000." });
      add({ type: "RORC", area: "ACRA", ob: "Send the yearly notice to registrable controllers", period: edate(S, 12 * i), due: addDays(edate(S, 12 * (i + 1)), -1), applies: "Yes", src: ["S6"],
        note: "At least once a year, ask each registrable controller to confirm their details. The date shown is the end of each planner year." });
    }
    var f1 = xdate(Y(S) + (S > D(Y(S), 3, 1) ? 1 : 0), 3, 1);
    for (i = 0; i < 3; i++) add({ type: "IR8A", area: "IRAS", ob: "Employment income: IR8A to staff or AIS submission", period: Y(f1) - 1 + i, due: D(Y(f1) + i, 3, 1), applies: yn(c.employees === "Yes"), src: ["S12", "S21"],
      note: AIS + ". Covers all employees, including directors paid by the company." });
    for (i = 0; i < 36; i++) {
      var pe = GSTFIRST ? eomonth(GSTFIRST, c.gstFreq === "Monthly" ? i : 3 * i) : null;
      add({ type: "GST", area: "IRAS", ob: "File GST return (GST F5) and pay", period: pe, due: pe ? eomonth(pe, 1) : null,
        applies: !GSTFIRST ? "N/A" : (c.gstFreq === "Monthly" ? "Yes" : (i < 12 ? "Yes" : "N/A")), src: ["S13", "S14"],
        note: "One month after the end of each accounting period. File a nil return even with no activity. Late: S$200 at once, then S$200 per completed month, up to S$10,000 per return." });
    }
    for (i = 0; i < 36; i++) {
      var m = edate(S, i);
      add({ type: "CPF", area: "CPF", ob: "Pay CPF contributions", period: m, due: eomonth(m, 0), actby: xdate(Y(m), M(m) + 1, 14), applies: yn(c.employees === "Yes"), src: ["S15", "S18"],
        note: "Due on the last day of the month. If unpaid by the 14th of the next month (next working day if that is a weekend or holiday), interest of 1.5% a month applies." });
    }
    rows.forEach(function (r) {
      if (r.applies !== "Yes") { r.flag = "N/A"; r.days = null; return; }
      if (!r.actby) { r.flag = ""; r.days = null; return; }
      r.days = diffDays(r.actby, TODAY);
      r.flag = r.actby < TODAY ? "Overdue" : (r.days <= 30 ? "Due in 30 days" : "Upcoming");
    });
    var firstCheck = c.first !== "Yes" ? "Not applicable" : (FIRSTMAX && FYE <= FIRSTMAX ? "OK: within 18 months of incorporation" : "Check: a first financial year over 18 months needs ACRA approval");
    return { rows: rows, start: S, end: E, today: TODAY, ais: AIS, firstCheck: firstCheck, ya: Y(FYE) + 1 };
  }

  // Most recent FYE (on or before today) for a given day/month financial year end.
  function latestFye(day, month, today) {
    var t = today ? parse(today) : new Date();
    var y = Y(t), cand;
    for (var k = 0; k < 3; k++) {
      var yy = y - k, dd = (month === 2 && day >= 28) ? dim(yy, 2) : Math.min(day, dim(yy, month));
      cand = D(yy, month, dd);
      if (cand <= t) return cand;
    }
    return cand;
  }

  return { schedule: schedule, latestFye: latestFye, iso: iso, parse: parse, edate: edate, eomonth: eomonth, D: D };
});
