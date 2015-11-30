import { toArray, find, each, pick, defaults, isObject, isFunction, identity, compact, sortBy } from 'lodash';
import invariant from 'invariant';
import phantom from 'phantom';
import createError from 'http-errors';
import request from 'request-promise';
import phantomConfig from '../config/phantom';
import Item from './db/Item';
import Operation from './db/Operation';
import createEmitter, { emitterProto } from './emitter';
import logger from './logger';
import createPage from './page';

const debug = logger.debug('nest:spider');
const { PHANTOM_LOG, FORCE_DYNAMIC } = process.env;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const baseProto = {
  running: true,
  isVerbose: false,
  phantom: null,
  iteration: 0,

  // enables "verbose" mode
  verbose() {
    if (!this.isVerbose) {
      this.on('start', debug.bind(this, 'Starting operation.'));
      this.on('finish', debug.bind(this, 'Operation finished.'));
      this.on('scraped:raw', debug.bind(this, 'Got raw scraped data.'));
      this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
      this.isVerbose = true;
    }
  },

  /**
   * Page functions
   */

  // opens a URL, returns a loaded page
  // if "dynamic" is false, it will use cheerio instead of PhantomJS to scrape
  async open(url, options = {}) {
    invariant(isObject(options), 'Options needs to be an object');

    this.url = url;

    const isDynamic = options.dynamic || FORCE_DYNAMIC;
    const getPage = isDynamic ? this.openDynamic : this.openStatic;

    return await getPage.call(this, url);
  },

  async openStatic(url) {
    debug(`Opening URL ${url}`);

    const res = await request(url, {
      resolveWithFullResponse: true
    });

    const { statusCode, body } = res;
    const html = body;
    const page = createPage(html, { url, statusCode, res });

    this.emit('page:open', page);

    return page;
  },

  async openDynamic(url) {
    debug(`Opening URL ${url} with PhantomJS`);

    const phantomPage = await this.createPhantomPage();

    if (PHANTOM_LOG === 'true') {
      phantomPage.set('onConsoleMessage', (msg) => {
        console.log(`Phantom Console: ${msg}`); // eslint-disable-line
      });
    }

    const pageOpenStatus = await phantomPage.openAsync(url);
    invariant(pageOpenStatus === 'success', `Could not open url: ${url}`);

    const jsInjectionStatus = await this.includeJS(phantomPage);
    invariant(jsInjectionStatus, `Could not include JS on url: ${url}`);

    const html = await phantomPage.evaluateAsync(() => $('html').html()); // eslint-disable-line
    const page = createPage(html, { url, phantomPage });

    this.emit('page:open', page, phantomPage);

    return page;
  },

  // creates a phantomJS instance
  async createPhantom() {
    debug('Creating PhantomJS instance');

    return await new Promise((resolve) => {
      phantom.create(phantomConfig, (ph) => {
        this.phantom = ph;
        resolve(ph);
      });
    });
  },

  // stops its phantomJS instance
  stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  },

  // creates a PhantomJS Page instance
  async createPhantomPage() {
    const ph = this.phantom || await this.createPhantom();

    return await new Promise((resolve) => {
      ph.createPage((page) => {

        page.openAsync = (url) => {
          return new Promise((resolve) => {
            page.open(url, (status) => {
              resolve(status);
            });
          });
        };

        page.evaluateAsync = (func) => {
          return new Promise((resolve) => {
            page.evaluate(func, (res) => {
              resolve(res);
            });
          });
        };

        resolve(page);
      });
    });
  },

  // includes javascript <script> tags in opened web page
  async includeJS(page) {
    debug('Including JS on page');

    return await new Promise((resolve) => {
      page.includeJs('https://code.jquery.com/jquery-2.1.4.min.js', (status) => {
        resolve(status);
      });
    });
  },

  /**
   * Control functions
   */

  // stops the spider, optionally clearing the listeners
  stop(removeListeners) {
    debug('Stopping Spider');

    this.emit('spider:stopped');

    if (removeListeners) {
      this.removeAllListeners();
    }

    this.stopPhantom();
    this.running = false;
  },


  /**
   * Scraper functions
   */

  async scrape(operation, { routes, plugins }, retryCount = 0) {
    invariant(isObject(operation), 'Operation is not valid');

    if (operation.state.finished) {
      debug('Operation was already finished');
      return operation;
    }

    const { state, routeId } = operation;
    const route = find(routes, { key: routeId });

    invariant(route.initialized, 'Route has not been initialized');

    debug(`Starting operation: ${operation.routeId}` +
      (operation.query ? ` ${operation.query}` : ''));

    // save the starting time of this operation
    if (operation.wasNew) {
      state.startedDate = Date.now();
    }

    // create the URL using the operation's parameters
    const url = route.urlGenerator(operation);

    this.emit('operation:start', operation, url);

    // opens the page
    let page;
    let status;

    try {
      page = await this.open(url, { dynamic: route.isDynamic });

      // manually check if the page has been blocked
      if (isFunction(route.checkStatus)) {
        status = page.runInContext(route.checkStatus);
      }

      status = !isNaN(status)
        ? parseInt(status, 10)
        : page.status || 200;

    } catch (err) {
      if (isObject(err) && !isNaN(err.statusCode)) {
        status = parseInt(err.statusCode, 10);
      } else {
        throw err;
      }
    }

    // if the operation has been stopped
    if (!this.running) {
      this.emit('operation:stopped', operation);
      return operation;
    }

    debug(`Got ${status}`);

    // run the route's error handler for 4xx routes
    if (status >= 400) {

      let newOperation;

      try {
        newOperation = await route.onError.call(this, operation, retryCount);
      } catch (err) {
        newOperation = null;
        logger.error(err);

        if (isObject(err) && !isNaN(err.statusCode)) {
          status = parseInt(err.statusCode, 10);
        }
      }

      // if nothing was returned from the error handler, stop
      if (!newOperation) {
        this.running = false;
        this.emit('operation:stopped', operation);
        throw createError(status);
      }

      // if the error handler returned `true` or a truthy value,
      // restart the operation
      if (!isObject(newOperation)) {
        newOperation = operation;
      }

      return await this.scrape(operation, { routes, plugins }, retryCount++);
    }

    // scapes and sanitizes the page
    let scraped = await page.runInContext(route.scraper);
    this.emit('scraped:raw', scraped, operation, page);

    scraped = this.sanitizeScraped(scraped);

    each(scraped.items, (item) => {
      item.routeId = route.key;
      item.routeWeight = route.priority;
    });

    debug(`Scraped ${scraped.items.length} items`);

    // apply route-specific middleware
    if (isFunction(route.middleware)) {
      try {
        scraped = await route.middleware(scraped) || scraped;
      } catch (err) {
        logger.error(err);
      }
    }

    // apply plugins
    for (const plugin of sortBy(toArray(plugins), 'weight')) {
      try {
        scraped = await plugin(scraped) || scraped;
      } catch (err) {
        logger.error(err);
      }
    }

    const newOps = await this.spawnOperations(scraped.operations, routes);

    if (newOps.length) {
      this.emit('operations:created', newOps);
      operation.stats.spawned += newOps.length;
    }

    // save and update items
    const results = await Item.eachUpsert(scraped.items);
    results.operationsCreated = newOps.length;

    // change state
    if (scraped.hasNextPage) {
      state.currentPage++;
    } else {
      state.finished = true;
      state.finishedDate = Date.now();
    }

    state.history.push(url);

    if (scraped.state) {
      state.data = Object.assign(state.data || {}, scraped.state);
    }

    operation.stats.pages++;
    operation.stats.items += results.created;
    operation.stats.updated += results.updated;
    operation.updated = new Date();

    this.iteration++;
    this.emit('scraped:page', results, operation);
    this.stopPhantom();

    debug('Saving operation');
    await operation.save();

    // if the operation has been stopped
    if (!this.running) {
      this.emit('operation:stopped', operation);
    }

    // Operation finished
    if (state.finished) {
      this.emit('operation:finish', operation);
      this.running = false;
      return operation;
    }

    // Operation has next page
    debug(`Scraping next page`);
    this.emit('operation:next', operation);

    return await this.scrape(operation, { routes, plugins });
  },

  /**
   * Creates new scraping operations
   * @param  {Array}  operations Operations to create
   * @param  {Object} routes     Available routes
   * @return {Promise}
   */
  async spawnOperations(operations, routes) {
    if (operations.length === 0) {
      debug('No operations to spawn');
      return [];
    }

    debug('Spawning operations');

    const promises = operations.map((op) => {
      const { routeId, query } = op;
      const targetRoute = find(routes, { key: routeId });

      if (!targetRoute) {
        logger.warn(`[spawnOperations]: Route ${routeId} does not exist`);
        return Promise.resolve();
      }

      // Create a new operation
      return Operation.findOrCreate(query, targetRoute);
    });

    const newOperations = await Promise.all(promises);

    debug(`Operations spawned: ${newOperations.length} operations`);

    return newOperations;
  },

  defaultErrorHandler(operation, retryCount) {
    if (retryCount < 3) {
      debug('Operation blocked. Retrying in 5s...\n' +
        `Will retry ${3 - retryCount} more times`);

      let resolved = false;
      return new Promise((resolve) => {
        function onSpiderStopped() {
          resolved = true;
          resolve();
        }

        this.once('spider:stopped', onSpiderStopped);

        sleep(5000).then(() => {
          if (!resolved) {
            resolved = true;
            this.removeListener('spider:stopped', onSpiderStopped);
            resolve();
          }
        });
      });
    }

    debug(`Operation blocked. Aborting.`);
    return false;
  },

  // sanitize the raw scraped data
  sanitizeScraped(scraped) {
    const sanitized = isObject(scraped) ? Object.assign({}, scraped) : {};

    debug('Sanitizing scraped');

    // set up defaults
    defaults(sanitized, {
      hasNextPage: false,
      items: [],
      operations: []
    });

    // validate scraped.items and scraped.operations type
    ['items', 'operations'].forEach((field) => {
      invariant(sanitized[field] instanceof Array,
        `Scraping function returned data.${field}, ` +
        `but its not an array.`);
    });

    // sanitize the operations
    sanitized.operations = compact(sanitized.operations.map((op) => {
      if (!op.routeId) return null;
      return op;
    }));

    // sanitize the items
    sanitized.items = sanitized.items.map((item) => {

      // remove empty properties
      item = pick(item, identity);

      for (const key in item) {
        if (item.hasOwnProperty(key) && typeof item[key] === 'string') {
          item[key] = item[key].trim();
        }
      }

      return item;
    });

    return sanitized;
  }
};

const spiderProto = Object.assign({}, emitterProto, baseProto);

export default function createSpider(spider) {
  spider = spider || Object.create(spiderProto);
  createEmitter(spider);
  return spider;
}
