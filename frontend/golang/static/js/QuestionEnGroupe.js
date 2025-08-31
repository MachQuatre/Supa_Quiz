// QuestionEnGroupe.js

function getAuthToken() {
    return document.getElementById("token")?.value;
}

// ✅ Gère l’envoi d’un fichier JSON contenant plusieurs questions
function setupBulkQuestionUpload() {
    const uploadForm = document.getElementById("bulk-question-form");
    const fileInput = document.getElementById("json-file");
    const submitButton = uploadForm.querySelector("button[type='submit']");

    if (!uploadForm || !fileInput || !submitButton) {
        console.warn("⚠️ Formulaire, input ou bouton manquant dans le DOM.");
        return;
    }

    uploadForm.addEventListener("submit", async e => {
        e.preventDefault();

        const token = document.getElementById("token")?.value;
        const quizId = document.getElementById("quiz-id-bulk")?.value;

        // Sécurité 1 : empêche double clic
        submitButton.disabled = true;

        if (!token) {
            alert("🔒 Token manquant.");
            submitButton.disabled = false;
            return;
        }

        if (!quizId) {
            alert("❌ Sélectionnez d'abord un questionnaire !");
            submitButton.disabled = false;
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            alert("❌ Aucun fichier sélectionné.");
            submitButton.disabled = false;
            return;
        }

        // Sécurité 2 : vider le champ fichier pour éviter envoi multiple
        fileInput.value = "";

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const json = JSON.parse(event.target.result);

                if (!json.questions || !Array.isArray(json.questions)) {
                    throw new Error("Le fichier JSON doit contenir un champ 'questions' (tableau).");
                }

                for (const q of json.questions) {
                    if (!q.content || !q.options || !q.answer) {
                        throw new Error("Chaque question doit contenir 'content', 'options' et 'answer'.");
                    }

                    const payload = {
                        quiz_id: quizId,
                        question_text: q.content,
                        theme: q.theme || "général",
                        difficulty: q.difficulty || "moyen",
                        correct_answer: ["A", "B", "C", "D"][q.answer - 1],
                        answer_options: q.options
                    };

                    const res = await fetch(`http://${IP}:${PORT}/api/questions`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errMsg = await res.text();
                        throw new Error(`❌ Erreur ajout question: ${errMsg}`);
                    }
                }

                alert("✅ Toutes les questions ont été ajoutées avec succès !");
            } catch (err) {
                console.error("❌ Erreur import JSON:", err);
                alert("Erreur lors de l'importation : " + err.message);
            } finally {
                // Réactivation du bouton après traitement
                submitButton.disabled = false;
            }
        };

        reader.readAsText(file);
    });
}
