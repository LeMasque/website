(function() {

  "use strict";
  window.onload = function() {
    $(window).scroll(scroll);
  };

  function scroll() {
    var bodies = document.querySelectorAll(".parallax");
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      var curCoords = getBackgroundPos(body);
      console.log(curCoords);
      if (body.dataset.xspeed > 0) {
        console.log("xspeed: " + body.dataset.xspeed);
        var xPos = -(window.scrollY / body.dataset.xspeed); 
      };
      var newX = ((xPos ? xPos : 0) + body.xOffset) + curCoords.xUnit;
      var yPos = -(window.scrollY / body.dataset.yspeed); 
      var newY = (yPos + body.yOffset) + curCoords.yUnit;

      var newCoords = newX + " " + newY;
      console.log(body.id + ": " + newCoords);

      body.style.backgroundPosition = newCoords;
    }; // end window scroll
  }

  function getBackgroundPos(obj) {
    var pos = window.getComputedStyle(obj).backgroundPosition;
    if (pos == 'undefined' || pos == null) {
      console.log("You really need to upgrade your browser...");
    } else {
      pos = pos.split(" ");
    }
    var coords = {
      "x": parseFloat(pos[0]),
      "xUnit": pos[0].replace(/[0-9-.]/g, ""),
      "y": parseFloat(pos[1]),
      "yUnit": pos[1].replace(/[0-9-.]/g, "")
    };
    if (!obj.xOffset) {
      obj.xOffset = coords.x;
    }
    if (!obj.yOffset) {
      obj.yOffset = coords.y;
    }
    return coords;
  }

})();
