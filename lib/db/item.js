'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

require('./connection');

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = _logger2.default.debug('nest:item');

/**
 * Schema
 */
/* eslint-disable import/imports-first, array-callback-return */
var itemSchema = new _mongoose2.default.Schema({
  name: {
    type: String,
    trim: true
  },

  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  type: {
    type: String,
    default: 'content'
  },

  link: {
    type: String
  },

  routeId: {
    type: String,
    required: true
  },

  routeWeight: {
    type: Number,
    default: 50
  },

  created: {
    type: Date,
    default: Date.now
  },

  updated: {
    type: Date,
    default: Date.now
  }
}, { strict: false });

/**
 * Static Methods
 */
(0, _assign2.default)(itemSchema.statics, {

  /**
   * Applies `Item.upsert` to `items` in parallel.
   * @param  {Array}  items  Items to upsert.
   * @return {Object}        Object with operation stats.
   */
  eachUpsert: function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(items) {
      var _this = this;

      var Item, stats, promises;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              Item = this;
              stats = {
                created: 0,
                updated: 0,
                ignored: 0
              };
              promises = items.map(function () {
                var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(item) {
                  var op;
                  return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return Item.upsert(item);

                        case 2:
                          op = _context.sent;

                          stats[op]++;

                        case 4:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _callee, _this);
                }));

                return function (_x2) {
                  return _ref2.apply(this, arguments);
                };
              }());
              _context2.next = 5;
              return _promise2.default.all(promises);

            case 5:
              return _context2.abrupt('return', stats);

            case 6:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function eachUpsert(_x) {
      return _ref.apply(this, arguments);
    }

    return eachUpsert;
  }(),


  /**
   * Creates or updates a scraped item in the database.
   * @param  {Object}  item  The item to be upserted.
   * @return {String}        Operation type. Either 'created' or 'updated'.
   */
  upsert: function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(item) {
      var Item, existItem;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              debug('Upsert: Finding Item ' + item.key);

              Item = this;
              _context3.next = 4;
              return Item.findOne({ key: item.key });

            case 4:
              existItem = _context3.sent;

              if (!existItem) {
                _context3.next = 11;
                break;
              }

              item.updated = new Date();
              _context3.next = 9;
              return this.update({ key: item.key }, { $set: item }).exec();

            case 9:

              debug('\'Updated item:\' ' + item.key);
              return _context3.abrupt('return', 'updated');

            case 11:
              _context3.next = 13;
              return Item.create(item);

            case 13:

              debug('Created item: ' + item.key);
              return _context3.abrupt('return', 'created');

            case 15:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function upsert(_x3) {
      return _ref3.apply(this, arguments);
    }

    return upsert;
  }()
});

/**
 * Indexes
 */
itemSchema.index({ name: -1 });
itemSchema.index({ provider: -1 });
itemSchema.index({ 'providers.route': -1 });

/**
 * Hooks
 */
itemSchema.pre('save', function (next) {
  this.updated = new Date();
  next();
});

/**
 * @providesModule Item
 */
exports.default = _mongoose2.default.model('Item', itemSchema);