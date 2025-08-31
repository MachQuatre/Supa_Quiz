package controllers

import (
	"html/template"
	"net/http"
)

type TemplateData struct {
	Token  string
	UserID string
}

func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	// ✅ Récupération de l'ID utilisateur injecté via middleware
	userID := r.Context().Value("user_id")
	if userID == nil {
		http.Error(w, "Utilisateur non connecté", http.StatusUnauthorized)
		return
	}

	// ✅ Récupération du token via le cookie sécurisé
	tokenCookie, err := r.Cookie("session_token")
	if err != nil || tokenCookie.Value == "" {
		http.Error(w, "Token manquant", http.StatusUnauthorized)
		return
	}

	// ✅ Injection des données dans le template
	data := TemplateData{
		Token:  tokenCookie.Value,
		UserID: userID.(string),
	}

	tmpl, err := template.ParseFiles("views/dashboard.html")
	if err != nil {
		http.Error(w, "Erreur affichage page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, data)
}
