const router = require("express").Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const validator = require("validator");
const crypto = require("crypto");
const User = require("../models/User");
const Token = require("../models/Token");
const { ensureAuth, ensureGuest } = require("../middleware/authentication");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.get("/", ensureGuest, (req, res) => {
  res.render("welcome", {
    layout: "auth",
  });
});

router.get("/login", ensureGuest, (req, res) => {
  res.render("login", {
    layout: "auth",
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/user/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/register", ensureGuest, (req, res) => {
  res.render("register", {
    layout: "auth",
  });
});

router.post("/register", async (req, res) => {
  const { name, username, email, password, password2 } = req.body;
  let errors = [];

  if (
    !name.trim() ||
    !username.trim() ||
    !email.trim() ||
    !password ||
    !password2
  ) {
    errors.push({ msg: "Please fill in all fields" });
  }

  if (username.length < 6) {
    errors.push({ msg: "username must be atleast 6 characters" });
  }

  if (password !== password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (password.length < 6) {
    errors.push({ msg: "Password should be atleast 6 characters" });
  }

  if (!validator.isEmail(email)) {
    errors.push({ msg: "Not a valid email" });
  }

  if (errors.length > 0) {
    res.render("register", {
      layout: "auth",
      errors,
      name,
      username,
      email,
      password,
      password2,
    });
  } else {
    try {
      const user = await User.findOne({ email: email });
      if (user) {
        errors.push({ msg: "Email is already registered!" });
        res.render("register", {
          layout: "auth",
          errors,
          name,
          username,
          email,
          password,
          password2,
        });
      } else {
        const hash = await bcrypt.hash(req.body.password, 10);

        const newUser = new User({
          name,
          username,
          email,
          password: hash,
        });

        await newUser.save();

        const token = new Token({
          _userId: newUser._id,
          token: crypto.randomBytes(16).toString("hex"),
        });

        await token.save();
        await sgMail.send({
          to: newUser.email,
          from: process.env.ADMIN,
          subject: "Verify your email to start using Picshub",
          text: `Welcome to Picshub ${newUser.name}. Verify your email address so we know it's really you. Click on this link: \nhttp:\/\/${req.headers.host}\/confirmation\/${token.token}`,
        });
        req.flash(
          "success_msg",
          `A verification email has been sent to ${newUser.email}.`
        );
        return res.redirect("/login");
      }
    } catch (error) {
      res.render("autherror", {
        layout: "auth",
      });
    }
  }
});

router.get("/confirmation/:token", async (req, res) => {
  try {
    const existingToken = await Token.findOne({ token: req.params.token });
    if (!existingToken) {
      return res.redirect("/resend");
    }

    const user = await User.findOne({ _id: existingToken._userId });
    if (!user) {
      req.flash("error_msg", "We were unable to find a user for this token.");
      return res.redirect("/register");
    }
    if (user.isVerified) {
      req.flash("success_msg", "This user has already been verified. Log in!");
      return res.redirect("/login");
    }

    user.isVerified = true;
    await user.save();
    req.flash("success_msg", "The account has been verified. Please log in.");
    return res.redirect("/login");
  } catch (error) {
    res.render("autherror", {
      layout: "auth",
    });
  }
});

router.get("/resend", ensureGuest, (req, res) => {
  res.render("resend", {
    layout: "auth",
  });
});

router.post("/resend", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error_msg", "We were unable to find a user with that email!");
      return res.redirect("/resend");
    }
    if (user.isVerified) {
      req.flash(
        "success_msg",
        "This account has already been verified. Please log in"
      );
      return res.redirect("/login");
    }

    const token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });
    await token.save();
    await sgMail.send({
      to: user.email,
      from: process.env.ADMIN,
      subject: "Verify your email to start using Picshub",
      text: `Welcome to Picshub ${user.name}. Verify your email address so we know it's really you. Click on this link: \nhttp:\/\/${req.headers.host}\/confirmation\/${token.token}`,
    });
    req.flash(
      "success_msg",
      `A verification email has been sent to ${user.email}.`
    );
    return res.redirect("/login");
  } catch (error) {
    res.render("autherror", {
      layout: "auth",
    });
  }
});

router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You are logged out!");
  res.redirect("/login");
});

router.get("/forgot", ensureGuest, (req, res) => {
  res.render("forgot", {
    layout: "auth",
  });
});

router.post("/forgot", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error_msg", "We were unable to find a user with that email!");
      return res.redirect("/forgot");
    }

    const token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });
    await token.save();
    await sgMail.send({
      to: user.email,
      from: process.env.ADMIN,
      subject: "Password reset request",
      text: `Hello ${user.name}. A request has been received to change the password for your Picshub account. Click on this link if it's really you and follow the instructions to reset your password: \nhttp:\/\/${req.headers.host}\/reset\/${token.token}`,
    });
    req.flash("success_msg", `An email has been sent to ${user.email}.`);
    return res.redirect("/forgot");
  } catch (error) {
    res.render("autherror", {
      layout: "auth",
    });
  }
});

router.get("/reset/:token", async (req, res) => {
  try {
    const existingToken = await Token.findOne({ token: req.params.token });
    if (!existingToken) {
      req.flash("error_msg", "Your token is invalid or has expired!");
      return res.redirect("/forgot");
    }

    const user = await User.findOne({ _id: existingToken._userId });
    if (!user) {
      req.flash("error_msg", "We were unable to find a user with that token");
      return res.redirect("/register");
    }

    res.render("reset", {
      layout: "auth",
      token: req.params.token,
    });
  } catch (error) {
    res.render("autherror", {
      layout: "auth",
    });
  }
});

router.post("/reset/:token", async (req, res) => {
  const { password, password2 } = req.body;
  let errors = [];
  if (!password.trim() || !password2.trim()) {
    errors.push({ msg: "Please fill in all the fields" });
  }
  if (password !== password2) {
    errors.push({ msg: "Passwords don't match" });
  }
  if (password.length < 6) {
    errors.push({ msg: "Password should be atleast 6 characters" });
  }

  if (errors.length > 0) {
    res.render("reset", {
      layout: "auth",
      errors,
      token: req.params.token,
    });
  } else {
    try {
      const existingToken = await Token.findOne({ token: req.params.token });
      if (!existingToken) {
        req.flash("error_msg", "Your token is invalid or has been expired!");
        return res.redirect("/forgot");
      }
      const user = await User.findOne({ _id: existingToken._userId });
      if (!user) {
        req.flash(
          "error_msg",
          "We were unable to find a user with that token!"
        );
        return res.redirect("/register");
      }

      const hash = await bcrypt.hash(req.body.password, 10);
      user.password = hash;
      await user.save();
      await sgMail.send({
        to: user.email,
        from: process.env.ADMIN,
        subject: "Password changed",
        text: `Hello ${user.name}. This is a confirmation that your password has been changed.`,
      });
      req.flash(
        "success_msg",
        "Your password has been changed successfully. Please log in."
      );
      res.redirect("/login");
    } catch (error) {
      res.render("autherror", {
        layout: "auth",
      });
    }
  }
});

module.exports = router;
