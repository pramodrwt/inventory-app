const path = require("path");
const express = require("express");

const redis = require("redis");
const mcache = require("memory-cache");
const flatCache = require("flat-cache");
const Memcached = require("memcached");
const sqlite3 = require("sqlite3").verbose();

const PORT = process.env.PORT || 3128;

const app = express();

// --------------------------------------------------------
// Configuring In-Memory Cache
// --------------------------------------------------------

let memCache = new mcache.Cache();

let cacheMiddleware = duration => {
  return (req, res, next) => {
    let key = "__express__" + req.originalUrl || req.url;
    let cacheContent = memCache.get(key);
    if (cacheContent) {
      res.send(cacheContent);
      // console.log('reading from cache');
      return;
    } else {
      res.sendResponse = res.send;
      res.send = body => {
        memCache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      // console.log('storing in cache');
      next();
    }
  };
};

// --------------------------------------------------------
// Configuring Flat Cache Middleware for File Caching
// --------------------------------------------------------

let cache = flatCache.load("productsCache", path.resolve("./cache"));

let flatCacheMiddleware = (req, res, next) => {
  let key = "__express__" + req.originalUrl || req.url;
  let cacheContent = cache.getKey(key);
  if (cacheContent) {
    res.send(cacheContent);
    return;
  } else {
    res.sendResponse = res.send;
    res.send = body => {
      cache.setKey(key, body);
      cache.save();
      res.sendResponse(body);
    };
    next();
  }
};

// --------------------------------------------------------
// Using the MemCached Service for File Caching
// --------------------------------------------------------
let memcached = new Memcached("127.0.0.1:11211");

let memcachedMiddleware = duration => {
  return (req, res, next) => {
    let key = "__expreeedddddss__" + req.originalUrl || req.url;
    memcached.get(key, function(err, data) {
      if (data) {
        res.send(data);
        return;
      } else {
        res.sendResponse = res.send;
        res.send = body => {
          memcached.set(key, body, duration * 60, function(err) {
            //
          });
          res.sendResponse(body);
        };
        next();
      }
    });
  };
};

// --------------------------------------------------------
// Configuring Redis Middleware
// --------------------------------------------------------

const client = redis.createClient();

let redisMiddleware = (req, res, next) => {
  let key = "__express__" + req.originalUrl || req.url;

  client.get(key, function(err, reply) {
    if (reply) {
      res.send(reply);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = body => {
        client.set(key, JSON.stringify(body));
        res.sendResponse(body);
      };
      next();
    }
  });
};

// --------------------------------------------------------
// create app routes
// --------------------------------------------------------

app.get("/products", memcachedMiddleware(20), function(req, res) {
  setTimeout(() => {
    let db = new sqlite3.Database("./NodeInventory.db");

    let sql = `SELECT * FROM products`;

    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      db.close();
      res.send(rows);
    });
  }, 3000);
});

// --------------------------------------------------------
// Set appliication port
// --------------------------------------------------------

app.listen(PORT, function() {
  console.log(`App running on port ${PORT}`);
});
