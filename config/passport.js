const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../models/User");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user;
        if (validator.isEmail(username)) {
          user = await User.findOne({ email: username });
          if (!user) {
            return done(null, false, { message: "Email is not registered" });
          }
        } else {
          user = await User.findOne({ username: username });
          if (!user) {
            return done(null, false, { message: "Invalid username" });
          }
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: "Incorrect Password!" });
        } else {
          if (!user.isVerified) {
            return done(null, false, {
              message: "Your account has not been verified! Check your email.",
            });
          } else {
            return done(null, user);
          }
        }
      } catch (error) {
        console.error(error);
      }
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
