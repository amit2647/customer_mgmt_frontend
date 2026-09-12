const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");

router.post("/auth/login", authController.login);

router.get("/auth/me", authenticate, authController.me);

module.exports = router;
