"use strict";

const EventEmitter = require("events").EventEmitter;

const fs = require("fs");
const util = require("util");

function Tail(filename, separator, options) {
  let opts = Object.assign({}, options);
  this.filename = filename;
  this.separator = separator || "\n";
  this.stats = {};
  this.follow = typeof opts.follow !== "undefined" ? opts.follow : true;
  this.encoding = opts.encoding || "utf8";
  this.offset = opts.offset;
};

Tail.prototype.watch = function() {
  if (typeof this.fsWatcher !== "undefined") {
    return;
  }

  this.available = this.read.bind(this);
  this.initialize(this.filename, fs.statSync(this.filename), this.offset);
  this.fsWatcher = fs.watch(this.filename, {
    persistent: true,
    recursive: false,
    encoding: "utf8"
  }, (eventType, filename) => {
    this.check(this.filename);
  });

  this.fsWatcher.on("error", this.sanitize);
};

Tail.prototype.initialize = function(filename, stats, offset) {
  this.fd = fs.openSync(filename, "r");
  this.stats[this.fd] = {
    pos: typeof offset !== "undefined" ? offset : stats.size,
    ino: stats.ino,
    size: stats.size,
    data: "",
    buffer: Buffer.allocUnsafe(stats.blksize)
  };

  setImmediate(this.available, this.fd);
};

Tail.prototype.unwatch = function() {
  if (typeof this.fsWatcher === "undefined") {
    return;
  }

  this.fsWatcher.close();
  this.fsWatcher = undefined;
  for (const fd of Object.keys(this.stats)) {
    fs.closeSync(parseInt(fd));
  }
};

Tail.prototype.check = function(filename) {
  try {
    const stats = fs.statSync(filename);
    if (this.stats[this.fd].ino !== stats.ino) {
      setImmediate(this.available, this.fd, true);

      if (this.follow) {
        this.initialize(filename, stats, 0);
      } else {
        this.unwatch(() => {});
      }
    } else if (this.stats[this.fd].pos === this.stats[this.fd].size) {
      this.stats[this.fd].size = stats.size;
      setImmediate(this.available, this.fd);
    } else if (this.stats[this.fd].pos < this.stats[this.fd].size) {
      this.stats[this.fd].size = stats.size;
    }
  } catch (err) {
    this.sanitize(err);
  }
};

Tail.prototype.sanitize = function(err) {
  if (err.code !== "ENOENT") {
    this.emit("error", err);
  }
};

Tail.prototype.read = function(fd, close) {
  if (this.stats[fd].size < this.stats[fd].pos) {
    this.stats[fd].pos = 0;
  }

  const separatorByteLength = Buffer.byteLength(this.separator, this.encoding);
  const length = Math.min(this.stats[fd].buffer.length, this.stats[fd].size - this.stats[fd].pos);

  try {
    let bytesRead = fs.readSync(fd, this.stats[fd].buffer, 0, length, this.stats[fd].pos);

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

      current = index + separatorByteLength;
      index = this.stats[fd].buffer.indexOf(this.separator, index + separatorByteLength, this.encoding);
    }

    this.stats[fd].data = this.stats[fd].buffer.toString(this.encoding, current, bytesRead);
    this.stats[fd].pos += bytesRead;

    if (fd === this.fd) {
      this.emit("checkpoint", this.stats[fd].pos - (bytesRead - current));
    }

    if (this.stats[fd].pos === this.stats[fd].size) {
      if (close) {
        fs.closeSync(fd);
      }

      return;
    }

    setImmediate(this.available, fd, close);
  } catch (err) {
    this.sanitize(err);
  }
};

util.inherits(Tail, EventEmitter);

module.exports = Tail;
