'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _lodash = require('lodash');

var _promiseQueue = require('promise-queue');

var _promiseQueue2 = _interopRequireDefault(_promiseQueue);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _events = require('events');

var _engine = require('../config/engine');

var _engine2 = _interopRequireDefault(_engine);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

var _queue = require('./db/queue');

var _queue2 = _interopRequireDefault(_queue);

var _route = require('./route');

var _route2 = _interopRequireDefault(_route);

var _connection = require('./db/connection');

var _connection2 = _interopRequireDefault(_connection);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('nest');

/**
 * Creates a group of workers, and provides a worker loop
 * that will constantly process queue jobs.
 *
 * @class
 */

var Nest = function (_EventEmitter) {
  (0, _inherits3.default)(Nest, _EventEmitter);

  /**
   * Instanciates a new engine.
   * @param  {Object}  modules  Modules to use with this engine
   */
  function Nest() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, Nest);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Nest.__proto__ || (0, _getPrototypeOf2.default)(Nest)).call(this));

    var routes = params.routes,
        workers = params.workers,
        mongo = params.mongo;


    _this.running = false;
    _this.workers = [];
    _this.pq = new _promiseQueue2.default(1, Infinity);
    _this.routes = (0, _lodash.isArray)(routes) ? routes.map(_route2.default) : [];
    _this.connection = (0, _connection2.default)(mongo);
    _this.workersAmount = (0, _lodash.isNumber)(workers) ? workers : _engine2.default.workers;
    return _this;
  }

  /**
   * Spawns workers, assign jobs to workers, and start each worker's loop.
   * @return {Promise}  Resolved when all the workers are assigned a job.
   */


  (0, _createClass3.default)(Nest, [{
    key: 'start',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
        var workerStartPromises;
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

                // creates new workers, link the workers' emitters to the engine's emitter
                this.assignWorkers();

                debug('Created ' + this.workers.length + ' workers');

                this.running = true;

                workerStartPromises = this.workers.map(function (worker) {
                  return worker.start();
                });
                _context.next = 8;
                return _promise2.default.all(workerStartPromises);

              case 8:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function start() {
        return _ref.apply(this, arguments);
      }

      return start;
    }()

    /**
     * Stops the workers.
     * @return {Promise}  Resolved when all the workers are stopped.
     */

  }, {
    key: 'stop',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (this.running) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                _context2.next = 4;
                return _promise2.default.all(this.workers.map(function (worker) {
                  return worker.stop();
                }));

              case 4:

                this.running = false;
                this.workers.length = 0;

              case 6:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function stop() {
        return _ref2.apply(this, arguments);
      }

      return stop;
    }()

    /**
     * Creates a new job. If the job already exists, returns the existing job.
     *
     * @param {String}    key   The job's route ID.
     * @param {Object}    data  The job's data.
     * @returns {Object}        The created (or existing) job.
     */

  }, {
    key: 'queue',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(key) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var route;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                route = this.getRoute(key);

                (0, _assert2.default)(route, 'Route ' + key + ' does not exist');
                (0, _assert2.default)((0, _lodash.isObject)(params), 'Params is not an object');

                _context3.next = 5;
                return _queue2.default.createJob(key, {
                  query: params.query,
                  priority: params.priority || route.priority
                });

              case 5:
                return _context3.abrupt('return', _context3.sent);

              case 6:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function queue(_x3) {
        return _ref3.apply(this, arguments);
      }

      return queue;
    }()
  }, {
    key: 'addRoute',
    value: function addRoute(route) {
      (0, _assert2.default)((0, _lodash.isObject)(route), 'Route must be an object');
      (0, _assert2.default)(route.key, 'Route must have a key');
      (0, _assert2.default)(!this.getRoute(route.key), route.key + ' was already added');

      this.routes.push((0, _route2.default)(route));
    }

    /**
     * Gets a route definition by route key.
     *
     * @param  {String}  key  The route's key
     * @return {Object}       The route's definition
     */

  }, {
    key: 'getRoute',
    value: function getRoute(key) {
      return (0, _lodash.find)(this.routes, { key: key });
    }
  }, {
    key: 'assignWorkers',
    value: function assignWorkers() {
      var _this2 = this;

      (0, _lodash.times)(this.workersAmount, function () {
        var worker = (0, _worker2.default)(_this2);
        worker.addEmitter(_this2);
        _this2.workers.push(worker);
      });
    }

    /**
     * Queries for a new job, and assigns the job to the worker.
     * @param  {Object}  worker  Worker to assign the job to
     * @return {Object}          Fetched Job instance.
     */

  }, {
    key: 'assignJob',
    value: function assignJob(worker) {
      var _this3 = this;

      return this.pq.add((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
        var query, workerQuery, job, routeKey, _query, route;

        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                debug('Queue access');
                debug('Assigning job to worker ' + worker.id);

                query = _this3.getBaseJobQuery();


                if (worker.key) {
                  query.worker = worker.key;
                }

                // extend the query with this worker's getJobQuery method
                if ((0, _lodash.isFunction)(worker.getJobQuery)) {
                  debug('Getting worker custom job query');

                  try {
                    workerQuery = worker.getJobQuery() || {};


                    (0, _assert2.default)((0, _lodash.isObject)(workerQuery), 'Invalid value returned from getJobQuery() (' + worker.key + ')');

                    (0, _assert2.default)(!(0, _lodash.isFunction)(workerQuery.then), 'Promises are not supported in worker\'s job query');

                    if ((0, _lodash.isObject)(workerQuery)) {
                      (0, _assign2.default)(query, workerQuery);
                    }
                  } catch (err) {
                    _logger2.default.error(err);
                  }
                }

                debug('Getting next job.\nQuery:', query);

                _context4.next = 8;
                return _queue2.default.findOne(query).sort({ priority: -1 }).exec();

              case 8:
                job = _context4.sent;


                if (job) {
                  routeKey = job.routeId;
                  _query = job.query;
                  route = _this3.getRoute(routeKey);


                  debug('Got job: ' + routeKey + '. Query: ' + _query);

                  worker.job = job;
                  worker.route = route;
                } else {
                  debug('No jobs');
                }

                return _context4.abrupt('return', job);

              case 11:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this3);
      })));
    }

    /**
     * Gets the base query to be used to fetch a new job from the queue
     *
     * @return {Object}  Query
     */

  }, {
    key: 'getBaseJobQuery',
    value: function getBaseJobQuery() {
      var disabledRouteIds = this.disabledRouteIds,
          runningJobIds = this.runningJobIds;


      if ((0, _lodash.isArray)(_engine2.default.disabledRoutes)) {
        var globallyDisabledRoutes = _engine2.default.disabledRoutes;
        Array.prototype.push.apply(disabledRouteIds, globallyDisabledRoutes);
      }

      var query = {
        'state.finished': false
      };

      if (runningJobIds.length) {
        if (runningJobIds.length === 1) {
          query._id = { $ne: runningJobIds[0] };
        } else {
          query._id = { $nin: runningJobIds };
        }
      }

      if (disabledRouteIds.length) {
        if (disabledRouteIds.length === 1) {
          query.routeId = { $ne: disabledRouteIds[0] };
        } else {
          query.routeId = { $nin: disabledRouteIds };
        }
      }

      return query;
    }

    /**
     * Gets the disabled routes.
     * A route may be disabled if the route's concurrency treshold has been met.
     * @return {Array}  Array of disabled route IDs.
     */

  }, {
    key: 'disabledRouteIds',
    get: function get() {
      var disabledRoutes = [];
      var runningRoutes = {};

      // disables routes if the concurrency treshold is met
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(this.workers), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var worker = _step.value;

          if (!worker.route) continue;
          var _worker$route = worker.route,
              concurrency = _worker$route.concurrency,
              routeId = _worker$route.key;


          runningRoutes[routeId] = runningRoutes[routeId] || 0;
          runningRoutes[routeId]++;

          if (runningRoutes[routeId] === concurrency) {
            disabledRoutes.push(routeId);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      debug('Getting disabled route IDs:', disabledRoutes);

      return disabledRoutes;
    }

    /**
     * Gets the running worker's job IDs.
     *
     * @return {Array}  Job IDs currently in progress
     */

  }, {
    key: 'runningJobIds',
    get: function get() {
      return this.workers.reduce(function (ids, worker) {
        if (worker.job) {
          ids.push(worker.job._id.toString());
        }

        return ids;
      }, []);
    }
  }]);
  return Nest;
}(_events.EventEmitter);

exports.default = Nest;