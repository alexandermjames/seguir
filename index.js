#!/usr/bin/env node

"use strict";

const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "seguir.js"
});

process.once("unhandledRejection", (p, reason) => {
  log.error({
    promise: p,
    reason: reason
  }, "Unhandled rejection.");
});

process.once("uncaughtException", (err) => {
  log.error(err, "Uncaught exception.");
});

const EventEmitter = require("events").EventEmitter;
const Plugins = require("./lib/handlers/plugins.js");
const Files = require("./lib/handlers/files.js");
const config = require("./lib/handlers/config.js");

function Seguir(options) {
  let opts = config.parse(options);
  opts.emitter = new EventEmitter();
  this.plugins = new Plugins(opts);
  this.files = new Files(opts);

  const destroy = this.destroy.bind(this);
  process.once('SIGINT', destroy);
  process.once('SIGQUIT', destroy);
  process.once('SIGTERM', destroy);
}

Seguir.prototype.destroy = function() {
  log.info("Terminiating seguir instance.");
  this.plugins.destroy();
  this.files.destroy();
}

if (require.main === module) {
  new Seguir(process.argv);
} else {
  module.exports = Seguir;
}
