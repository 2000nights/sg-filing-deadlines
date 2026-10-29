# Singapore company filing deadline calculator

A free, static web page by 2000 Nights. Enter a financial year end and see the AGM, annual return, ECI, Form C-S / C, GST F5, CPF and IR8A dates for a Singapore private company, each with its rule and official source.

- `index.html`, `assets/`: the site (plain HTML, CSS and JavaScript; no cookies, no tracking, no external requests).
- `assets/engine.js`: the date rules, shared with the Singapore Company Compliance Tracker workbook.
- `tests/`: `node tests/test_engine.js` checks the rules against four sample companies recalculated in the workbook.

Not legal or tax advice. Rules last checked 30 Oct 2026.
