const path = require("path");
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const responseRoutes = require("./routes/responseRoutes");
const questionRoutes = require("./routes/questionRoutes");
const gameSessionRoutes = require("./routes/gameSessionRoutes");
const userSessionRoutes = require("./routes/userSessionRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
app.use(express.json());

connectDB();

app.use(cookieParser()); // ← obligatoire AVANT d'utiliser le middleware auth
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true,
}));
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/questions", questionRoutes);
app.use('/api/game-sessions', gameSessionRoutes);
app.use('/api/user-sessions', userSessionRoutes);
app.use('/api/import', require('./routes/importRoutes'));
app.use("/api/badges", badgeRoutes);
app.use("/api/leaderboards", require("./routes/leaderboardRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/themes", require("./routes/themeRoutes"));
app.use("/api/questionnaires", require("./routes/questionnaireRoutes"));
app.use("/api/thematic-sessions", require("./routes/thematiqueUserSessionRoutes"));
app.use("/api/ai", aiRoutes);
app.use(express.static(path.join(__dirname, "public")));
app.use('/api/training', require('./routes/trainingRoutes'));

const PORT = process.env.PORT || 3000;
app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));