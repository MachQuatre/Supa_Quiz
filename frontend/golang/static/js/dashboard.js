function showSection(id) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.style.display = 'none');

    const selected = document.getElementById(id);
    if (selected) {
        selected.style.display = 'block';

        if (id === "add-quiz") {
            loadUserQuizzes();
        } else if (id === "add-question") {
            loadUserQuizzesForQuestions();
        }
    }
}

// 🔁 Remplit le tableau avec les questionnaires existants
function loadUserQuizzes() {
    const token = document.getElementById("token")?.value;
    if (!token) return console.error("❌ Token manquant");

    fetch("http://10.9.11.14:3000/api/quiz/mine", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Non autorisé");
        return res.json();
    })
    .then(data => {
        const tbody = document.querySelector("#quiz-table tbody");
        tbody.innerHTML = "";
        data.forEach(quiz => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${quiz.title}</td>
                <td>${quiz.theme}</td>
                <td>${quiz.difficulty}</td>
                <td>${quiz.question_count}</td>
            `;
            tbody.appendChild(row);
        });
    })
    .catch(err => {
        console.error("❌ Erreur chargement quiz :", err);
    });
}

// 🔁 Remplit la liste déroulante pour la sélection d’un quiz dans "Ajouter une Question"
function loadUserQuizzesForQuestions() {
    const token = document.getElementById("token")?.value;
    if (!token) return console.error("❌ Token manquant");

    fetch("http://10.9.11.14:3000/api/quiz/mine", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(res => res.json())
    .then(data => {
        const quizSelect = document.getElementById("quiz-select");
        quizSelect.innerHTML = '<option value="">-- Sélectionnez un questionnaire --</option>';
        data.forEach(quiz => {
            const option = document.createElement("option");
            option.value = quiz.quiz_id;
            option.textContent = quiz.title;
            quizSelect.appendChild(option);
        });
    })
    .catch(err => {
        console.error("❌ Erreur chargement quiz pour question :", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // ✅ Formulaire pour créer un questionnaire
    const quizForm = document.getElementById("create-quiz-form");
    if (quizForm) {
        quizForm.addEventListener("submit", function(e) {
            e.preventDefault();  // Empêche le rechargement de la page

            const token = document.getElementById("token")?.value;
            if (!token) return console.error("❌ Token manquant");

            const formData = new FormData(quizForm);
            const quizData = {
                title: formData.get("title"),
                theme: formData.get("theme"),
                difficulty: formData.get("difficulty"),
                questions: []  // Optionnel pour l'instant
            };

            fetch("http://10.9.11.14:3000/api/quiz", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(quizData)
            })
            .then(res => {
                if (!res.ok) throw new Error("Erreur ajout quiz");
                return res.json();
            })
            .then(() => {
                alert("✅ Questionnaire ajouté !");
                quizForm.reset();
                loadUserQuizzes();
            })
            .catch(err => {
                console.error("❌ Problème ajout quiz :", err);
            });
        });
    }

        // ✅ Formulaire pour ajouter une question à un quiz
    const questionForm = document.getElementById("add-question-form");
    if (questionForm) {
        questionForm.addEventListener("submit", function(e) {
            e.preventDefault();  // Empêche la soumission classique

            const token = document.getElementById("token")?.value;
            if (!token) return console.error("❌ Token manquant");

            const formData = new FormData(questionForm);

            // 🧠 Construction explicite du tableau de réponses
            const answer_options = [
                formData.get("answerA"),
                formData.get("answerB"),
                formData.get("answerC"),
                formData.get("answerD")
            ];

            // 🔍 Vérification rapide
            if (answer_options.some(opt => !opt || opt.trim() === "")) {
                alert("⚠️ Toutes les réponses doivent être remplies.");
                return;
            }

            const questionData = {
                quiz_id: formData.get("quiz_id"),
                question_text: formData.get("question_text"),
                theme: formData.get("theme"),
                difficulty: formData.get("difficulty"),
                correct_answer: formData.get("correct_answer"),
                answer_options
            };

            fetch("http://10.9.11.14:3000/api/questions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(questionData)
            })
            .then(res => {
                if (!res.ok) throw new Error("Erreur ajout question");
                return res.json();
            })
            .then(() => {
                alert("✅ Question ajoutée !");
                questionForm.reset();
                loadUserQuizzes();
            })
            .catch(err => {
                console.error("❌ Problème ajout question :", err);
            });
        });
    }
    // 🔍 Vérifie le rôle de l'utilisateur et affiche les outils d'admin si besoin
    fetch("/whoami")
        .then(res => res.text())
        .then(role => {
            if (role === "admin") {
                const promoteBtn = document.getElementById("btn-promote");
                if (promoteBtn) promoteBtn.style.display = "inline-block";
            }
        });
});
