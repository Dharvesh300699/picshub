const router = require("express").Router();
const Image = require("../models/Image");
const User = require("../models/User");
const multer = require("multer");
const sharp = require("sharp");
const { ensureAuth, ensureGuest } = require("../middleware/authentication");
router.get("/dashboard", ensureAuth, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user._id })
      .sort({ createdAt: "desc" })
      .lean();
    images.forEach((element) => {
      element.path = element.filename;
    });
    res.render("dashboard", {
      name: req.user.name,
      images,
    });
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

const upload = multer({
  limits: {
    fileSize: 1048576,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      cb(new Error("File extension should be .jpg, .jpeg or .png"));
    }
    cb(null, true);
  },
});

// GET /user/update
router.get("/update", ensureAuth, (req, res) => {
  let profileOwner = {};
  profileOwner.name = req.user.name;
  profileOwner.interest = req.user.interest;
  res.render("images/profile", {
    profileOwner,
  });
});

// POST /user/update
router.post(
  "/update",
  ensureAuth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (req.file) {
        const buffer = await sharp(req.file.buffer).png().toBuffer();
        req.user.avatar = buffer;
      }
      req.user.name = req.body.name;
      if (req.body.interest) {
        req.user.interest = req.body.interest;
      }
      await req.user.save();
      res.redirect("/user/dashboard");
    } catch (error) {
      console.error(error);
      res.render("error/500");
    }
  },
  (error, req, res, next) => {
    res.render("images/profile", {
      error: error.message,
    });
  }
);

// GET /user/profile/:userId
router.get("/profile/:userId", ensureAuth, async (req, res) => {
  try {
    let owner = await User.findById(req.params.userId).lean();
    if (owner.avatar) {
      owner.avatar = owner.avatar.toString("base64");
    }
    let images = await Image.find({
      user: req.params.userId,
      status: "public",
    })
      .populate("user")
      .lean();

    images.forEach((element) => {
      element.path = element.filename;
      if (element.user.avatar) {
        element.user.avatar = element.user.avatar.toString("base64");
      }
    });

    res.render("images/user", {
      owner,
      images,
    });
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

module.exports = router;
