'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spiderProto = exports.createSpider = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _lodash = require('lodash');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _phantom = require('phantom');

var _phantom2 = _interopRequireDefault(_phantom);

var _httpErrors = require('http-errors');

var _httpErrors2 = _interopRequireDefault(_httpErrors);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _phantom3 = require('../config/phantom');

var _phantom4 = _interopRequireDefault(_phantom3);

var _page = require('./page');

var _page2 = _interopRequireDefault(_page);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _queue = require('./db/queue');

var _queue2 = _interopRequireDefault(_queue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = _logger2.default.debug('nest:spider');
var FORCE_DYNAMIC = process.env.FORCE_DYNAMIC;

var sleep = function sleep(ms) {
  return new _promise2.default(function (r) {
    return setTimeout(r, ms);
  });
};
var MAX_RETRY_COUNT = 3;

/**
 * Creates or initializes a spider instance
 * @param  {Object}  spider  Base spider instance
 * @return {Object}          Instanciated spider instance
 */
var createSpider = exports.createSpider = function createSpider() {
  return (0, _assign2.default)((0, _create2.default)(spiderProto), {
    running: true,
    phantom: null,
    Queue: _queue2.default
  });
};

var spiderProto = exports.spiderProto = {

  /**
   * Requests a url with request or PhantomJS, if 'dynamic' is true
   * @param  {String}  url      The URL to open
   * @param  {Object}  options  Optional parameters
   * @return {Object}           A Page instance
   */
  open: function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(url) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var isDynamic, getPage;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              (0, _assert2.default)((0, _lodash.isObject)(options), 'Options needs to be an object');

              this.url = url;

              isDynamic = options.dynamic || FORCE_DYNAMIC;
              getPage = isDynamic ? this.openDynamic : this.openStatic;
              _context.next = 6;
              return getPage.call(this, url);

            case 6:
              return _context.abrupt('return', _context.sent);

            case 7:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function open(_x2) {
      return _ref.apply(this, arguments);
    }

    return open;
  }(),


  /**
   * Requests a url with request
   * @param  {String}  url  The URL to request
   * @return {Object}       A Page instance
   */
  openStatic: function () {
    var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(url) {
      var res, statusCode, body, page;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              debug('Opening URL ' + url);

              _context2.next = 3;
              return (0, _requestPromise2.default)(url, {
                resolveWithFullResponse: true
              });

            case 3:
              res = _context2.sent;
              statusCode = res.statusCode, body = res.body;
              page = (0, _page2.default)(body, { url: url, statusCode: statusCode, res: res });
              return _context2.abrupt('return', page);

            case 7:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function openStatic(_x3) {
      return _ref2.apply(this, arguments);
    }

    return openStatic;
  }(),


  /**
   * Requests a url with PhantomJS
   * @param  {String}  url  The URL to request
   * @return {Object}       A Page instance
   */
  openDynamic: function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(url) {
      var ph, phantomPage, pageOpenStatus, statusCode, jsInjectionStatus, html, page;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              debug('Opening URL ' + url + ' with PhantomJS');

              _context3.t0 = this.phantom;

              if (_context3.t0) {
                _context3.next = 6;
                break;
              }

              _context3.next = 5;
              return this.createPhantom();

            case 5:
              _context3.t0 = _context3.sent;

            case 6:
              ph = _context3.t0;
              _context3.next = 9;
              return ph.createPage();

            case 9:
              phantomPage = _context3.sent;
              _context3.next = 12;
              return phantomPage.open(url);

            case 12:
              pageOpenStatus = _context3.sent;


              // Phantom js does not tells you what went wrong when it fails :/
              // Return a page with status code 5000
              statusCode = 200;

              if (pageOpenStatus !== 'success') {
                statusCode = 500;
              }

              _context3.next = 17;
              return this.injectJS(phantomPage);

            case 17:
              jsInjectionStatus = _context3.sent;

              (0, _assert2.default)(jsInjectionStatus, 'Could not inject JS on url: ' + url);

              _context3.next = 21;
              return phantomPage.property('content');

            case 21:
              html = _context3.sent;
              page = (0, _page2.default)(html, { url: url, phantomPage: phantomPage, statusCode: statusCode });
              return _context3.abrupt('return', page);

            case 24:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function openDynamic(_x4) {
      return _ref3.apply(this, arguments);
    }

    return openDynamic;
  }(),


  /**
   * Creates a PhantomJS instance
   * @return {Object}  PhantomJS instance
   */
  createPhantom: function () {
    var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              debug('Creating PhantomJS instance');
              _context4.next = 3;
              return _phantom2.default.create(_phantom4.default);

            case 3:
              this.phantom = _context4.sent;
              return _context4.abrupt('return', this.phantom);

            case 5:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    function createPhantom() {
      return _ref4.apply(this, arguments);
    }

    return createPhantom;
  }(),


  /**
   * Stops own phantomjs instance
   * @return {undefined}
   */
  stopPhantom: function stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  },


  /**
   * Injects javascript <script> tags in opened web page
   * @param  {Object}  page  Page instance to inject the JS
   * @return {[type]}      [description]
   */
  injectJS: function () {
    var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(page) {
      var jqueryUrl;
      return _regenerator2.default.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              debug('Injecting JS on page');
              jqueryUrl = 'https://code.jquery.com/jquery-2.1.4.min.js';
              _context5.next = 4;
              return page.includeJs(jqueryUrl);

            case 4:
              return _context5.abrupt('return', _context5.sent);

            case 5:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function injectJS(_x5) {
      return _ref5.apply(this, arguments);
    }

    return injectJS;
  }(),


  /**
   * Stops the spider, optionally clearing the listeners.
   *
   * @param  {Boolean}  removeListeners  Should its event listeners be removed?
   * @return {undefined}
   */
  stop: function stop(removeListeners) {
    debug('Stopping Spider');

    this.running = false;
    this.stopPhantom();

    if (removeListeners) {
      this.removeAllListeners();
    }
  },


  /**
   * Scrapes a web page using a route handler definition.
   *
   * @param  {String}  url    URL to scrape
   * @param  {Object}  route  Route definition, holding the scraper func
   * @param  {Object}  meta   Meta information
   * @return {Object}         Scraped data.
   */
  scrape: function () {
    var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(url, route) {
      var meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var page, status, nextStep, retryCount, err, newUrl, scraped, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item;

      return _regenerator2.default.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              (0, _assert2.default)((0, _lodash.isString)(url), 'Url is not a string');
              (0, _assert2.default)((0, _lodash.isObject)(route), 'Route is not an object');
              (0, _assert2.default)((0, _lodash.isFunction)(route.scraper), 'Route scraper is not a function');
              (0, _assert2.default)((0, _lodash.isObject)(meta), 'Meta is invalid');

              page = void 0;
              status = void 0;

              // open the page

              _context6.prev = 6;
              _context6.next = 9;
              return this.open(url, { dynamic: route.dynamic });

            case 9:
              page = _context6.sent;

              if (!(0, _lodash.isFunction)(route.checkStatus)) {
                _context6.next = 14;
                break;
              }

              _context6.next = 13;
              return page.runInContext(route.checkStatus);

            case 13:
              status = _context6.sent;

            case 14:

              status = !isNaN(status) ? parseInt(status, 10) : page.status || 200;

              _context6.next = 24;
              break;

            case 17:
              _context6.prev = 17;
              _context6.t0 = _context6['catch'](6);

              if (!((0, _lodash.isObject)(_context6.t0) && !isNaN(_context6.t0.statusCode))) {
                _context6.next = 23;
                break;
              }

              status = parseInt(_context6.t0.statusCode, 10);
              _context6.next = 24;
              break;

            case 23:
              throw _context6.t0;

            case 24:
              if (this.running) {
                _context6.next = 26;
                break;
              }

              return _context6.abrupt('return', null);

            case 26:

              debug('Got status ' + status);

              // run the route's error handler for 4xx routes

              if (!(status >= 400)) {
                _context6.next = 62;
                break;
              }

              nextStep = 'stop';


              meta.errorCount = meta.errorCount || 0;
              meta.errorCount++;

              _context6.prev = 31;

              if (!(0, _lodash.isFunction)(route.onError)) {
                _context6.next = 36;
                break;
              }

              _context6.next = 35;
              return route.onError.call(this, route, meta);

            case 35:
              nextStep = _context6.sent;

            case 36:

              if (!(0, _lodash.isFunction)(route.onError) || (0, _lodash.isBoolean)(nextStep) && nextStep) {
                retryCount = route.retryCount || MAX_RETRY_COUNT;

                nextStep = meta.errorCount <= retryCount ? 'retry' : 'stop';
              }
              _context6.next = 42;
              break;

            case 39:
              _context6.prev = 39;
              _context6.t1 = _context6['catch'](31);

              _logger2.default.error(_context6.t1);

            case 42:

              (0, _assert2.default)((0, _lodash.isString)(nextStep), 'Next step is not a string');

              this.stopPhantom();

              _context6.t2 = nextStep;
              _context6.next = _context6.t2 === 'stop' ? 47 : _context6.t2 === 'retry' ? 51 : 57;
              break;

            case 47:
              err = (0, _httpErrors2.default)(status);

              this.running = false;
              debug('Request blocked with status code: ' + status + ' (' + err.message + ')');
              throw (0, _httpErrors2.default)(status);

            case 51:
              debug('Retrying url ' + url + ' (Retry count ' + meta.errorCount + ')');
              _context6.next = 54;
              return sleep(3500);

            case 54:
              _context6.next = 56;
              return this.scrape(url, route, meta);

            case 56:
              return _context6.abrupt('return', _context6.sent);

            case 57:
              newUrl = nextStep;

              debug('Jumping to ' + newUrl + ' with', route, meta);
              _context6.next = 61;
              return this.scrape(newUrl, route, meta);

            case 61:
              return _context6.abrupt('return', _context6.sent);

            case 62:
              _context6.next = 64;
              return page.runInContext(route.scraper);

            case 64:
              scraped = _context6.sent;


              scraped = this.sanitizeScraped(scraped);
              scraped.page = page;

              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context6.prev = 70;
              for (_iterator = (0, _getIterator3.default)(scraped.items); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                item = _step.value;

                if (route.key) {
                  item.routeId = route.key;
                }
                if (route.priority) {
                  item.routeWeight = route.priority;
                }
              }

              _context6.next = 78;
              break;

            case 74:
              _context6.prev = 74;
              _context6.t3 = _context6['catch'](70);
              _didIteratorError = true;
              _iteratorError = _context6.t3;

            case 78:
              _context6.prev = 78;
              _context6.prev = 79;

              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }

            case 81:
              _context6.prev = 81;

              if (!_didIteratorError) {
                _context6.next = 84;
                break;
              }

              throw _iteratorError;

            case 84:
              return _context6.finish(81);

            case 85:
              return _context6.finish(78);

            case 86:
              debug('Scraped ' + scraped.items.length + ' items');

              this.stopPhantom();

              return _context6.abrupt('return', scraped);

            case 89:
            case 'end':
              return _context6.stop();
          }
        }
      }, _callee6, this, [[6, 17], [31, 39], [70, 74, 78, 86], [79,, 81, 85]]);
    }));

    function scrape(_x7, _x8) {
      return _ref6.apply(this, arguments);
    }

    return scrape;
  }(),


  /**
   * Normalizes and sanitizes scraped data
   * @param  {Object}  scraped  The scraped data
   * @return {Object}           Sanitized data
   */
  sanitizeScraped: function sanitizeScraped(scraped) {
    var sanitized = (0, _lodash.isObject)(scraped) ? (0, _assign2.default)({}, scraped) : {};

    debug('Sanitizing scraped');

    // set up defaults
    (0, _lodash.defaults)(sanitized, {
      hasNextPage: false,
      items: [],
      jobs: []
    });

    // validate scraped.items and scraped.jobs type
    var _arr = ['items', 'jobs'];
    for (var _i = 0; _i < _arr.length; _i++) {
      var field = _arr[_i];
      (0, _assert2.default)(sanitized[field] instanceof Array, 'Scraping function returned data.' + field + ', ' + 'but its not an array.');
    }

    // sanitize the jobs
    sanitized.jobs = sanitized.jobs.reduce(function (memo, op) {
      if (op.routeId) memo.push(op);
      return memo;
    }, []);

    // sanitize the items
    sanitized.items = sanitized.items.map(function (item) {

      // remove empty properties
      item = (0, _lodash.pickBy)(item, _lodash.identity);

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = (0, _getIterator3.default)((0, _keys2.default)(item)), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var key = _step2.value;

          if (typeof item[key] === 'string') {
            item[key] = item[key].trim();
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return item;
    });

    return sanitized;
  }
};