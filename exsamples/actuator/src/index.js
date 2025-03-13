#!/usr/local/bin/node

const { setEnv, getRandom } = require("./util.js");
setEnv();

let _countOfInterval = 0;
let _transportConnected = false;
let _output_data = [0, 0, 0]; // if device has 3 outputs

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

        // upload data to server every interval
        publish("dev-data", [
          getRandom(0, 1, 0),
          getRandom(0, 1, 0),
          getRandom(0, 1, 0),
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
          publish("dev-data", _output_data);
          break;
        case "reboot":
          // if youe device support reboot then do reboot
          break;
        case "output":
          _output_data[payload.content.field] = payload.content.value;
          publish("dev-data", _output_data);
          break;
        case "output-all":
          _output_data = _output_data.map((m) => {
            m = payload.content.value;
            return m;
          });
          // do something here and  just set the transmit value only,
          // it is better not to call publish in this callback function
          publish("dev-data", _output_data);
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
    console.log("disconnected:", reason);
    _transportConnected = false;
    // remove sockets
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
