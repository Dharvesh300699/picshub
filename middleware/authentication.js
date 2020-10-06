module.exports = {
  ensureAuth: async (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect("/");
    }
  },
  ensureGuest: async (req, res, next) => {
    if (req.isAuthenticated()) {
      res.redirect("/user/dashboard");
    } else {
      return next();
    }
  },
};
