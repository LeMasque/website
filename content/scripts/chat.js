(function() {
  "use strict";
  var socket = io();

  window.onload = function() {
    document.getElementById("chatbox").onsubmit = sendMessage;
    socket.on("chat message", recieveMessage);
    socket.on("connected", init);
  };

  /********************** SERVER EVENTS ***************************/

  function init(name) {
    document.getElementById("chatLabel").textContent = name;
  }

  function recieveMessage(content, userInfo, timeStamp) {
    //userinfo.color, .username, .uin, .connected, .socket
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

})();
