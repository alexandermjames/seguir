"use strict";

const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "plugin.js"
});

function Plugins(options) {
  const opts = Object.assign({}, options);
  this.plugins = [];

  if (opts.outputs) {
    for (const output of Object.keys(opts.outputs)) {
      const module = opts.outputs[output].module;
      const Plugin = require(module);
      const pluginOptions = Object.assign({}, opts.outputs[output]);
      delete pluginOptions.module;
      const plugin = new Plugin(pluginOptions, opts.emitter);
      this.plugins.push(plugin);

      log.info({
        module: module
      }, "Plugin configured.");

      plugin.start();
    }
  }
}

Plugins.prototype.destroy = function() {
  for (const plugin of this.plugins) {
    plugin.stop(() => {});
  }
}

module.exports = Plugins;
