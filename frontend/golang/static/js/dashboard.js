//const IP = "localhost";
//const PORT = "3000";
window.API_BASE = ""; // même origine (Nginx reverse-proxy sur /api)

function showSection(id) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.style.display = 'none');

    const selected = document.getElementById(id);
    if (selected) {
        selected.style.display = 'block';

        if (id === "add-quiz") {
            loadUserQuizzes();
        }

        if (id === "add-question") {
            loadUserQuizzesForQuestions();
            setupBulkQuestionUpload(); // ✅ Appelé correctement ici
        }

        if (id === "create-session") {
            loadQuizzesForSession();
            loadActiveSessions();
        }
    }
}


function loadUserQuizzes() {
    const token = document.getElementById("token")?.value;
    if (!token) return;

    fetch(`${window.API_BASE}/api/quiz/mine`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.querySelector("#quiz-table tbody");
        tbody.innerHTML = "";
        data.forEach(quiz => {
            const row = document.createElement("tr");
            row.dataset.quizId = quiz.quiz_id; // 🆕 utile pour les actions
            row.innerHTML = `
                <td>${quiz.title}</td>
                <td>${quiz.theme}</td>
                <td>${quiz.difficulty}</td>
                <td>${quiz.question_count}</td>
            `;
            tbody.appendChild(row);
        });
        attachQuizActionButtons(); // ✅ ajoute les boutons dynamiquement
    });
}

function loadUserQuizzesForQuestions() {
    const token = document.getElementById("token")?.value;
    if (!token) return;

    fetch(`${window.API_BASE}/api/quiz/mine`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const quizSelect1 = document.getElementById("quiz-select");
        const quizSelect2 = document.getElementById("quiz-id-bulk");

        if (!quizSelect1 || !quizSelect2) {
            console.warn("⚠️ Les éléments <select> ne sont pas encore disponibles.");
            return;
        }

        quizSelect1.innerHTML = '<option value="">-- Sélectionnez un questionnaire --</option>';
        quizSelect2.innerHTML = '<option value="">-- Sélectionnez un questionnaire --</option>';

        data.forEach(quiz => {
            const opt1 = document.createElement("option");
            opt1.value = quiz.quiz_id;
            opt1.textContent = quiz.title;
            quizSelect1.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = quiz.quiz_id;
            opt2.textContent = quiz.title;
            quizSelect2.appendChild(opt2);
        });
    })
    .catch(err => {
        console.error("❌ Erreur chargement des quiz :", err);
    });
}

function loadQuizzesForSession() {
    const token = document.getElementById("token")?.value;
    if (!token) return;

    fetch(`${window.API_BASE}/api/quiz/mine`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const sessionQuizSelect = document.getElementById("session-quiz-select");
        sessionQuizSelect.innerHTML = '<option value="">-- Choisissez un quiz --</option>';
        data.forEach(quiz => {
            const opt = document.createElement("option");
            opt.value = quiz.quiz_id;
            opt.textContent = quiz.title;
            sessionQuizSelect.appendChild(opt);
        });
    });
}

