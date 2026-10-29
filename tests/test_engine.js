const E = require("../assets/engine.js");
const data = require("./workbook_expected.json");
const L = {inc:"Incorporation date",fye:"Most recent financial year end (FYE)",first:"Is that FYE the company's first FYE?",agm:"How does the company deal with its AGM?",dormant:"Dormant relevant company? (dormant, not listed, total assets S$500,000 or less)",epc:"Exempt private company? (fewer than 20 members, no corporate shareholder)",solvent:"Is the company solvent (can pay its debts as they fall due)?",auditExempt:"Audit exempt as a small company?",branch:"Keeps a branch register of members outside Singapore?",eciWaiver:"ECI waiver applies? (revenue S$5m or less AND ECI is nil)",form:"Corporate tax return form",sffs:"Filing Form C-S through accounting software (#SFFS)?",taxWaived:"IRAS has waived the company's tax return? (status 'No Business Done')",gst:"GST registered?",gstFreq:"GST filing frequency",gstMonth:"Month one of your GST quarters ends (1 to 12)",employees:"Does the company have employees (including paid directors)?",nEmployees:"Number of employees in the year",today:"Today's date (leave blank)"};
let total = 0, fails = 0, out = {};
for (const [name, {setup, rows}] of Object.entries(data)) {
  const inp = {}; for (const [k, l] of Object.entries(L)) inp[k] = setup[l];
  const res = E.schedule(inp);
  const f = (v) => v instanceof Date ? E.iso(v) : v;
  let n = 0, bad = [];
  if (res.rows.length !== rows.length) bad.push(`row count ${res.rows.length} vs ${rows.length}`);
  rows.forEach((w, i) => {
    const g = res.rows[i]; n++;
    const gotOb = g.ob, cmp = [["ob", gotOb, w.ob], ["period", f(g.period), w.period], ["due", f(g.due), w.due], ["actby", f(g.actby), w.actby], ["applies", g.applies, w.applies], ["flag", g.flag, w.flag], ["days", g.days ?? null, w.days === "" ? null : w.days], ["type", g.type, w.type]];
    for (const [k, a, b] of cmp) if (String(a) !== String(b)) bad.push(`row ${i+1} ${w.ob} ${k}: js=${a} workbook=${b}`);
  });
  if (res.ais !== setup["IR8A / Auto-Inclusion Scheme"]) bad.push("AIS text");
  if (res.firstCheck !== setup["First FYE check"]) bad.push("first FYE check");
  if (E.iso(res.start) !== setup["Planner starts"]) bad.push("planner start");
  total += n; fails += bad.length; out[name] = {rows: n, fieldsCompared: n * 8, mismatches: bad};
  console.log(name, "rows", n, "mismatches", bad.length); bad.slice(0, 10).forEach(b => console.log("  ", b));
}
require("fs").writeFileSync(__dirname + "/js_test_results.json", JSON.stringify({date: "2026-10-30", total, fails, out}, null, 1));
console.log(fails ? "FAIL" : "PASS", total, "rows compared");
process.exit(fails ? 1 : 0);
