'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

require('./connection');

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _lodash = require('lodash');

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = _logger2.default.debug('nest:queue'); /* eslint-disable key-spacing, no-multi-spaces, import/imports-first */

var Mixed = _mongoose2.default.Schema.Types.Mixed;

/**
 * Schema
 */
var jobSchema = new _mongoose2.default.Schema({
  routeId: { type: String, required: true },
  query: { type: Mixed },
  priority: { type: Number, default: 50 },
  created: { type: Date, default: Date.now },
  updated: { type: Date },

  stats: {
    pages: { type: Number, default: 0 },
    results: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    spawned: { type: Number, default: 0 }
  },

  state: {
    currentPage: { type: Number, default: 1 },
    finished: { type: Boolean, default: false },
    finishedDate: { type: Date },
    startedDate: { type: Date },
    data: { type: Mixed, default: {} }
  }
}, { collection: 'jobs' });

/**
 * Hooks
 */
jobSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

/**
 * Static Methods
 */
(0, _assign2.default)(jobSchema.statics, {

  /**
   * Creates a new job. If the job already exists, returns the existing job.
   *
   * @param {String}    key   The job's key.
   * @param {Object}    data  The job's data.
   * @returns {Object}        The created (or existing) job.
   */
  createJob: function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(key) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var newJob, job;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              (0, _assert2.default)((0, _lodash.isString)(key), 'Key is not a string');
              (0, _assert2.default)((0, _lodash.isObject)(data), 'Data is not an object');

              newJob = (0, _extends3.default)({ routeId: key }, data);
              _context.next = 5;
              return this.findOne((0, _lodash.pick)(newJob, 'routeId', 'query')).exec();

            case 5:
              job = _context.sent;

              if (job) {
                _context.next = 14;
                break;
              }

              debug('Creating job', newJob);
              _context.next = 10;
              return this.create(newJob);

            case 10:
              job = _context.sent;

              job.wasNew = true;
              _context.next = 15;
              break;

            case 14:
              job.wasNew = false;

            case 15:
              return _context.abrupt('return', job);

            case 16:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function createJob(_x2) {
      return _ref.apply(this, arguments);
    }

    return createJob;
  }()
});

/**
 * Indexes
 */
jobSchema.index({ priority: -1 });
jobSchema.index({ 'state.finished': -1 });
jobSchema.index({ priority: -1, 'state.finished': -1 });

/**
 * @providesModule Queue
 */
exports.default = _mongoose2.default.model('Queue', jobSchema);