'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = createWorker;

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _lodash = require('lodash');

var _events = require('events');

var _spider = require('./spider');

var _emitter = require('./emitter');

var _queue = require('./db/queue');

var _queue2 = _interopRequireDefault(_queue);

var _item = require('./db/item');

var _item2 = _interopRequireDefault(_item);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = _logger2.default.debug('nest:worker');
var emitterProto = _events.EventEmitter.prototype;
var sleep = function sleep(ms) {
  return new _promise2.default(function (r) {
    return setTimeout(r, ms);
  });
};
var timeout = function timeout(_timeout, promise) {
  return _promise2.default.race([promise, new _promise2.default(function (resolve, reject) {
    setTimeout(function () {
      return reject(new Error('Timeout'));
    }, _timeout);
  })]);
};
var assign = _assign2.default,
    create = _create2.default;

/**
 * Creates a new worker instance.
 *
 * @param  {Object}  engine     The engine this worker is part of
 * @param  {Object}  blueprint  Augmented properties to be assigned to the worker
 * @return {Object}             A worker instance
 */

function createWorker(engine) {
  (0, _assert2.default)((0, _lodash.isObject)(engine), 'Engine is not an object');

  // constructs a new worker
  var worker = assign(create(workerProto), emitterProto, _emitter.chainableEmitterProto, {
    id: _shortid2.default.generate(),
    emitters: new _set2.default(),
    running: false,
    spider: null,
    route: null,
    job: null,
    meta: {},
    engine: engine
  });

  _events.EventEmitter.call(worker);

  debug('Worker ' + worker.id + ' created');

  return worker;
}

