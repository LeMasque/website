(function() {
  "use strict";

  window.onload = function() {
    //window.onscroll = scroll;
    document.getElementById("cForm").onsubmit = sendMessage;
  };

  function scroll() {
    var bodies = document.querySelectorAll(".info");
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

  function sendMessage() {
    var xhr = new XMLHttpRequest();
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var msg = document.getElementById("msg").value;
    var params = "name="+name+"&email="+email+"&msg="+msg;

    xhr.onload = messageStatusReport;
    xhr.onError = networkFail;
    xhr.open("POST", "/contact", true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send(params);
    return false;
  }

  function messageStatusReport(res) {
    res = res.currentTarget;
    var msgStatus = document.getElementById("messageStatus");
    var msgStatusBody = document.getElementById("messageStatusBody");
    var modalTitle = document.querySelector("#messageStatus h4");
    if (res.status == 200) {
      modalTitle.textContent = "Success! :D";
      msgStatusBody.textContent = "I got your message! I'll get back to you as soon as I can.";
      msgStatusBody.classList.add("bg-success");
      msgStatusBody.style.color = "green";
      msgStatusBody.style.border = "1px solid green";
    } else {
      modalTitle.textContent = "Failure to send! :(";
      var responseStatus = "Hmm... I think there were some problems with your message. Resolve them and resend.";
      responseStatus += " It's possible your message, name, or email is too long, were left blank, or some other issue arose.";
      msgStatusBody.textContent = responseStatus;
      //msgStatus.classList.add("bg-danger");
      //msgStatus.style.color = "red";
      //msgStatus.style.border = "2px solid red";
    }
    $("#messageStatus").modal("show");
    setTimeout(function() {
      //msgStatus.classList.remove("bg-success", "bg-danger");
      $("#messageStatus").modal("hide");
    }, 10000);
  }

  function networkFail(error) {
    alert("Your message was unable to send because you appear to be disconnected from the internet\nTry reconnecting and trying again");
  }

})();
