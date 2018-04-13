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
  log.error({
    reason: err
  }, "Uncaught exception.");
});

const EventEmitter = require("events").EventEmitter;
const PluginHandler = require("./lib/handlers/plugin-handler.js");
const FilesHandler = require("./lib/handlers/files-handler.js");

const configHandler = require("./lib/handlers/config-handler.js");

function Seguir(options) {
  this.pluginHandler = new PluginHandler();
  this.filesHandler = new FilesHandler();
}

Seguir.prototype.configure = function(argv) {
  let context = configHandler.parse(argv);
  context.emitter = new EventEmitter();

  const destroy = this.destroy.bind(this);
  process.once('SIGINT', destroy);
  process.once('SIGQUIT', destroy);
  process.once('SIGTERM', destroy);

  this.pluginHandler.configure(context);
  this.filesHandler.configure(context);
}

Seguir.prototype.destroy = function() {
  log.info("Terminiating seguir instance.");

  this.pluginHandler.destroy();
  this.filesHandler.destroy();
}

if (require.main === module) {
  const seguir = new Seguir();
  seguir.configure(process.argv);
} else {
  module.exports = Seguir;
}