var workerProto = {
  /**
   * Start this worker.
   *
   * @return {Promise}
   *  Promise to be resolved when this worker is assigned its first job
   */
  start: function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
      var _this = this;

      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!this.running) {
                _context.next = 2;
                break;
              }

              return _context.abrupt('return');

            case 2:
              if (!this.initialize) {
                _context.next = 12;
                break;
              }

              _context.prev = 3;
              _context.next = 6;
              return this.initialize();

            case 6:
              _context.next = 12;
              break;

            case 8:
              _context.prev = 8;
              _context.t0 = _context['catch'](3);

              _logger2.default.error(_context.t0);
              throw _context.t0;

            case 12:

              this.running = true;

              _context.next = 15;
              return new _promise2.default(function (resolve) {
                _this.once('job:assigned', function (job, worker) {
                  if (worker === _this) {
                    debug('Worker ' + _this.id + ' started');
                    resolve();
                  }
                });

                _this.startLoop();
              });

            case 15:
              return _context.abrupt('return', _context.sent);

            case 16:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[3, 8]]);
    }));

    function start() {
      return _ref.apply(this, arguments);
    }

    return start;
  }(),


  /**
   * Starts the worker loop.
   * @return {Promise}  Promise to be resolved when the worker loop ends
   */
  startLoop: function () {
    var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
      var job;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              (0, _assert2.default)(this.running, 'Worker must be running to start the worker loop');

            case 1:
              if (!this.running) {
                _context2.next = 52;
                break;
              }

              job = void 0;

              // get the next job

              _context2.prev = 3;
              _context2.next = 6;
              return this.engine.assignJob(this);

            case 6:
              job = _context2.sent;

              this.emit('job:assigned', job, this);
              _context2.next = 15;
              break;

            case 10:
              _context2.prev = 10;
              _context2.t0 = _context2['catch'](3);

              _logger2.default.error(_context2.t0);
              this.stop();
              return _context2.abrupt('continue', 1);

            case 15:
              if (this.running) {
                _context2.next = 17;
                break;
              }

              return _context2.abrupt('continue', 1);

            case 17:
              if (job) {
                _context2.next = 23;
                break;
              }

              this.emit('job:noop', this);
              debug('There are no pending jobs. Retrying in 1s');
              _context2.next = 22;
              return sleep(1000);

            case 22:
              return _context2.abrupt('continue', 1);

            case 23:
              _context2.prev = 23;

              this.emit('job:start', job, this);
              _context2.next = 27;
              return timeout(60000 * 5, this.startJob(job));

            case 27:
              job = _context2.sent;


              (0, _assert2.default)((0, _lodash.isObject)(job) && (0, _lodash.isObject)(job.stats), 'New job state is not valid');
              _context2.next = 35;
              break;

            case 31:
              _context2.prev = 31;
              _context2.t1 = _context2['catch'](23);

              if ((0, _lodash.isObject)(_context2.t1)) {
                if (_context2.t1.statusCode) {
                  debug('Got ' + _context2.t1.statusCode + '. Continuing...');
                } else {
                  _logger2.default.error(_context2.t1);
                }
              }
              return _context2.abrupt('continue', 1);

            case 35:

              debug('Job finished: ' + job.routeId + '. ' + (job.stats.items + ' items created. ') + (job.stats.updated + ' items updated. ') + (job.stats.spawned + ' jobs created.'));

              // check if should reinitialize
              _context2.prev = 36;

              if (!job.shouldReinitialize) {
                _context2.next = 41;
                break;
              }

              debug('Worker reinitializing');
              _context2.next = 41;
              return this.initialize();

            case 41:
              _context2.next = 48;
              break;

            case 43:
              _context2.prev = 43;
              _context2.t2 = _context2['catch'](36);

              _logger2.default.error(_context2.t2);
              this.stop();
              return _context2.abrupt('continue', 1);

            case 48:

              this.job = null;
              this.route = null;
              _context2.next = 1;
              break;

            case 52:

              this.emit('worker:stopped', this);

            case 53:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this, [[3, 10], [23, 31], [36, 43]]);
    }));

    function startLoop() {
      return _ref2.apply(this, arguments);
    }

    return startLoop;
  }(),


  /**
   * Runs a job.
   *
   * @param  {Object}  job  Job instance
   * @return {Promise}          Updated job
   */
  startJob: function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(job) {
      var state, routeId, query, routes, route, msg, scraped, url, newOps, results;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              (0, _assert2.default)((0, _lodash.isObject)(job), 'Job is not valid');
              (0, _assert2.default)(this.running, 'Worker is not running');

              state = job.state, routeId = job.routeId, query = job.query;
              routes = this.engine.routes;
              route = (0, _lodash.find)(routes, { key: routeId });

              if (!state.finished) {
                _context3.next = 8;
                break;
              }

              debug('Job was already finished');
              return _context3.abrupt('return', job);

            case 8:

              // save the starting time of this job
              if (job.wasNew) {
                state.startedDate = Date.now();
              }

              msg = 'Starting job: ' + routeId + ' ' + (0, _stringify2.default)({ query: query });

              if (state.currentPage > 2) msg += ' (page ' + state.currentPage + ')';
              debug(msg);

              scraped = void 0;

              if (!(0, _lodash.isFunction)(this.process)) {
                _context3.next = 20;
                break;
              }

              _context3.next = 16;
              return this.process(job, route);

            case 16:
              scraped = _context3.sent;

              scraped = _spider.spiderProto.sanitizeScraped(scraped);
              _context3.next = 25;
              break;

            case 20:
              // else, scrape this route using a spider
              url = route.getUrl(job);

              this.spider = (0, _spider.createSpider)();
              _context3.next = 24;
              return this.spider.scrape(url, route);

            case 24:
              scraped = _context3.sent;

            case 25:
              if (this.running) {
                _context3.next = 27;
                break;
              }

              return _context3.abrupt('return', job);

            case 27:
              _context3.next = 29;
              return this.spawnJobs(scraped.jobs, routes);

            case 29:
              newOps = _context3.sent;


              if (newOps.length) {
                this.emit('jobs:created', newOps);
                job.stats.spawned += newOps.length;
              }

              // save and update items
              _context3.next = 33;
              return _item2.default.eachUpsert(scraped.items);

            case 33:
              results = _context3.sent;

              results.jobsCreated = newOps.length;

              // change state
              if (scraped.hasNextPage) {
                state.currentPage++;
              } else {
                state.finished = true;
                state.finishedDate = Date.now();
              }

              if (scraped.state) {
                state.data = assign(state.data || {}, scraped.state);
              }

              job.stats.pages++;
              job.stats.items += results.created;
              job.stats.updated += results.updated;
              job.updated = new Date();

              this.iteration++;
              this.emit('scraped:page', results, job);

              debug('Saving job');
              _context3.next = 46;
              return job.save();

            case 46:
              if (!route.transitionDelay) {
                _context3.next = 50;
                break;
              }

              debug('Sleeping for ' + route.transitionDelay + 'ms');
              _context3.next = 50;
              return sleep(route.transitionDelay);

            case 50:
              if (!(state.finished || !this.running)) {
                _context3.next = 52;
                break;
              }

              return _context3.abrupt('return', job);

            case 52:

              // Job has next page
              debug('Scraping next page');
              this.emit('job:next', job);

              _context3.next = 56;
              return this.startJob(job);

            case 56:
              return _context3.abrupt('return', _context3.sent);

            case 57:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function startJob(_x) {
      return _ref3.apply(this, arguments);
    }

    return startJob;
  }(),


  /**
   * Creates new scraping jobs.
   *
   * @param  {Array}  jobs  Jobs to create
   * @return {Promise}      Array with spawned jobs
   */
  spawnJobs: function () {
    var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(jobs) {
      var routes, newJobs;
      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              routes = this.engine.routes;

              if (!(jobs.length === 0)) {
                _context4.next = 4;
                break;
              }

              debug('No jobs to spawn');
              return _context4.abrupt('return', []);

            case 4:

              debug('Spawning jobs');

              _context4.next = 7;
              return _promise2.default.all(jobs.map(function (op) {
                var routeId = op.routeId,
                    query = op.query;

                var targetRoute = (0, _lodash.find)(routes, { key: routeId });

                if (!targetRoute) {
                  _logger2.default.warn('[spawnJobs]: Route ' + routeId + ' does not exist');
                  return _promise2.default.resolve();
                }

                // Create a new job
                return _queue2.default.createJob(targetRoute.key, {
                  priority: targetRoute.priority,
                  query: query
                });
              }));

            case 7:
              newJobs = _context4.sent;


              debug('Jobs spawned: ' + newJobs.length + ' jobs');

              return _context4.abrupt('return', newJobs);

            case 10:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    function spawnJobs(_x2) {
      return _ref4.apply(this, arguments);
    }

    return spawnJobs;
  }(),


  /**
   * Stops this worker and its spider, if any.
   * @return {Promise}  Promise to be resolved when this worker is stopped
   */
  stop: function () {
    var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
      var _this2 = this;

      return _regenerator2.default.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (this.running) {
                _context5.next = 2;
                break;
              }

              return _context5.abrupt('return');

            case 2:

              this.running = false;

              if (this.spider) {
                this.spider.stop();
                this.spider = null;
              }

              debug('Stopping worker.');

              _context5.next = 7;
              return new _promise2.default(function (resolve) {
                _this2.once('worker:stopped', function () {
                  debug('Worker stopped.');
                  resolve();
                });
              });

            case 7:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function stop() {
      return _ref5.apply(this, arguments);
    }

    return stop;
  }()
};