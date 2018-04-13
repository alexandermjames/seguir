"use strict";

const Ajv = require("ajv");

const seguir = require("commander");
const bunyan = require("bunyan");
const schema = require("../schema/schema.json");
const fs = require("fs");

const ajv = new Ajv();
const log = bunyan.createLogger({
  name: "seguir",
  file: "config-handler.js"
});

seguir
  .version("1.0.0", "-v, --version")
  .description("Node.js native \"tail\" functionality.")
  .option("-c, --config <file>", "load settings from a configuration file")
  .option("-f, --files <files>", "comma separated list of absolute file paths to watch", (val) => {
    return val.split(",");
  })
  .option("-D, --checkpoint-directory <directory>", "directory to use for checkpointing in case of failures. defaults to /tmp.")
  .option("-R, --checkpoint-rate <rate>", "rate, in milliseconds, to checkpoint. defaults to 10000.", parseInt)
  .option("-O, --offset <position>", "file start offset for non checkpointed files. defaults to end of file.", parseInt)
  .option("-s, --separator <separator>", "line separator. defaults to \\n.")
  .option("--follow", "follow rotated files. defaults to false.")
  .option("--stdout", "enables plugin which outputs processed lines to stdout. defaults to not enabled.");

const parse = (argv) => {
  seguir.parse(argv);
  let context = {};

  if (seguir.config) {
    context = JSON.parse(fs.readFileSync(seguir.config));
    if (!ajv.validate(schema, config)) {
      const err = {
        message: "The provided configuration was in an invalid format.",
        errors: ajv.errorsText()
      };

      throw new Error(err);
    }
  }

  if (!context.checkpoints) {
    context.checkpoints = {
      directory: "/tmp",
      rate: 10000
    };
  }

  if (context.options) {
    if (!context.options.follow) {
      context.options.follow = false;
    }

    if (!context.options.separator) {
      context.options.separator = "\n";
    }

    if (!context.options.offset) {
      context.options.offset = undefined;
    }
  } else {
    context.options = {
      follow: false,
      separator: "\n",
      offset: undefined
    }
  }

  if (!context.files) {
    context.files = [];
  }

  if (seguir.follow) {
    context.options.follow = seguir.follow;
  }

  if (seguir.separator) {
    context.options.separator = seguir.separator;
  }

  if (typeof seguir.offset !== "undefined") {
    context.options.offset = seguir.offset;
  }

  if (seguir.checkpointDirectory) {
    context.checkpoints.directory = seguir.checkpointDirectory;
  }

  if (typeof seguir.checkpointRate !== "undefined") {
    context.checkpoints.rate = seguir.checkpointRate;
  }

  if (seguir.files) {
    context.files = context.files.concat(seguir.files);
  }

  context.checkpoints.file = context.checkpoints.directory + "/checkpoint.log";
  context.files = new Set(context.files);

  if (seguir.stdout) {
    const stdoutOutputConfig = {
      module: "../outputs/console.js"
    };

    if (context.outputs) {
      context.outputs.push(stdoutOutputConfig);
    } else {
      context.outputs = [stdoutOutputConfig];
    }
  }

  log.info({
    context: context
  }, "Successfully initialized context.",);

  return context;
};

module.exports = {
  parse: parse
};
