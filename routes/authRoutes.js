const passport = require("passport");

module.exports = (app) => {
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      // prompt: "select_account", // Added here works else you have to log out of google directly or redirect to https://mail.google.com/mail/u/0/?logout&hl=en to completely log out of google
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google"),
    (req, res) => {
      res.redirect("/blogs");
    }
  );

  app.get("/auth/logout", (req, res) => {
    req.logout();
    // req.session = null;

    res.redirect("/");
  });

  app.get("/api/current_user", (req, res) => {
    // console.log("Current User:", req.user);
    res.send(req.user);
  });
};
