require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const responseRoutes = require("./routes/responseRoutes");
const questionRoutes = require("./routes/questionRoutes");

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
app.use("/api/sessions", sessionRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quiz", quizRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));