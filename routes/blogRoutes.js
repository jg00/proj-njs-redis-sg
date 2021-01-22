const mongoose = require("mongoose");
const requireLogin = require("../middlewares/requireLogin");
const cleanCache = require("../middlewares/cleanCache");
// const { clearHash } = require("../services/cache");

const Blog = mongoose.model("Blog");

module.exports = (app) => {
  app.get("/api/blogs/:id", requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id,
    });

    res.send(blog);
  });

  app.get("/api/blogs", requireLogin, async (req, res) => {
    const blogs = await Blog.find({ _user: req.user.id }).cache({
      key: req.user.id,
    }); // Cache data initially if not already cached then return cached data going forward. (Note dirty reads if new blogs added because cache is not yet updated.)

    res.send(blogs);
  });

  app.post("/api/blogs", requireLogin, cleanCache, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id,
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }

    // clearHash(req.user.id);
  });
};

/*  Ref only
app.get("/api/blogs", requireLogin, async (req, res) => {
  const redis = require("redis");
  const redisUrl = "redis://127.0.0.1:6379";
  const client = redis.createClient(redisUrl);
  const util = require("util");
  client.get = util.promisify(client.get);

  // Do we have any cached data in redis related to this query
  const cachedBlogs = await client.get(req.user.id);

  // If yes then respond to request right away
  if (cachedBlogs) {
    console.log("SERVING FROM CACHE");
    return res.send(JSON.parse(cachedBlogs));
  }

  // If no we need to respond to request and update our cache to store the data
  const blogs = await Blog.find({ _user: req.user.id });

  console.log("SERVING FROM MONGODB");
  res.send(blogs);

  client.set(req.user.id, JSON.stringify(blogs));
});
*/
