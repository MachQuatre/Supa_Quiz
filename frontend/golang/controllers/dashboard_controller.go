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
	// user_id injecté par le middleware
	userID := r.Context().Value("user_id")
	if userID == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// ⚠️ Le cookie posé au login s'appelle "session_token"
	tokenCookie, err := r.Cookie("session_token")
	if err != nil || tokenCookie.Value == "" {
		// Par sécurité, on retente avec "token" si de vieilles versions existent
		if legacy, err2 := r.Cookie("token"); err2 == nil && legacy.Value != "" {
			tokenCookie = legacy
		} else {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
	}

	data := TemplateData{
		Token:  tokenCookie.Value,
		UserID: userID.(string),
	}

	tmpl, err := template.ParseFiles("views/dashboard.html")
	if err != nil {
		http.Error(w, "Erreur affichage page", http.StatusInternalServerError)
		return
	}
	_ = tmpl.Execute(w, data)
}
