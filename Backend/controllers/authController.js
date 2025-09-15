const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Police = require("../models/Police");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

function cookieOpts() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
}

// LOGIN
exports.login = async (req, res) => {
  const rawEmail = (req.body?.email || "").trim();
  const email = rawEmail.toLowerCase();
  const password = req.body?.password || "";

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password required" });
  }

  const user = await Police.findOne({ email }).select("+password");
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
  res.cookie("token", token, cookieOpts());

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
  };
  res.json({ success: true, token, user: userData });
};

// LOGOUT
exports.logout = async (req, res) => {
  res.clearCookie("token", { ...cookieOpts(), maxAge: 0 });
  res.json({ success: true });
};

// CURRENT USER
exports.me = async (req, res) => {
  const u = await Police.findById(req.user.id).lean();
  if (!u) return res.status(404).json({ success: false, message: "Not found" });
  delete u.password;
  res.json({ success: true, data: u });
};

// VERIFY TOKEN
exports.verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    let token = null;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Police.findById(decoded.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    delete user.password;

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
