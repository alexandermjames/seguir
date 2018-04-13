"use strict";

const Tail = require("../tail.js");
const fs = require("fs");
const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "files-handler.js"
});

function FilesHandler() {
  this.watched = [];
}

FilesHandler.prototype.configure = function(context) {
  let checkpoints = {};

  try {
    checkpoints = JSON.parse(fs.readFileSync(context.checkpoints.file));
    if (checkpoints === {}) {
      fs.writeFileSync(context.checkpoints.file, "");
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  for (const file in Object.keys(checkpoints)) {
    if (!context.files.has(file)) {
      delete checkpoints[file];
    }
  }

  for (const file of context.files) {
    if (!checkpoints[file]) {
      checkpoints[file] = context.options.offset;
    }
  }

  this.checkpointer = setInterval(() => {
    log.info({
      file: context.checkpoints.file
    }, "Checkpointing.");

    fs.writeFileSync(context.checkpoints.file, JSON.stringify(checkpoints));
  }, context.checkpoints.rate);

  for (const file of context.files) {
    const tail = new Tail(file, context.options.separator, {
      follow: context.options.follow,
      offset: checkpoints[file]
    });

    this.watched.push(tail);
    tail.on("error", console.error);
    tail.on("line", (line) => {
      context.emitter.emit("line", line, file);
    });

    tail.on("checkpoint", (position) => {
      checkpoints[file] = position;
    });

    tail.watch();
  }
};

FilesHandler.prototype.destroy = function() {
  log.info("Terminiating seguir instance.");

  clearInterval(this.checkpointer);
  this.checkpointer = undefined;

  for (const tail of this.watched) {
    log.info({
      file: tail.filename
    }, "Unwatching file.");

    tail.unwatch();
  }
};

module.exports = FilesHandler;
