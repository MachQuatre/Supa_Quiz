package controllers

import (
	"context"
	"html/template"
	"net/http"

	"PageAdmin/config"
	"PageAdmin/models"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
)

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// Affiche le formulaire si ce n’est pas un POST (sécurité / fallback)
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

	var user models.User
	users := config.GetCollection("users")

	err := users.FindOne(context.Background(), bson.M{"email": email}).Decode(&user)
	if err != nil {
		showLoginError(w, "Utilisateur non trouvé")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		showLoginError(w, "Mot de passe incorrect")
		return
	}

	if user.Role != "admin" && user.Role != "super_user" {
		showLoginError(w, "Accès refusé")
		return
	}

	cookie := &http.Cookie{
		Name:  "session_role",
		Value: user.Role,
		Path:  "/",
	}
	http.SetCookie(w, cookie)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

func showLoginError(w http.ResponseWriter, message string) {
	tmpl, _ := template.ParseFiles("views/login.html")
	tmpl.Execute(w, map[string]string{"Error": message})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// Supprime le cookie
	cookie := &http.Cookie{
		Name:   "session_role",
		Value:  "",
		Path:   "/",
		MaxAge: -1, // Expire le cookie
	}
	http.SetCookie(w, cookie)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
