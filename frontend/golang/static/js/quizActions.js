// quizActions.js

// Utilise les variables globales déclarées dans dashboard.js
// IP, PORT et getAuthToken()

function getAuthToken() {
    return document.getElementById("token")?.value;
}

function attachQuizActionButtons() {
    const rows = document.querySelectorAll("#quiz-table tbody tr");
    rows.forEach(row => {
        const title = row.children[0]?.textContent;
        const quizId = row.dataset.quizId;

        const actionsCell = document.createElement("td");
        const openBtn = document.createElement("button");
        openBtn.textContent = "🔒 Ouvrir";
        openBtn.onclick = () => openQuizDetails(quizId, title);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️ Supprimer";
        deleteBtn.onclick = () => confirmDeleteQuiz(quizId, title);

        actionsCell.appendChild(openBtn);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
    });
}

function openQuizDetails(quizId, title) {
    const token = getAuthToken();
    if (!token || !quizId) return;

    fetch(`http://${IP}:${PORT}/api/quiz/${quizId}/questions`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById("question-list");
        const titleSpan = document.getElementById("selected-quiz-title");
        list.innerHTML = "";
        titleSpan.textContent = title;

        const questions = data.questions || [];

        questions.forEach(q => {
            const item = document.createElement("li");
            item.innerHTML = `
                <strong>❓ ${q.question_text}</strong><br>
                ${q.answer_options.map(opt => `- ${opt}`).join("<br>")}
                <br>✅ Bonne réponse : ${q.correct_answer}
                <br>🎯 Thème : ${q.theme} | 📈 Difficulté : ${q.difficulty}
                <br><button onclick="confirmDeleteQuestion('${q.question_id}', '${q.question_text}', '${quizId}')">🗑️ Supprimer la question</button>
                <hr>`;
            list.appendChild(item);
        });

        document.getElementById("quiz-details").style.display = "block";
    })
    .catch(err => {
        console.error("❌ Erreur chargement questions :", err);
        alert("Erreur lors du chargement des questions.");
    });
}

function confirmDeleteQuiz(quizId, title) {
    if (!confirm(`⚠️ Voulez-vous vraiment supprimer le quiz : ${title} ?`)) return;

    const token = getAuthToken();
    if (!token) return;

    fetch(`http://${IP}:${PORT}/api/quiz/${quizId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(() => {
        alert("📍 Quiz supprimé avec succès.");
        loadUserQuizzes();
    })
    .catch(err => {
        console.error("❌ Suppression quiz échouée :", err);
        alert("Erreur lors de la suppression.");
    });
}

function confirmDeleteQuestion(questionId, questionText, quizId) {
    if (!confirm(`⚠️ Supprimer la question : "${questionText}" ?`)) return;

    const token = getAuthToken();
    if (!token) return;

    fetch(`http://${IP}:${PORT}/api/quiz/${quizId}/questions/${questionId}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(async res => {
        if (!res.ok) {
            const errMsg = await res.text();
            throw new Error(errMsg);
        }
        return res.json();
    })
    .then(() => {
        alert("🔌 Question supprimée !");
        document.getElementById("quiz-details").style.display = "none";
        loadUserQuizzes();
    })
    .catch(err => {
        console.error("❌ Suppression question :", err);
        alert("Erreur suppression question");
    });
}

