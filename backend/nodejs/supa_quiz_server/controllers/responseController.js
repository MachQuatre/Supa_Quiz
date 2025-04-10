const Response = require("../models/responseModel");
const crypto = require("crypto");

exports.submitResponse = async (req, res) => {
    try {
        const { session_id, question_id, user_response, is_correct, response_time } = req.body;

        const newResponse = new Response({
            response_id: crypto.randomUUID(),
            session_id,
            question_id,
            user_response,
            is_correct,
            response_time
        });

        await newResponse.save();
        res.status(201).json({ message: "Réponse enregistrée", response: newResponse });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};