
// Exports: Engine state object
//
var state = module.exports = {};

// worker objects being executed right now
state.workers = [];

// Property: operationIds
Object.defineProperty(state, 'operationIds', {
	get: function() {
		return state.workers.reduce( function(ids, worker) {
			if ( worker.operation ) {
				ids.push(worker.operation.id);
			}
			
			return ids;
		}, []);
	},
});