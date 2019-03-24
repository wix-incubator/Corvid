const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const readWixCodeConfig = dir =>
  new Promise((resolve, reject) => {
    fs.readFile(path.join(dir, ".wixcoderc.json"), (exc, config) => {
      if (exc) {
        if (exc.code === "ENOENT") {
          reject(
            chalk.red(`Could not find .wixcoderc.json in ${path.resolve(dir)}`)
          );
        } else {
          reject(exc);
        }
      } else {
        resolve(config);
      }
    });
  }).then(json => JSON.parse(json));

module.exports = readWixCodeConfig;