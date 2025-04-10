const Session = require("../models/sessionModel");
const crypto = require("crypto");

exports.startSession = async (req, res) => {
    try {
        const { user_id, quiz_id } = req.body;

        const newSession = new Session({
            session_id: crypto.randomUUID(),
            user_id,
            quiz_id
        });

        await newSession.save();
        res.status(201).json({ message: "Session démarrée", session: newSession });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getUserSessions = async (req, res) => {
    try {
        const { user_id } = req.params;
        const sessions = await Session.find({ user_id });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};