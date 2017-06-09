'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

exports.default = createRoute;

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _lodash = require('lodash');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = _logger2.default.debug('nest:route');

/**
 * Initializes a new route handler.
 * @param  {Object}  route  Route definition object
 * @return {Object}         Initialized route instance
 */
function createRoute(route) {
  var _this = this;

  (0, _assert2.default)(route.key, 'Key is required.');

  if (route.initialized) {
    return route;
  }

  debug('Creating new route handler', route);

  return {
    initialized: true,

    key: route.key,
    url: route.url,
    name: route.name || '',
    description: route.description || '',

    // template generation function. Takes a job for input
    getUrl: (0, _lodash.isFunction)(route.url) ? route.url : (0, _lodash.isString)(route.url) ? (0, _lodash.template)(route.url) : function () {
      throw new Error('You need to implement your own URL generator.');
    },

    // scraping function that should return an object with scraped data
    scraper: route.scraper ? route.scraper : function () {
      throw new Error('You need to implement your own scraper.');
    },

    // scraping function that can return a status code or throw an error
    checkStatus: route.checkStatus ? route.checkStatus : function () {
      return 'ok';
    },

    // function to be called when the route returns an error code >= 400
    // if an job is returned, the spider will be redirected to this job
    // if a truthy value is returned, the spider will retry this route
    onError: route.onError ? route.onError : (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt('return', true);

            case 1:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    })),

    // auto-testing options
    test: route.test || null,

    // limit the amount of workers that can work on this route at the same time
    concurrency: route.concurrency || -1,

    // adds a delay to page transitions
    transitionDelay: route.transitionDelay || 0,

    // how many times to retry fetching a route on 4xx errors
    retryCount: route.retryCount,

    // routes with higher priority will be processed first by the workers
    priority: isNaN(route.priority) ? 50 : parseInt(route.priority, 10),

    // use phantom
    dynamic: route.dynamic,

    // empty request
    fake: route.fake
  };
}