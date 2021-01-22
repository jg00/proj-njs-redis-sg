const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

// Apply to queries if we want to caches
mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");

  return this;
};

mongoose.Query.prototype.exec = async function () {
  // Do not apply caching
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  const key = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name,
  });

  // See if we have a value for 'key' in redis.  Second argument key reference specific query from specific resource.
  const cacheValue = await client.hget(this.hashKey, key);

  // If we do, return from redis
  if (cacheValue) {
    const doc = JSON.parse(cacheValue);

    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise, issue the query and store the result in redis
  const result = await exec.apply(this, arguments); // Returned value expected to be document instance returned

  client.hset(this.hashKey, key, JSON.stringify(result));
  // client.hset(this.hashKey, key, JSON.stringify(result), "EX", 10);

  return result; // Here returning Model Instance
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};

/*
  // Ref only re keys
  const exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = function () {
    // Code before any query is executed by Mongoose
    // console.log("IM ABOUT TO RUN A QUERY");
    // console.log(this.getQuery());
    // console.log(this.mongooseCollection.name);

    const key = {
      ...this.getQuery(),
      collection: this.mongooseCollection.name,
    };

    const key2 = Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    });

    console.log(key);
    console.log(key2);

    return exec.apply(this, arguments);
  };
*/

/*
  // Ref only re convert data to Mongoose model and handling arrays vs objects.
  const mongoose = require("mongoose");
  const redis = require("redis");
  const util = require("util");

  const redisUrl = "redis://127.0.0.1:6379";
  const client = redis.createClient(redisUrl);
  client.get = util.promisify(client.get);
  const exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = async function () {
    const key = JSON.stringify({
      ...this.getQuery(),
      collection: this.mongooseCollection.name,
    });

    // See if we have a value for 'key' in redis
    const cacheValue = await client.get(key);

    // If we do, return from redis
    if (cacheValue) {
      // console.log(this); // 'this' here is a reference to the current query instance object with a 'model' base class for a Query
      // this.model() represents model that represents the query or that this query is attached to

      // Currently we have two types of values we are storing inside of Redis
      // 1 model instances like our current user
      // 2 but we are also storing arrays [] of records which is the case for our list of blog posts.
      // Whenever we create a new instance of model the expectation is that we are going to pass in exactly
      // one records worth of attributes as arguments.
      // So when we try to turn the current user and turn them to a model instance this line of code is working
      // perfectly becasue JSON.parse() turns into something like { _id: '123', googleID: '12345' }
      // But when we pull out an array of blog posts the JSON.parse() turns into an [] array of
      // blog posts [ {title:'blog1'}, {title:'blog2'}] each of which needs to individually be turned
      // into a model instance.
      // So we need to handle both cases properly.  The case when we are dealing with an array and the case
      // when we are dealing with a single object.

      // Line below does not handle arrays
      // const doc = new this.model(JSON.parse(cacheValue));
      // return doc;

      // Line below is not a model instance
      // return JSON.parse(cacheValue); // Need to return a Model Instance

      // Hydrating Arrays
      const doc = JSON.parse(cacheValue);

      return Array.isArray(doc)
        ? doc.map((d) => new this.model(d))
        : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments); // Returned value expected to be document instance returned

    client.set(key, JSON.stringify(result));

    return result; // Here returning Model Instance
  };


*/
