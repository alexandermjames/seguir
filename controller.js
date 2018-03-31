"use strict";

var Tail = require("./index.js");
var Limiter = require("./limiter.js");

var filename = "/tmp/test.log";
var limiter = new Limiter(5242880, 500);
var tail = new Tail(filename, "\n", {
  offset: 0,
  follow: true,
  encoding: "utf8",
  limiter: limiter
});

tail.on("line", console.log);
tail.on("error", console.error);
tail.on("checkpoint", console.log);

tail.watch();