function loadActiveSessions() {
    const token = document.getElementById("token")?.value;
    if (!token) return;

    fetch(`${window.API_BASE}/api/game-sessions/active`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (!Array.isArray(data)) throw new Error("Réponse inattendue");

        const tbody = document.querySelector("#session-table tbody");
        tbody.innerHTML = "";

        data.forEach((session, index) => {
            const start = new Date(session.start_time);
            const formattedTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const timeLeftId = `time-left-${index}`; // identifiant unique par ligne
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${session.quiz_title}</td>
                <td>${session.code}</td>
                <td>${session.duration}</td>
                <td>${formattedTime}</td>
                <td id="${timeLeftId}">⏳</td>
                <td>${session.participants.join(", ")}</td>
            `;
            tbody.appendChild(row);

            // Lancer le compte à rebours dans le tableau
            startCountdownInTable(session.start_time, session.duration, timeLeftId, session.code);

        });
    })
    .catch(err => {
        console.error("❌ Erreur chargement sessions :", err);
    });
}


function startCountdown(durationMinutes) {
    const countdownEl = document.getElementById("countdown");
    let timeLeft = durationMinutes * 60;

    const interval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        countdownEl.textContent = minutes;

        if (--timeLeft < 0) {
            clearInterval(interval);
            countdownEl.textContent = "⛔ Session expirée";
            loadUserQuizzes();
        }
    }, 60000);
}

function startCountdownInTable(startTimeISO, durationMinutes, elementId, sessionCode) {
    const endTime = new Date(startTimeISO).getTime() + durationMinutes * 60000;
    let timer; // ✅ déclaration au bon endroit AVANT la fonction interne

    function updateCountdown() {
        const now = Date.now();
        const timeLeft = Math.max(endTime - now, 0); // en ms

        const totalSec = Math.ceil(timeLeft / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;

        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = timeLeft > 0
                ? `${minutes}m ${seconds < 10 ? "0" + seconds : seconds}s`
                : "⛔ Terminé";
        }

        if (timeLeft <= 0) {
            clearInterval(timer); // ✅ maintenant reconnu
            closeSession(sessionCode);
        }
    }

    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
}



document.addEventListener("DOMContentLoaded", () => {
    const token = document.getElementById("token")?.value;

    const quizForm = document.getElementById("create-quiz-form");
    if (quizForm) {
        quizForm.addEventListener("submit", e => {
            e.preventDefault();
            const formData = new FormData(quizForm);
            const payload = {
                title: formData.get("title"),
                theme: formData.get("theme"),
                difficulty: formData.get("difficulty"),
                questions: []
            };

            fetch(`${window.API_BASE}/api/quiz`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(() => {
                alert("✅ Questionnaire ajouté !");
                quizForm.reset();
                loadUserQuizzes();
            });
        });
    }

    const questionForm = document.getElementById("add-question-form");
    if (questionForm) {
        questionForm.addEventListener("submit", e => {
            e.preventDefault();

            const formData = new FormData(questionForm);
            const answer_options = [
                formData.get("answerA"),
                formData.get("answerB"),
                formData.get("answerC"),
                formData.get("answerD")
            ];

            const payload = {
                quiz_id: formData.get("quiz_id"),
                question_text: formData.get("question_text"),
                theme: formData.get("theme"),
                difficulty: formData.get("difficulty"),
                correct_answer: formData.get("correct_answer"),
                answer_options
            };

            fetch(`${window.API_BASE}/api/questions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(() => {
                alert("✅ Question ajoutée !");
                questionForm.reset();
                loadUserQuizzes();
            });
        });
    }

    const sessionForm = document.getElementById("create-session-form");
    if (sessionForm) {
        sessionForm.addEventListener("submit", async e => {
            e.preventDefault();

            const token = document.getElementById("token")?.value;
            if (!token) return;

            try {
                const userRes = await fetch(`${window.API_BASE}/api/auth/me`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (!userRes.ok) throw new Error("Impossible de récupérer l'utilisateur");

                const userData = await userRes.json();
                const hostId = userData.user_id;

                const formData = new FormData(sessionForm);
                const rawDuration = formData.get("duration_minutes");
                console.log("⏱️ DEBUG durée reçue depuis formulaire :", rawDuration);

                const parsedDuration = parseInt(rawDuration, 10);

                // ❌ Si vide, null ou non numérique, on bloque la session
                if (!parsedDuration || isNaN(parsedDuration)) {
                    alert("❌ Veuillez renseigner une durée valide pour la session.");
                    return;
                }

                const payload = {
                    quiz_id: formData.get("quiz_id"),
                    duration_minutes: parsedDuration,
                    host_id: hostId
                };

                const res = await fetch(`${window.API_BASE}/api/game-sessions`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("Erreur lors de la création de session");

                const data = await res.json();

                loadActiveSessions(); // 🔁 met à jour le tableau immédiatement
            } catch (err) {
                console.error("❌ Erreur de session :", err);
                alert("Erreur lors de la création de la session.");
            }
        });
    }

    fetch("/whoami")
        .then(res => res.text())
        .then(role => {
            if (role === "admin") {
                const promoteBtn = document.getElementById("btn-promote");
                if (promoteBtn) promoteBtn.style.display = "inline-block";
            }
        });
});

function startCountdownInTable(startTimeISO, durationMinutes, elementId, sessionCode) {
    const endTime = new Date(startTimeISO).getTime() + durationMinutes * 60000;
    let timer = null;

    function updateCountdown() {
        const now = Date.now();
        const timeLeft = Math.max(endTime - now, 0);
        const totalSec = Math.ceil(timeLeft / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;

        const el = document.getElementById(elementId);

        if (el) {
            el.textContent = timeLeft > 0
                ? `${minutes}m ${seconds < 10 ? "0" + seconds : seconds}s`
                : "⛔ Terminé";
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            console.log("🛑 Compte à rebours terminé. Fermeture de la session...");
            closeSession(sessionCode);
        }
    }

    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
}




function closeSession(sessionCode) {
    const token = document.getElementById("token")?.value;
    if (!token) return;

    fetch(`${window.API_BASE}/api/game-sessions/${sessionCode}/end`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(async res => {
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erreur HTTP ${res.status} : ${errorText}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("🛑 Session désactivée automatiquement :", data);
        loadActiveSessions();
    })
    .catch(err => {
        console.error("❌ Échec désactivation session :", err.message);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const token = document.getElementById("token")?.value;
    const userNameSpan = document.getElementById("user-name");

    if (token && userNameSpan) {
        fetch(`${window.API_BASE}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
            if (user && user.username) {
                userNameSpan.textContent = user.username;
            }
        })
        .catch(err => {
            console.warn("❌ Erreur récupération nom utilisateur :", err);
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const promoteForm = document.getElementById("promote-form");
    const demoteForm = document.getElementById("demote-form");

    if (promoteForm) {
        promoteForm.addEventListener("submit", async e => {
            e.preventDefault();
            const email = promoteForm.querySelector("input[name='email']").value;
            const msgDiv = document.getElementById("promote-message");

            const res = await fetch("/promote-user", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `email=${encodeURIComponent(email)}`
            });

            const text = await res.text();
            msgDiv.textContent = text;
            msgDiv.style.color = res.ok ? "green" : "red";
        });
    }

    if (demoteForm) {
        demoteForm.addEventListener("submit", async e => {
            e.preventDefault();
            const email = demoteForm.querySelector("input[name='email']").value;
            const msgDiv = document.getElementById("demote-message");

            const res = await fetch("/demote-user", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `email=${encodeURIComponent(email)}`
            });

            const text = await res.text();
            msgDiv.textContent = text;
            msgDiv.style.color = res.ok ? "green" : "red";
        });
    }
});
