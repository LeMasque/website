(function() {
  "use strict";
  var socket = io();

  window.onload = function() {
    document.getElementById("chatbox").onsubmit = sendMessage;
    document.getElementById("userSettings").onsubmit = requestNameChange;

    socket.on("chat message", recieveMessage);
    socket.on("connected", init);
    socket.on("chat setName", setName);
  };

  /********************** SERVER EVENTS ***************************/

  function init(name) {
    document.getElementById("chatLabel").textContent = name;
  }

  function recieveMessage(content, userInfo, timeStamp) {
    //userinfo.color, .username, .connected, .socket
    var thread = document.getElementById("thread");
    var tolerance = 200;
    var isAtBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - tolerance;

    var box = document.createElement("ul");
    var info = document.createElement("li");
    var message = document.createElement("li");
    var ts = document.createElement("span");
    var infoSpan = document.createElement("span");

    var infoNode = document.createTextNode(userInfo.username + ":");
    var messageNode = document.createTextNode(content);
    var tsNode = document.createTextNode(timeStamp);

    infoSpan.appendChild(infoNode);
    infoSpan.classList.add("from");
    message.appendChild(messageNode);
    message.style.color = userInfo.color;
    message.classList.add("col-xs-9", "messages");
    info.classList.add("col-xs-3");
    info.style.color = userInfo.color;
    box.classList.add("list-unstyled", "box");
    ts.classList.add("timeStamp");

    ts.appendChild(tsNode);
    info.appendChild(ts);
    info.appendChild(infoSpan);
    message.appendChild(messageNode);
    box.appendChild(info);
    box.appendChild(message);
    thread.appendChild(box);

    if (isAtBottom) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function setName(verdict, name) {
    var nameField = document.querySelector("#userSettings div");
    var feedback = document.createElement("span");
    if (verdict) {
      nameField.classList.add("has-success", "has-feedback");
      feedback.classList.add("glyphicon", "glyphicon-ok", "form-control-feedback");
      document.getElementById("setUserName").value = "";
      init(name);
    } else {
      nameField.classList.add("has-error", "has-feedback");
      feedback.classList.add("glyphicon", "glyphicon-remove", "form-control-feedback");
      document.getElementById("setUserName").value = name;
    }
    nameField.appendChild(feedback);
    setTimeout(resetUserSettings, 3000);
  }


  /********************** CLIENT EVENTS ***************************/

  function sendMessage() {
    var m = document.getElementById("message");
    var content = m.value;
    m.value = "";
    if (content.trim()) {
      socket.emit("chat message", content, Date.now());
    }
    return false;
  }

  function requestNameChange() {
    var req = document.getElementById("setUserName");
    var name = req.value;
    if (name.trim()) {
      socket.emit("chat setName", name);
    }
    return false;
  }

  function resetUserSettings() {
    var spans = document.querySelectorAll("#userSettings div span");
    if (spans.length > 0) {
      document.getElementById("userSettings").classList.remove("has-success", "has-error", "has-feedback");
      var nameField = document.querySelector("#userSettings div");
      nameField.classList.remove("has-success", "has-feedback", "has-error");
      for (var i = 0 ; i < spans.length; i++) {
        nameField.removeChild(spans[i]);
      }
    }
  }

})();
