(function () {
  if (window.parent !== window) return;
  var root = document.documentElement;
  var btn = document.getElementById("fsBtn");
  var enter = root.requestFullscreen || root.webkitRequestFullscreen;
  var KEY = "aic-fs-off";
  if (!enter) {
    if (btn) btn.hidden = true;
    return;
  }

  function icon(d) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  var ICON_ON = icon("M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5");
  var ICON_OFF = icon("M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5");

  function active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function optedOut() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function setOptOut(on) {
    try {
      if (on) sessionStorage.setItem(KEY, "1");
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
  }
  function go() {
    var p = enter.call(root, { navigationUI: "hide" });
    if (p && p.catch) p.catch(function () {});
  }
  function refreshButton() {
    if (!btn) return;
    var on = active();
    btn.innerHTML = on ? ICON_OFF : ICON_ON;
    btn.setAttribute("aria-label", on ? "離開全螢幕" : "全螢幕");
  }

  // Browsers only allow fullscreen from a user gesture, so every device enters it on the first click/tap.
  // A page can set window.FS_BTN_ONLY_TOUCH so touch devices only enter fullscreen from the button.
  var btnOnly = !!window.FS_BTN_ONLY_TOUCH && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  document.addEventListener("click", function (e) {
    if (btnOnly || active() || optedOut() || (btn && btn.contains(e.target))) return;
    go();
  }, true);

  if (btn) {
    btn.addEventListener("click", function () {
      if (active()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        setOptOut(false);
        go();
      }
    });
  }

  var wasActive = false;
  function onChange() {
    var on = active();
    if (wasActive && !on) setOptOut(true);
    wasActive = on;
    refreshButton();
  }
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  refreshButton();
})();
