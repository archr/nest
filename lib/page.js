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

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.default = createPage;

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

var _httpErrors = require('http-errors');

var _httpErrors2 = _interopRequireDefault(_httpErrors);

var _lodash = require('lodash');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Creates a new page.
 *
 * @param  {String}  data  The page's content. Can be HTML, JSON, etc.
 * @param  {Object}  meta  Extra properties to add to the page.
 * @return {Object}        A new page instance
 */
function createPage(data, meta) {
  var page = (0, _assign2.default)((0, _create2.default)(pageProto), {
    data: null,
    location: null,
    isJSON: false,
    valid: false,
    html: null,
    phantomPage: null,
    statusCode: null,
    res: null,
    $: null
  });

  page.loadData(data, meta);

  return page;
}

var pageProto = {

  /**
   * Runs the provided function in the page's context;
   *
   * @param  {Function}  func
   *  Function to apply in this page's context.
   *
   * @param  {Boolean}  inPhantomPage
   *  Should func be called from within the PhantomJS page?
   *
   * @return {Mixed}
   *  Returns the value returned from 'func'
   */
  runInContext: function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(func, inPhantomPage) {
      var res;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              (0, _assert2.default)((0, _lodash.isFunction)(func), 'function to run in context is not a function');
              res = void 0;


              if (inPhantomPage && !this.phantomPage) {
                _logger2.default.warn('[Page]: Tried to apply fn to static page');
              }

              _context.prev = 3;

              if (!(inPhantomPage && this.phantomPage)) {
                _context.next = 10;
                break;
              }

              _context.next = 7;
              return this.phantomPage.evaluateAsync(func);

            case 7:
              res = _context.sent;
              _context.next = 13;
              break;

            case 10:
              _context.next = 12;
              return func.call(this, this.isJSON ? this.data : this.$, this);

            case 12:
              res = _context.sent;

            case 13:
              _context.next = 21;
              break;

            case 15:
              _context.prev = 15;
              _context.t0 = _context['catch'](3);

              _logger2.default.error(_context.t0);

              if (!((0, _lodash.isObject)(_context.t0) && !_context.t0.statusCode)) {
                _context.next = 20;
                break;
              }

              throw (0, _httpErrors2.default)(500, _context.t0);

            case 20:
              throw _context.t0;

            case 21:
              return _context.abrupt('return', res);

            case 22:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[3, 15]]);
    }));

    function runInContext(_x, _x2) {
      return _ref.apply(this, arguments);
    }

    return runInContext;
  }(),


  /**
   * Initializes this page with the provided properties
   * @param  {String}  data  The page's content. Can be HTML, JSON, etc.
   * @param  {Object}  meta  Extra properties to add to the page.
   * @return {undefined}
   */
  loadData: function loadData(data) {
    var _this = this;

    var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    (0, _assert2.default)((0, _lodash.isObject)(meta), 'Meta must be an object');

    var url = meta.url,
        statusCode = meta.statusCode,
        res = meta.res,
        phantomPage = meta.phantomPage;


    this.data = data;
    this.location = { href: url };
    this.valid = !!data;
    this.statusCode = statusCode || 200;
    this.res = res || null;
    this.phantomPage = phantomPage || null;

    // checks if the data is JSON
    // if the data is JSON, parses the json in 'page.data'
    // otherwise, load the HTML with cheerio and expose it in 'page.$`
    try {
      this.data = JSON.parse(data);
      this.isJSON = true;
    } catch (err) {
      if (data && (0, _lodash.isString)(data)) {
        this.html = data;
        this.$ = _cheerio2.default.load(data);
      } else {
        _logger2.default.warn('[page]: Data is not valid: ' + (0, _stringify2.default)(data));
        this.valid = false;
      }
    }

    // if a phantom page instance was provided, save the response object
    // once it arrives
    if (phantomPage) {
      phantomPage.property('onResourceReceived', function (res) {
        _this.res = res;
        phantomPage.property('onResourceReceived', null);
      });
    }
  }
};