const router = require("express").Router();
const { ensureAuth, ensureGuest } = require("../middleware/authentication");
const Image = require("../models/Image");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// GET /images/add
router.get("/add", ensureAuth, (req, res) => {
  res.render("images/add");
});

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/public/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e5
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
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

// POST /images
router.post(
  "/",
  ensureAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const image = new Image({
        filename: req.file.filename,
        path: req.file.path,
        caption: req.body.caption,
        status: req.body.status,
        user: req.user.id,
        uuid1: uuidv4(),
        uuid2: uuidv4(),
      });
      await image.save();
      res.redirect("/user/dashboard");
    } catch (error) {
      console.error(error);
      res.render("error/500");
    }
  },
  (error, req, res, next) => {
    res.render("images/add", {
      error: error.message,
    });
  }
);

// GET /images
router.get("/", ensureAuth, async (req, res) => {
  try {
    let images = await Image.find({ status: "public" })
      .populate("user")
      .sort({ createdAt: "desc" })
      .lean();

    images.forEach((element) => {
      element.path = `/uploads/${element.filename}`;
      if (element.user.avatar) {
        element.user.avatar = element.user.avatar.toString("base64");
      }
    });
    res.render("images/index", {
      images,
    });
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

// DELETE /images/:id
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id).lean();
    if (!image) {
      return res.render("error/404");
    }
    if (image.user != req.user.id) {
      return res.redirect("/user/dashboard");
    } else {
      fs.unlink(
        path.join(__dirname, `../public/uploads/${image.filename}`),
        (error) => {
          if (error) {
            throw error;
          }
        }
      );
      await Image.deleteOne({ _id: req.params.id });
      res.redirect("/user/dashboard");
    }
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

// GET /images/download/:id
router.get("/download/:id", ensureAuth, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id).lean();
    if (!image) {
      return res.render("error/404");
    }
    const file = path.join(__dirname, `../public/uploads/${image.filename}`);
    res.download(file);
  } catch (error) {
    res.render("error/500");
  }
});

// GET /images/edit/:id
router.get("/edit/:id", ensureAuth, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id).lean();
    if (!image) {
      res.render("error/404");
    }
    if (image.user != req.user.id) {
      return res.redirect("/user/dashboard");
    }
    res.render("images/edit", {
      image,
    });
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

// PUT /images/:id
router.put("/:id", ensureAuth, async (req, res) => {
  try {
    let image = await Image.findById(req.params.id).lean();
    if (!image) {
      return res.render("error/404");
    }
    if (image.user != req.user.id) {
      res.redirect("/user/dashboard");
    } else {
      image = await Image.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      res.redirect("/user/dashboard");
    }
  } catch (error) {
    console.error(error);
    res.render("error/500");
  }
});

module.exports = router;
