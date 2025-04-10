function showSection(id) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.style.display = 'none');

    const selected = document.getElementById(id);
    if (selected) {
        selected.style.display = 'block';

        // Charger dynamiquement les quizzes si on affiche la section correspondante
        if (id === "add-quiz") {
            loadUserQuizzes();
        }
    }
}

function loadUserQuizzes() {
    const token = document.getElementById("token")?.value;

    if (!token) {
        console.error("❌ Aucun token trouvé dans le DOM !");
        return;
    }

    console.log("🧪 Token injecté côté JS :", token); // ✅ debug visuel

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
        console.error("❌ Erreur lors du chargement des quizzes :", err);
    });
}

// ✅ Initialisation au chargement de la page
window.addEventListener("DOMContentLoaded", () => {
    fetch("/whoami")
        .then(res => res.text())
        .then(role => {
            if (role === "admin") {
                const promoteBtn = document.getElementById("btn-promote");
                if (promoteBtn) {
                    promoteBtn.style.display = "inline-block";
                }
            }
        });
});
