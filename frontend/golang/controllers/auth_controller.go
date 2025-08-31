package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()

	ip := os.Getenv("IP_ADDRESS")
	port := os.Getenv("PORT")
	if ip == "" || port == "" {
		log.Fatal("❌ Variables IP_ADDRESS ou PORT_MONGO manquantes dans le .env")
	}

}

// Structure pour la réponse de l'API Node
type AuthResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
	Role    string `json:"role"`
	UserID  string `json:"user_id"` // ✅ important pour host_id
}

// Gère la page de connexion
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		tmpl, _ := template.ParseFiles("views/login.html")
		tmpl.Execute(w, nil)
		return
	}

	if err := r.ParseForm(); err != nil {
		showLoginError(w, "Erreur de soumission du formulaire")
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")

	// Création de la requête JSON vers l'API Node
	body := map[string]string{"email": email, "password": password}
	jsonBody, _ := json.Marshal(body)

	resp, err := http.Post(
		fmt.Sprintf("http://%s:%s/api/auth/login", os.Getenv("IP_ADDRESS"), os.Getenv("PORT")),
		"application/json",
		bytes.NewBuffer(jsonBody),
	)

	if err != nil || resp.StatusCode != http.StatusOK {
		showLoginError(w, "Connexion refusée par le serveur distant")
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var res AuthResponse
	if err := json.Unmarshal(respBody, &res); err != nil {
		showLoginError(w, "Erreur lors de la lecture de la réponse")
		return
	}

	if res.Role != "admin" && res.Role != "super_user" {
		showLoginError(w, "Accès refusé : vous n'êtes pas autorisé à accéder à cette interface")
		return
	}

	// Cookies sécurisés
	http.SetCookie(w, &http.Cookie{
		Name:     "session_role",
		Value:    res.Role,
		Path:     "/",
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "session_user_id",
		Value:    res.UserID,
		Path:     "/",
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    res.Token,
		Path:     "/",
		HttpOnly: true,
	})

	// Injection dans le dashboard
	tmpl, err := template.ParseFiles("views/dashboard.html")
	if err != nil {
		showLoginError(w, "Erreur d'affichage du dashboard")
		return
	}

	data := map[string]string{
		"Role":   res.Role,
		"Token":  res.Token,
		"UserID": res.UserID, // utile si tu veux le montrer dans la page HTML aussi
	}
	tmpl.Execute(w, data)
}

// Affiche une erreur de login
func showLoginError(w http.ResponseWriter, message string) {
	tmpl, _ := template.ParseFiles("views/login.html")
	tmpl.Execute(w, map[string]string{"Error": message})
}

// Gère la déconnexion
func Logout(w http.ResponseWriter, r *http.Request) {
	clearCookie := func(name string) {
		http.SetCookie(w, &http.Cookie{
			Name:   name,
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})
	}

	clearCookie("session_role")
	clearCookie("session_user_id")
	clearCookie("session_token")

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// Renvoie le rôle actuel de l'utilisateur
func WhoAmI(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_role")
	if err != nil {
		http.Error(w, "non-auth", http.StatusUnauthorized)
		return
	}
	w.Write([]byte(cookie.Value))
}
