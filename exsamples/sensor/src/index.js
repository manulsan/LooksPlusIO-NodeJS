#!/usr/local/bin/node

const { setEnv, getRandom } = require("./util.js");
setEnv();

let _countOfInterval = 0;
let _transportConnected = false;
let _output_data = [0, 0, 0]; // if device has 3 sensors then array size will be 3

const io = require("socket.io-client");
const _configSocketIo = JSON.parse(process.env.socketIo);
const socket = io(_configSocketIo.url, {
  path: _configSocketIo.path,
  query: { sn: process.env.SN },
  transport: ["websocket"],
});

//------------------------------------------------------
// name : publish
async function publish(topic, data) {
  try {
    const payload = {
      content: data,
      createdAt: Date.now(), // can be removed, if then use server timestamp
    };
    await socket.emit(topic, payload);
    if (topic === "dev-data") _output_data = data; // update local variable
    console.log(`pub: ${topic}`, payload);
  } catch (error) {
    console.error("publish error=", error);
  }
}

//------------------------------------------------------
// name : socket functions
socket
  .on("connect", () => {
    console.log("______ socketIo connected ______");
    socket["timerId"] = setInterval(() => {
      if (_transportConnected) {
        if (_countOfInterval++ % 10 === 9)
          publish("dev-status", "System Stable"); // upload status to server, can be removed

        // upload data to server
        publish("dev-data", [
          getRandom(0, 100, 2),
          getRandom(0, 100, 2),
          getRandom(0, 100, 2),
        ]);
      }
    }, parseInt(process.env.pubInterval));
    publish("dev-status", "Ready");
    _transportConnected = true;
  })
  .on("app-cmd", (payload) => {
    console.log("got app-cmd", JSON.stringify(payload));
    try {
      switch (payload.cmd) {
        case "sync":
          console.log("app-cmd: received sync cmd");
          publish("dev-data", _output_data);
          break;
        case "reboot":
          console.log("app-cmd: receive reboot cmd");
          // if youe device support reboot then do reboot
          break;
        case "output":
          console.log("received output cmd, sensor does not support output");
          break;
        case "output-all":
          console.log("received output-all sensor does not support output");
          break;
        default:
          console.log(`app-cmd :  not supported cmd ${payload.cmd}`);
          break;
      }
    } catch (e) {
      console.log("err=", e);
    }
  })
  .on("connect_error", (error) => {
    console.log("connect_error:", error);
  })
  .on("error", (error) => {
    console.log("error:", error);
  })
  .on("disconnect", (reason) => {
    console.log("______disconnected:", reason);
    _transportConnected = false;

    if (socket["timerId"]) {
      clearInterval(socket.timerId);
      delete socket.timerId;
    }

    if (reason === "io server disconnect") {
      setTimeout(() => {
        socket.connect();
      }, 10000);
    }
  })
  .on("reconnect", (attemptNumber) => {
    console.log("reconnect:", attemptNumber);
  })
  .on("reconnecting", (attemptNumber) => {
    console.log("reconnecting:", attemptNumber);
  })
  .on("reconnect_failed", () => {
    console.log("reconnect_failed:");
  });
