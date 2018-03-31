"use strict";

const EventEmitter = require("events").EventEmitter;

const fs = require("fs");
const util = require("util");
const probe = require("./probe.js");

// TODO: Rate limiting contract? How to pause and not queue up the event loop?

// TODO: Fix bug which does not read when multiple lines written back to back.
// Do we care about the size but only as a minimum threshold?

function Tail(filename, separator, options) {
  let opts = Object.assign({}, options);
  this.filename = filename;
  this.separator = separator || "\n";
  this.follow = typeof opts.follow !== "undefined" ? opts.follow : true;
  this.encoding = opts.encoding || "utf8";
  this.offset = opts.offset;
  this.limiter = opts.limiter;
  this.stats = {};
};

Tail.prototype.watch = function() {
  if (typeof this.fsWatcher !== "undefined") {
    return;
  }

  this.on("rotated", this.check);
  this.on("available", this.read);

  this.initialize(this.filename, fs.statSync(this.filename), this.offset);

  probe.files.inc();
  this.fsWatcher = fs.watch(this.filename, {
    persistent: true,
    recursive: false,
    encoding: "utf8"
  }, (eventType, filename) => {
    probe.changesPerSecond.mark();
    probe.changes.inc();
    this.check(this.filename);
  });

  this.fsWatcher.on("error", this.sanitize);
};

Tail.prototype.unwatch = function() {
  if (typeof this.fsWatcher !== "undefined") {
    this.fsWatcher.close();
    this.fsWatcher = undefined;

    probe.files.dec();
    for (const fd of Object.keys(this.stats)) {
      fs.closeSync(fd);
    }

    this.emit("close");
  }
};

Tail.prototype.initialize = function(filename, stats, offset) {
  this.fd = fs.openSync(filename, "r");
  this.stats[this.fd] = {
    pos: typeof offset !== "undefined" ? offset : stats.size,
    ino: stats.ino,
    size: stats.size,
    blksize: stats.blksize,
    data: "",
    buffer: Buffer.allocUnsafe(stats.blksize)
  };

  this.emit("available", this.fd);
};

Tail.prototype.check = function(filename) {
  try {
    const stats = fs.statSync(filename);
    if (typeof this.fd === "undefined") {
      this.initialize(filename, stats, 0);
    } else if (this.stats[this.fd].ino !== stats.ino) {
      this.emit("available", this.fd, true);
      this.fd = undefined;

      if (this.follow) {
        this.emit("rotated", filename);
      } else {
        this.unwatch();
      }
    } else if (this.stats[this.fd].size === stats.size) {
      return;
    } else if (this.stats[this.fd].pos === this.stats[this.fd].size) {
      this.stats[this.fd].size = stats.size;
      this.emit("available", this.fd);
    } else {
      this.stats[this.fd].size = stats.size;
    }
  } catch (err) {
    this.sanitize(err);
  }
};

Tail.prototype.sanitize = function(err) {
  if (err.code !== "ENOENT") {
    probe.errors.inc();
    this.emit("error", err);
  }
};

Tail.prototype.read = function(fd, close) {
  if (this.stats[fd].size < this.stats[fd].pos) {
    this.stats[fd].pos = 0;
  }

  const separatorByteLength = Buffer.byteLength(this.separator, this.encoding);

  try {
    let bytesRead = fs.readSync(fd, this.stats[fd].buffer, 0, this.stats[fd].blksize, this.stats[fd].pos);

    if (bytesRead === 0 && this.stats[fd].pos < this.stats[fd].size) {
      return this.emit("available", fd, close);
    } else if (bytesRead === 0 && close) {
      return fs.closeSync(fd);
    }

    let current = 0;
    let index = this.stats[fd].buffer.indexOf(this.separator, 0, this.encoding);
    while (index !== -1) {
      if (index > bytesRead) {
        break;
      }

      let line;
      if (current === 0) {
        line = this.stats[fd].data + this.stats[fd].buffer.toString(this.encoding, current, index)
      } else {
        line = this.stats[fd].buffer.toString(this.encoding, current, index);
      }

      this.emit("line", line);
      probe.lines.inc();
      probe.linesPerSecond.mark();

      current = index + separatorByteLength;
      index = this.stats[fd].buffer.indexOf(this.separator, index + separatorByteLength, this.encoding);
    }

    this.stats[fd].data = this.stats[fd].buffer.toString(this.encoding, current, bytesRead);
    this.stats[fd].pos += bytesRead;

    if (fd === this.fd) {
      this.emit("checkpoint", this.stats[fd].pos);
    }

    if (this.stats[fd].pos > this.stats[fd].size) {
      this.stats[fd].size = this.stats[fd].pos;
    }

    this.emit("available", fd, close);
  } catch (err) {
    this.sanitize(err);
  }
};

Tail.prototype.throttle = function(err, remainingTokens) {
  if (err) {
    // throttle
  } else {

  }
}

util.inherits(Tail, EventEmitter);

module.exports = Tail;
