#!/usr/local/bin/node
const util = require("./util.js");
util.setEnv();

const io = require("socket.io-client");
const _socketIoCfg = JSON.parse(process.env.socketIo);
const socket = io(_socketIoCfg.url, {
  path: _socketIoCfg.path,
  query: {
    sn: process.env.SN,
  },
  transport: ["websocket"],
});

var _output_data = [0, 0, 0];
function publish(sock, event, payload) {
  console.log(`pub: ${event}`, payload);
  if (event === "dev-data") _output_data = payload;
  socket.emit(
    event,
    {
      content: payload,
      createdAt: Date.now(),
    },
    (res) => {
      console.log("publish response=", res);
    }
  );
}
socket
  .on("connect", () => {
    console.log("event connect");
    socket["timerId"] = setInterval(() => {
      if (_transportConnected) {
        if (_modular++ % 5) publish(socket, "dev-status", "System Stable");

        publish(socket, "dev-data", [
          parseFloat(util.getRandom(0, 1, 0)),
          parseFloat(util.getRandom(0, 1, 0)),
          parseFloat(util.getRandom(0, 1, 0)),
        ]);
      }
    }, parseInt(process.env.pubInterval));
    //config.pubInterval);
    publish(socket, "dev-status", "Ready");
    _transportConnected = true;
  })
  .on("app-cmd", (payload) => {
    console.log("got app-cmd", JSON.stringify(payload));
    try {
      switch (payload.cmd) {
        case "output":
          _output_data[payload.content.field] = payload.content.value;
          publish(socket, "dev-data", _output_data);
          break;
        case "output-all":
          _output_data = _output_data.map((m) => {
            m = payload.content.value;
            return m;
          });
          publish(socket, "dev-data", _output_data);
          break;
        case "reboot":
          break;
        case "sync":
          publish(socket, "dev-data", _output_data);
          break;
        default:
          console.log("app-cmd  not supported cmd ");
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
