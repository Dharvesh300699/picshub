const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const exphbs = require("express-handlebars");
const methodOverride = require("method-override");
const path = require("path");
const connectDB = require("./config/db");

// Load config
dotenv.config({ path: "./config/config.env" });

// Passport config
require("./config/passport")(passport);

connectDB();

const app = express();

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      // look in urlencoded POST bodies and delete it
      let method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// Handlebars Helpers
const {
  isPublic,
  isPrivate,
  formatDate,
  truncate,
  select,
  profileOwner,
} = require("./helpers/hbs");

// Handlebars
app.engine(
  ".hbs",
  exphbs({
    helpers: {
      isPublic,
      isPrivate,
      formatDate,
      truncate,
      select,
      profileOwner,
    },
    defaultLayout: "main",
    extname: ".hbs",
  })
);
app.set("view engine", ".hbs");

// sessions
app.use(
  session({
    secret: "dharveshvishal",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Globar vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  let user = {};
  if (req.user) {
    if (req.user.avatar) {
      user.avatar = req.user.avatar.toString("base64");
    }
    user.email = req.user.email;
    user.name = req.user.name;
    user._id = req.user.id;
  }
  res.locals.user = user;
  next();
});

// Static assests
app.use(express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", require("./routes/auth"));
app.use("/images", require("./routes/images"));
app.use("/user", require("./routes/index"));

const port = process.env.PORT || PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// /home/ddharvesh/mongodb/bin/mongod --dbpath=/home/ddharvesh/mongodb-data
