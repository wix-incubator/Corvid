/* eslint-disable no-console */
const path = require("path");
const childProcess = require("child_process");
const process = require("process");
const { BrowserWindow } = require("electron");
const client = require("socket.io-client");
const chalk = require("chalk");
const electron = require("electron");

const { startInCloneMode, startInEditMode } = require("corvid-local-server");
const serverErrors = require("../utils/server-errors");
const { readCorvidConfig } = require("../utils/corvid-config");
const { sendRequest } = require("../utils/socketIoHelpers");

const isHeadlessMode = !process.env.CORVID_CLI_DISABLE_HEADLESS;
const isDevTools = !!process.env.CORVID_CLI_DEVTOOLS;

function launch(file, options = {}, callbacks = {}) {
  options.env = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: "yes"
  };
  const cp = childProcess.spawn(
    electron,
    [path.resolve(path.join(file)), "--enable-logging"],
    {
      ...options
    }
  );

  return new Promise((resolve, reject) => {
    const messages = [];

    if (options.detached) {
      cp.unref();
      resolve();
    } else {
      if (options.stdio !== "ignore") {
        cp.stdout.on("data", function(data) {
          try {
            const msg = JSON.parse(data);
            if (typeof msg === "object") {
              messages.push(msg);
              if (msg.event && typeof callbacks[msg.event] === "function") {
                callbacks[msg.event](msg.payload);
              }
            }
          } catch (_) {
            return;
          }
        });

        cp.stderr.on("data", function(data) {
          process.stderr.write(data.toString());
        });
      }

      cp.on("exit", code => {
        code === 0 ? resolve(messages) : reject(code);
      });
    }
  });
}

async function connectToLocalServer(serverMode, win) {
  const server =
    serverMode === "edit" ? startInEditMode(".") : startInCloneMode(".");
  const {
    adminPort: localServerPort,
    close: closeLocalServer
  } = await server.catch(exc => {
    if (exc.message in serverErrors) {
      throw chalk.red(serverErrors[exc.message]);
    }
  });

  win.on("close", () => {
    closeLocalServer();
  });

  const clnt = client.connect(`http://localhost:${localServerPort}`);

  await new Promise((resolve, reject) => {
    clnt.on("connect", () => {
      console.log(JSON.stringify({ event: "localServerConnected" }));
      resolve();
    });

    setTimeout(reject, 1000);
  });

  clnt.on("editor-connected", () => {
    console.log(JSON.stringify({ event: "editorConnected" }));
  });

  const localServerStatus = await sendRequest(clnt, "GET_STATUS");

  return { client: clnt, localServerStatus };
}

async function openWindow(app, windowOptions = {}) {
  const win = new BrowserWindow({
    width: 1280,
    height: 960,
    show: !isHeadlessMode,
    ...windowOptions,
    webPreferences: { nodeIntegration: false }
  });

  try {
    if (isDevTools) {
      win.webContents.openDevTools({ mode: "detach" });
    }

    await new Promise(resolve => {
      setTimeout(resolve, isDevTools ? 1000 : 0);
    }).then(async () => {
      const corvidConfig = await readCorvidConfig(".");

      if (app.serverMode) {
        const { client: clnt, localServerStatus } = await connectToLocalServer(
          app.serverMode,
          win
        );

        return app.handler(corvidConfig, win, clnt, localServerStatus);
      } else {
        return app.handler(corvidConfig, win);
      }
    });

    win.close();
  } catch (exc) {
    console.error(exc);
    process.exit(-1);
  }
}

module.exports = {
  openWindow,
  launch
};
