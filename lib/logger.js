'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @see https://github.com/winstonjs/winston
 * @providesModule logger
 */
var logPath = _path2.default.resolve(__dirname, '..', 'nest.log');
var _process$env = process.env,
    NEST_LOG = _process$env.NEST_LOG,
    NODE_ENV = _process$env.NODE_ENV;
var _winston$transports = _winston2.default.transports,
    Console = _winston$transports.Console,
    File = _winston$transports.File;

/**
 * Logger transports
 */

var transports = [new Console({
  level: 'info',
  colorize: true,
  timestamp: true
})];

if (NEST_LOG === 'true') {
  transports.push(new File({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    filename: logPath
  }));
}

/**
 * Instanciated winston logger instance
 */
var logger = new _winston.Logger({ transports: transports });

logger.debug = function (key) {
  var debugMessage = (0, _debug2.default)(key);

  return function (message, meta) {
    var args = ['debug', key + ': ' + message];

    if (typeof meta !== 'undefined') {
      args.push(meta);
    }
    logger.log.apply(logger, args);
    debugMessage(message);
  };
};

exports.default = logger;