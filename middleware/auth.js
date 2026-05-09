const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "ptfindia_secret_change_in_production";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — no token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }
}

module.exports = { authMiddleware, SECRET };
