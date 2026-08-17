// Applied as an external, synchronously-loaded <head> script (not inline) so
// it satisfies a strict `script-src 'self'` CSP while still running before
// first paint to avoid a flash of the wrong theme.
(function () {
  var theme = localStorage.getItem("theme");
  if (theme) document.documentElement.setAttribute("data-theme", theme);
})();
