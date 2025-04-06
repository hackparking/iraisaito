const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// 静的ファイル提供（index.htmlなど）
app.use(express.static(path.join(__dirname, "public")));

// Discordログイン
app.get("/login", (req, res) => {
  const redirectURL = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(redirectURL);
});

// DiscordのOAuth2コールバック
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const params = new URLSearchParams();
  params.append("client_id", process.env.DISCORD_CLIENT_ID);
  params.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", process.env.DISCORD_REDIRECT_URI);
  params.append("scope", "identify");

  try {
    const tokenRes = await axios.post("https://discord.com/api/oauth2/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenRes.data.access_token}`
      }
    });

    req.session.user = userRes.data;
    res.redirect("/"); // 認証後はフロントに戻す
  } catch (err) {
    res.status(500).send("認証に失敗しました");
  }
});

// ログインユーザー情報取得
app.get("/profile", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "未ログイン" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ サーバー起動中: http://localhost:${PORT}`);
});
