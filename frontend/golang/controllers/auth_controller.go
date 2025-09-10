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
	// Charge .env si présent, mais ne crash pas si des variables manquent :
	// on mettra des valeurs par défaut côté code.
	_ = godotenv.Load()

	if os.Getenv("BACKEND_HOST") == "" || os.Getenv("BACKEND_PORT") == "" {
		log.Println("⚠️  BACKEND_HOST/BACKEND_PORT non définis - utilisation des valeurs par défaut (localhost:3000)")
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

	// 👉 Cible désormais le backend Node via BACKEND_HOST/BACKEND_PORT
	backendHost := os.Getenv("BACKEND_HOST")
	if backendHost == "" {
		backendHost = "localhost"
	}
	backendPort := os.Getenv("BACKEND_PORT")
	if backendPort == "" {
		backendPort = "3000"
	}

	resp, err := http.Post(
		fmt.Sprintf("http://%s:%s/api/auth/login", backendHost, backendPort),
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		log.Printf("login: erreur d'appel API: %v", err)
		showLoginError(w, "Connexion refusée par le serveur distant")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Lis le corps pour un éventuel message d'erreur côté API
		b, _ := io.ReadAll(resp.Body)
		log.Printf("login: status=%d body=%s", resp.StatusCode, string(b))
		showLoginError(w, "Identifiants invalides ou accès refusé")
		return
	}

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
