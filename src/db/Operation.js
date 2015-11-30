/* eslint-disable key-spacing, no-multi-spaces */
import './connection';
import mongoose from 'mongoose';
import invariant from 'invariant';
import { isObject, extend, isArray } from 'lodash';
import inspect from 'util-inspect';
import logger from '../logger';

const debug = logger.debug('nest:operation');
const Mixed = mongoose.Schema.Types.Mixed;


/**
 * Schema
 */
const schema = new mongoose.Schema({
  routeId:   { type: String, required: true },
  query:     { type: Mixed },
  priority:  { type: Number, default: 50 },
  created:   { type: Date,   default: Date.now },
  updated:   { type: Date },

  stats: {
    pages:   { type: Number, default: 0 },
    results: { type: Number, default: 0 },
    items:   { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    spawned: { type: Number, default: 0 }
  },

  state: {
    currentPage:  { type: Number,  default: 1 },
    finished:     { type: Boolean, default: false },
    finishedDate: { type: Date },
    startedDate:  { type: Date },
    history:     [{ type: String }],
    data:         { type: Mixed, default: {} }
  }
});


/**
 * Hooks
 */
schema.pre('save', function(next) {
  this.wasNew = this.isNew;
  next();
});


/**
 * Static Methods
 */
extend(schema.statics, {

  /**
   * Creates or find an operation to this route with the provided query argument.
   */
  async findOrCreate(query, route) {
    invariant(isObject(route), 'Route is not an object');
    invariant(!isArray(query), 'Query arrays not supported');
    invariant(route.key, 'Route name is required.');

    const key = {
      routeId: route.key
    };

    if (query) {
      key.query = query;
    }

    debug(`findOrCreate with params\n${inspect(key)}`);

    let operation = await this.findOne(key).exec();

    if (!operation) {
      const params = extend({}, key, {
        priority: route.priority
      });

      debug(`Creating operation with params:\n${inspect(params)}`);

      operation = await this.create(params);
      operation.wasNew = true;
    } else {
      operation.wasNew = false;
    }

    return operation;
  },

  async getNext(params) {
    invariant(isObject(params), 'Invalid params');

    const { operationIds, disabledRoutes } = params;

    const query = {
      'state.finished': false
    };

    if (operationIds) {
      query._id = { $nin: operationIds };
    }

    if (disabledRoutes && disabledRoutes.length) {
      query.routeId = { $nin: disabledRoutes };
    }

    debug(`Getting next operation.\n` +
      `Query: ${inspect(query)}\n` +
      `Params: ${inspect(params)}`);

    return await this.findOne(query).sort({ 'priority': -1 }).exec();
  }

});


/**
 * Indexes
 */
schema.index({ 'priority': -1 });
schema.index({ 'state.finished': -1 });
schema.index({ 'priority': -1, 'state.finished': -1 });


/**
 * @providesModule Operation
 */
export default mongoose.model('Operation', schema);
