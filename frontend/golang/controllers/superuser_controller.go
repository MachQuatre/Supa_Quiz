package controllers

import (
	"PageAdmin/config"
	"PageAdmin/models"
	"context"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
)

// Dashboard affiche l'interface super utilisateur
func Dashboard(w http.ResponseWriter, r *http.Request) {
	tmplPath := filepath.Join("views", "dashboard.html")

	tmpl, err := template.ParseFiles(tmplPath)
	if err != nil {
		log.Printf("Erreur lors du parsing du template : %v", err)
		http.Error(w, "Erreur interne (template)", http.StatusInternalServerError)
		return
	}

	// On peut injecter le nom d’utilisateur ici si souhaité
	username := "Super Utilisateur"
	if cookie, err := r.Cookie("session_email"); err == nil {
		username = cookie.Value
	}

	data := struct {
		Token    string
		UserName string
	}{
		Token:    "", // À remplir si nécessaire
		UserName: username,
	}

	err = tmpl.Execute(w, data)
	if err != nil {
		log.Printf("Erreur lors de l'exécution du template : %v", err)
		http.Error(w, "Erreur interne (rendu)", http.StatusInternalServerError)
		return
	}
}

// PromoteUser permet à un administrateur de promouvoir un utilisateur
func PromoteUser(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Erreur de formulaire", http.StatusBadRequest)
		return
	}

	currentUser := getCurrentUser(r)
	email := r.FormValue("email")

	if email == currentUser {
		http.Error(w, "❌ Vous ne pouvez pas vous promouvoir vous-même", http.StatusForbidden)
		return
	}

	collection := config.GetCollection("users")
	ctx := context.Background()

	var existing bson.M
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err != nil {
		http.Error(w, "❌ Utilisateur introuvable", http.StatusNotFound)
		return
	}

	role := existing["role"]
	if role == "admin" {
		http.Error(w, "❌ Vous ne pouvez pas modifier le rôle d'un administrateur", http.StatusForbidden)
		return
	}
	if role == "super_user" {
		http.Error(w, "❌ Cet utilisateur est déjà super utilisateur", http.StatusBadRequest)
		return
	}

	_, err = collection.UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"role": "super_user"}})
	if err != nil {
		http.Error(w, "❌ Erreur lors de la promotion", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("✅ Utilisateur promu avec succès"))
}

// DemoteUser permet à un admin de rétrograder un super_user
func DemoteUser(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Erreur de formulaire", http.StatusBadRequest)
		return
	}

	currentUser := getCurrentUser(r)
	email := r.FormValue("email")

	if email == currentUser {
		http.Error(w, "❌ Vous ne pouvez pas vous rétrograder vous-même", http.StatusForbidden)
		return
	}

	collection := config.GetCollection("users")
	ctx := context.Background()

	var existing bson.M
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err != nil {
		http.Error(w, "❌ Utilisateur introuvable", http.StatusNotFound)
		return
	}

	role := existing["role"]
	if role == "admin" {
		http.Error(w, "❌ Vous ne pouvez pas modifier le rôle d'un administrateur", http.StatusForbidden)
		return
	}
	if role == "user" {
		http.Error(w, "❌ Cet utilisateur est déjà user", http.StatusBadRequest)
		return
	}

	_, err = collection.UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"role": "user"}})
	if err != nil {
		http.Error(w, "❌ Erreur lors de la rétrogradation", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("🔻 Utilisateur rétrogradé avec succès"))
}

// CreateQuiz permet à un super utilisateur ou admin de créer un quiz
func CreateQuiz(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Erreur de formulaire", http.StatusBadRequest)
		return
	}

	title := r.FormValue("title")
	theme := r.FormValue("theme")
	difficulty := r.FormValue("difficulty")

	if title == "" || theme == "" || difficulty == "" {
		http.Error(w, "Tous les champs sont requis", http.StatusBadRequest)
		return
	}

	email := getCurrentUser(r)

	quiz := models.Quiz{
		QuizID:        uuid.New().String(),
		Title:         title,
		Theme:         theme,
		Difficulty:    difficulty,
		QuestionCount: 0,
		CreationDate:  time.Now(),
		CreatedBy:     email,
	}

	collection := config.GetCollection("quizzes")
	_, err := collection.InsertOne(context.Background(), quiz)
	if err != nil {
		http.Error(w, "Erreur enregistrement MongoDB", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// getCurrentUser récupère l'email depuis le cookie de session
func getCurrentUser(r *http.Request) string {
	cookie, err := r.Cookie("session_email")
	if err != nil {
		return "admin"
	}
	return cookie.Value
}
