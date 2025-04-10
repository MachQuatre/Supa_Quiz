package controllers

import (
	"bytes"
	"encoding/json"
	"html/template"
	"io"
	"net/http"
)

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tmpl, _ := template.ParseFiles("views/login.html")
		tmpl.Execute(w, nil)
		return
	}

	if err := r.ParseForm(); err != nil {
		showLoginError(w, "Erreur formulaire")
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")

	// Envoi des identifiants à l’API Node
	body := map[string]string{"email": email, "password": password}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post("http://10.9.11.14:3000/api/auth/login", "application/json", bytes.NewBuffer(jsonBody))
	if err != nil || resp.StatusCode != http.StatusOK {
		showLoginError(w, "Connexion refusée")
		return
	}
	defer resp.Body.Close()

	// Lecture de la réponse JSON
	respBody, _ := io.ReadAll(resp.Body)
	var res struct {
		Message string `json:"message"`
		Token   string `json:"token"`
		Role    string `json:"role"`
	}
	if err := json.Unmarshal(respBody, &res); err != nil {
		showLoginError(w, "Erreur lecture réponse")
		return
	}

	// Sécurité : accès réservé à super_user ou admin
	if res.Role != "admin" && res.Role != "super_user" {
		showLoginError(w, "Accès refusé : rôle insuffisant")
		return
	}

	// Seul le rôle est stocké côté serveur
	http.SetCookie(w, &http.Cookie{
		Name:     "session_role",
		Value:    res.Role,
		Path:     "/",
		HttpOnly: true,
	})

	// Injecte le token dans la page HTML via un champ caché (pour JS)
	tmpl, err := template.ParseFiles("views/dashboard.html")
	if err != nil {
		showLoginError(w, "Erreur template dashboard")
		return
	}

	data := map[string]string{
		"Role":  res.Role,
		"Token": res.Token, // 🔐 transmis au JS via un champ caché ou script
	}
	tmpl.Execute(w, data)
}

func showLoginError(w http.ResponseWriter, message string) {
	tmpl, _ := template.ParseFiles("views/login.html")
	tmpl.Execute(w, map[string]string{"Error": message})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// Supprime le cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "session_role",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func WhoAmI(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_role")
	if err != nil {
		http.Error(w, "non-auth", http.StatusUnauthorized)
		return
	}
	w.Write([]byte(cookie.Value))
}
