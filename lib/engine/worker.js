var async = require('async');

var Spider      = require('../spider');
var Operation   = require('../models/Operation');
var loaderQueue = require('./loader.queue');
var routes      = require('../../routes');
var state       = require('./state');

var _log = require('../logger');
var debug = _log.debug('Worker');

// Exports: Worker
//
module.exports = Worker;

function Worker() {
	Spider.call(this); // call super constructor

	this.timeoutPromise = null;
	this.running = true;

	this.operation = null;
	this.route = null;

	// Bind the methods to itself
	this.isRunning          = this.isRunning.bind(this);
	this.startNextOperation = this.startNextOperation.bind(this);

	// Set up debugging listeners
	this.on('operation:start', function(operation, url) {
		debug('Scraping: '+url);
	});

	this.on('operation:blocked', function(operation, url) {
		debug('Request blocked on: '+url);
	});

	debug('Starting worker.');

	this.start();
}

// Inherits from: Spider
Worker.prototype = Object.create( Spider.prototype );

// start this worker
Worker.prototype.start = function() {
	var self = this;

	async.whilst(self.isRunning, loadOperation, onStop);

	function loadOperation(callback) {
		loaderQueue.push(self.startNextOperation, function(err, spider) {
			if (err) throw err;
			if (!spider) return callback();

			spider.once('error', function(err) {
				console.error(err);
				self.operation = null;
				callback();
			});

			spider.once('operation:finish', function(operation) {
				debug(
					'Operation finished: '+operation.route+'. '+
					operation.stats.items+' items created. '+
					operation.stats.updated+' items updated. '+
					operation.stats.spawned+' operations created.'
				);

				self.operation = null;
				self.route = null;
				self.spider = null;
				callback();
			});
		});
	}

	function onStop() {
		self.emit('worker:stopped', self);
		// todo: pull worker from loaderQueue if was in queue
	}
};

Worker.prototype.stop = function(callback) {
	if ( !this.running ) return callback();
	
	this.running = false;

	debug('Stopping worker.');

	if ( this.spider ) {
		this.spider.emit('spider:stop');
	}

	this.once('worker:stopped', function() {
		callback();
	});
};

// gets and starts the next operation, and returns a running spider
Worker.prototype.startNextOperation = function(callback) {
	var self = this;

	Operation.getNext(state, function(err, operation) {
		if ( err || !self.running )
			return callback(err);

		// if there are no new operations to process, 
		// keep on quering for them each second.
		if ( !operation ) {
			debug('There are no pending operations. Retrying in 1s');
			self.emit('operation:noop');
			self.timeoutPromise = setTimeout( function() {
				self.timeoutPromise = null;
				self.startNextOperation(callback);
			}, 1000);

			return;
		}

		var routeName = operation.route;
		var provider  = operation.provider;
		var query     = operation.query;
		var route     = routes[provider][routeName];

		debug('Got operation: '+provider+'->'+routeName+'. Query: '+query);


		var spider = new Spider();
		spider.addEmitter(self);
		spider.scrape(operation);

		self.operation = operation;
		self.route = route;
		self.spider = spider;

		callback(null, spider);
	});
};

Worker.prototype.isRunning = function() {
	return this.running;
};