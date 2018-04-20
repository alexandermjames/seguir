"use strict";

const Tail = require("../tail.js");
const fs = require("fs");
const bunyan = require("bunyan");

const log = bunyan.createLogger({
  name: "seguir",
  file: "files.js"
});

function Files(options) {
  this.watched = [];
  const opts = Object.assign({}, options);
  let checkpoints = {};

  try {
    checkpoints = JSON.parse(fs.readFileSync(opts.checkpoints.file));
    if (checkpoints === {}) {
      fs.writeFileSync(opts.checkpoints.file, "");
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  for (const file in Object.keys(checkpoints)) {
    if (!opts.files.has(file)) {
      delete checkpoints[file];
    }
  }

  for (const file of opts.files) {
    if (!checkpoints[file]) {
      checkpoints[file] = opts.options.offset;
    }
  }

  this.checkpointer = setInterval(() => {
    log.info({
      file: opts.checkpoints.file
    }, "Checkpointing.");

    fs.writeFileSync(opts.checkpoints.file, JSON.stringify(checkpoints));
  }, opts.checkpoints.rate);

  for (const file of opts.files) {
    const tail = new Tail(file, opts.options.separator, {
      follow: opts.options.follow,
      offset: checkpoints[file]
    });

    this.watched.push(tail);
    tail.on("error", log.error);
    tail.on("line", (line) => {
      try {
        opts.emitter.emit("line", line, file);
      } catch (err) {
        log.error(err);
      }
    });

    tail.on("checkpoint", (position) => {
      checkpoints[file] = position;
    });

    tail.watch();
  }
};

Files.prototype.destroy = function() {
  clearInterval(this.checkpointer);
  this.checkpointer = undefined;
  for (const tail of this.watched) {
    log.info({
      file: tail.filename
    }, "Unwatching file.");

    tail.unwatch();
  }
};

module.exports = Files;
