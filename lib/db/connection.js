'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.default = createMongoConnection;

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_mongoose2.default.Promise = global.Promise;

var isTest = process.env.NODE_ENV === 'test';

var defaultConfig = {
  db: isTest ? 'nest_test' : 'nest',
  host: '127.0.0.1',
  port: '27017',
  user: null,
  pass: null,
  replicaSet: null
};

var connection = void 0;

/**
 * Creates a connection to the Mongo database. If a connection was
 * previously made, the same mongo connection will be returned.
 * @exports {Object} Mongo connection
 */
function createMongoConnection() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (connection) return connection;

  config = (0, _assign2.default)({}, defaultConfig, config);

  var _config = config,
      db = _config.db,
      host = _config.host,
      port = _config.port,
      user = _config.user,
      pass = _config.pass,
      replicaSet = _config.replicaSet;

  // Connect mongo to a replica set, if available

  if (replicaSet) {
    _mongoose2.default.connect(replicaSet.uri, replicaSet.options, function (err) {
      if (err) {
        console.error(err.stack);
        process.exit(1);
      }
    });
  } else {
    // Or, connect mongo to a standalone instance
    var authString = user ? user + ':' + pass + '@' : '';
    _mongoose2.default.connect('mongodb://' + authString + host + ':' + port + '/' + db);
  }

  connection = _mongoose2.default.connection;
  connection.on('error', _logger2.default.error.bind(_logger2.default));

  return connection;
}