"use strict";

const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "plugin-handler.js"
});

function PluginHandler() {
  this.plugins = [];
}

PluginHandler.prototype.configure = function(context) {
  if (context.outputs) {
    for (const output of Object.keys(context.outputs)) {
      const module = context.outputs[output].module;
      log.info({
        module: module
      }, "Configuring plugin.");

      const Plugin = require(module);
      const options = Object.assign({}, context.outputs[output]);
      delete options.module;
      const plugin = new Plugin(options, context.emitter);
      this.plugins.push(plugin);

      log.info({
        module: module
      }, "Plugin configured.");

      plugin.start();
    }
  }
}

PluginHandler.prototype.destroy = function() {
  for (const plugin of this.plugins) {
    plugin.stop(() => {});
  }
}

module.exports = PluginHandler;
