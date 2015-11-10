(function() {
  "use strict";
  var socket = io();

  window.onload = function() {
    document.getElementById("chatbox").onsubmit = sendMessage;
    socket.on("chat message", recieveMessage);
  };

  function sendMessage() {
    var m = document.getElementById("message");
    var content = m.value;
    m.value = "";
    if (content.trim()) {
      console.log(content);
      socket.emit("chat message", content);
    }
    return false;
  }

  function recieveMessage(content, userInfo, timeStamp) {
    //userinfo.color, .username, .uin, .connected
    var thread = document.getElementById("thread");
    var box = document.createElement("ul");
    var info = document.createElement("li");
    var content = document.createElement("li");
    var ts = document.createElement("span");
    var contentSpan = document.createElement("span");
    var infoNode = document.createTextNode(userInfo.name + ":");
    var contentNode = document.createTextNode(content);
    contentSpan.appendChild(contentNode);
    contentSpan.style.color = userInfo.color;
    //TODO: add to content and info classlist "list-unstyled"
    //TODO: make css for the ul for each post
    //FIXME: just like, in general.
    info.appendChild(ts);
    info.appendChild(infoNode);
    content.appendChild(contentNode);
    box.appendChild(info);
    box.appendChild(content);
    thread.appendChild(box);
  }

})();
