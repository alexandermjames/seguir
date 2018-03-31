"use strict";

const probe = require("pmx").probe();

const changesPerSecond = probe.meter({
  name      : "changes/sec",
  samples   : 1,
  timeframe : 1
});

const linesPerSecond = probe.meter({
  name      : "lines/sec",
  samples   : 1,
  timeframe : 1
});

const lines = probe.counter({
  name : "lines/total"
});

const errors = probe.counter({
  name : "errors/total"
});

const changes = probe.counter({
  name : "changes/total"
});

const files = probe.counter({
  name : "files/total"
});

const throttled = probe.counter({
  name : "throttled/total"
});

module.exports = {
  linesPerSecond: linesPerSecond,
  changesPerSecond: changesPerSecond,
  lines: lines,
  changes: changes,
  errors: errors,
  files: files,
  throttled: throttled
};
