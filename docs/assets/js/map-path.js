(function () {
  function draw(map) {
    var grid = map.querySelector(".map-grid");
    if (!grid) return;
    var islands = Array.prototype.slice.call(grid.querySelectorAll(".island"));
    if (islands.length < 2) return;

    var mapRect = map.getBoundingClientRect();
    var points = islands.map(function (isle) {
      var shell = isle.querySelector(".shell");
      var r = shell.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - mapRect.left,
        y: r.top + r.height / 2 - mapRect.top,
      };
    });

    var svg = map.querySelector(".map-path-svg");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "map-path-svg");
      map.insertBefore(svg, map.firstChild);
    }
    svg.setAttribute("width", mapRect.width);
    svg.setAttribute("height", mapRect.height);
    svg.setAttribute("viewBox", "0 0 " + mapRect.width + " " + mapRect.height);

    var d = "M " + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var cur = points[i];
      var midX = (prev.x + cur.x) / 2;
      var midY = (prev.y + cur.y) / 2;
      d += " Q " + prev.x + " " + midY + " " + midX + " " + midY;
      d += " Q " + cur.x + " " + midY + " " + cur.x + " " + cur.y;
    }

    svg.innerHTML =
      '<path d="' + d + '" fill="none" stroke="rgba(255,209,102,.55)" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" />';
  }

  function drawAll() {
    document.querySelectorAll(".map").forEach(draw);
  }

  var raf = null;
  function scheduleDraw() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawAll);
  }

  window.addEventListener("load", drawAll);
  window.addEventListener("resize", scheduleDraw);
  document.addEventListener("DOMContentLoaded", drawAll);
})();
