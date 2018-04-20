"use strict";

const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "console.js"
});

function Console(options, eventEmitter) {
  this.eventEmitter = eventEmitter;
}

Console.prototype.handler = function(line, file) {
  log.info({
    file: file
  }, line);
};

Console.prototype.start = function() {
  this.eventEmitter.on("line", this.handler);
};

Console.prototype.stop = function(cb) {
  this.eventEmitter.removeListener("line", this.handler);
  cb();
};

module.exports = Console;
