'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.chainableEmitterProto = undefined;

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

exports.createChainableEmitter = createChainableEmitter;

var _events = require('events');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('emitter');

/**
 * Creates a new emitter instance, or initializes an existing emitter
 * @param  {Object}  emitter  Base emitter instance. Optional.
 * @return {Object}           Initialized emitter instance.
 */
function createChainableEmitter(emitter) {
  emitter = emitter || (0, _create2.default)(chainableEmitterProto);

  emitter = (0, _assign2.default)(emitter, _events.EventEmitter.prototype, {
    emitters: new _set2.default(),
    emit: chainableEmitterProto.emit
  });

  _events.EventEmitter.call(emitter);

  return emitter;
}

/**
 * Event Emitter with chainable emitters support.
 */
var chainableEmitterProto = exports.chainableEmitterProto = {

  /**
   * Adds an external EventEmitter
   * @param {Object}  emitter  Event emitter to add
   */
  addEmitter: function addEmitter(emitter) {
    this.emitters.add(emitter);
  },


  /**
   * Removes an EventEmitter
   * @param  {Object}  emitter  Emitter to remove
   */
  removeEmitter: function removeEmitter(emitter) {
    this.emitters.delete(emitter);
  },


  /**
   * Emits an event through self and attached emitters.
   * @override EventEmitter.prototype.emit
   */
  emit: function emit() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    // emit the event through own emitter
    _events.EventEmitter.prototype.emit.apply(this, args);

    debug('Emitting', args);

    // emit the event through all the attached emitters
    this.emitters.forEach(function (emitter) {
      emitter.emit.apply(emitter, args);
    });
  }
};