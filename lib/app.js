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
  nats = require("ts-nats");

const
  stats = require("./stats"),
  context = require("./context");


const cbSub = (f, fn) => (err, msg) => f(fn(err, msg));

module.exports = class Application {

  constructor(opts) {
    this.options    = opts || {stats: {interval: 600000, auto_start: false}};
    this.context    = Object.create(context);
    this.nats       = undefined;

    this.stats = stats(this.options);
  }

  connect(opts) {
    return new Promise( (resolve, reject) => {
      if (this.nats && this.nats.connected)
        return resolve();
      
      nats.connect(opts).then(
        (nc) => {
          this.nats = nc;
          return resolve();
        },
        (err) => reject(err)
      );
    });
  }

  close(bShutdown = true) {
    this.stats.stop();

    if (this.nats && this.nats.connected) {
      this.nats.drain().then(
        () => this.nats.close(),
        (err) => console.error(err)
      );
    }
  }

  isClosed() {
    if (this.nats)
      return this.nats.isClosed();
    else
      return true;
  }

  publish(subject, data, reply = "") {
    if (!this.nats || (this.nats && this.nats.isClosed()))
      throw new Error("Nats client not connected.");

    this.nats.publish(subject, data, reply);
  }

  subscribe(subject, cb, opts = {}) {
    return new Promise((resolve, reject) => {
      if (!this.nats || (this.nats && this.nats.isClosed()))
        return reject(new Error("Nats client not connected."));

      this.nats.subscribe(subject, cbSub(cb, (x, y) => this.createCtx(x, y)), opts)
        .then((sub) => resolve(sub), (err) => reject(err));
    });
  }

  request(subject, timeout = 1000, data = undefined) {
    return new Promise((resolve, reject) => {
      if (!this.nats || (this.nats && this.nats.isClosed()))
        return reject(new Error("Nats client not connected."));

      this.nats.request(subject, timeout, data)
        .then((msg) => resolve(this.createCtx(null, msg)), (err) => reject(err));
    });
  }

  drain() {
    return new Promise((resolve, reject) => {
      if (!this.nats || (this.nats && this.nats.isClosed()))
        return reject(new Error("Nats client not connected."));
      
      this.nats.drain()
        .then((obj) => resolve(obj), (err) => reject(err));
    });
  }

  flush(cb) {
    if (!this.nats || (this.nats && this.nats.isClosed()))
      throw new Error("Nats client not connected.");

    if (cb)
      return this.nats.flush(cb);
    else
      return new Promise((resolve, reject) => {
        this.nats.flush()
          .then(() => resolve(), (err) => reject(err));
      });
  }

  createCtx(err, msg) {
    const context = Object.create(this.context, 
      { err: {value: err, writable: false, enumerable: true},
        msg: {value: msg, writable: false, enumerable: true} });
    context.state = {};
    context.app = this;
    return context;
  }

};
