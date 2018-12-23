"use strict";

/*
 * Copyright(c) © 2018-2019 Sorin Zaporojan.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const
  Process       = require("process"),
  OS            = require("os"),
  inherits      = require("util").inherits,
  EventEmitter  = require("events");


function stats(optsArgs) {

  if (!(this instanceof stats)) {
    return new stats(optsArgs);
  }

  let opts = optsArgs || {tags: [], stats: {interval: 600000 /*10 min*/, auto_start: false}};
  this.opts = {
    tags: opts["tags"],
    interval: opts["stats"].interval,
    auto_start: opts["stats"].auto_start
  };

  this.timer_id = -1;
  this.stats = {
    timestamp: new Date(),
    tags: this.opts.tags,

    process: {
      title: Process.title,
      pid: Process.pid,
      release: Process.release,
      versions: Process.versions,
      argv: Process.argv,
      execArgv: Process.execArgv,
      execPath: Process.execPath,
      memoryUsage: Process.memoryUsage(),
      uptime: Process.uptime()
    },
    system: {
      cpus: OS.cpus(),
      uptime: OS.uptime(),
      freemem: OS.freemem(),
      hostname: OS.hostname(),
      platform: Process.platform,
      arch: Process.arch
    }
  };

  if (this.opts.auto_start)
    Process.nextTick(() => this.start());
}

inherits(stats, EventEmitter);

stats.prototype.start = function() {
  if (this.timer_id == -1)
    this.timer_id = setInterval(() => this.emit("stats", this.getdata()), this.opts.interval);
};

stats.prototype.stop = function() {
  if (this.timer_id) {
    clearInterval(this.timer_id);
    this.timer_id = -1;
  }
};

stats.prototype.getdata = function() {
  this.stats.timestamp = new Date();

  this.stats.process.memoryUsage = Process.memoryUsage();
  this.stats.process.uptime = Process.uptime();

  this.stats.system.uptime = OS.uptime();
  this.stats.system.freemem = OS.freemem();

  return this.stats;
};


module.exports = stats;

