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

	err = tmpl.Execute(w, nil)
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

	email := r.FormValue("email")
	collection := config.GetCollection("users")
	ctx := context.Background()

	filter := bson.M{"email": email}
	update := bson.M{"$set": bson.M{"role": "super_user"}}

	res, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("Erreur MongoDB lors de la promotion : %v", err)
		http.Error(w, "❌ Erreur lors de la promotion", http.StatusInternalServerError)
		return
	}

	if res.MatchedCount == 0 {
		http.Error(w, "❌ Aucun utilisateur trouvé avec cet email", http.StatusNotFound)
		return
	}

	log.Printf("✅ Utilisateur %s promu avec succès", email)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// DemoteUser permet à un admin de rétrograder un super_user
func DemoteUser(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Erreur de formulaire", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	collection := config.GetCollection("users")
	ctx := context.Background()

	filter := bson.M{"email": email, "role": "super_user"} // Vérifie qu'on rétrograde bien un super_user
	update := bson.M{"$set": bson.M{"role": "user"}}

	res, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("Erreur MongoDB rétrogradation : %v", err)
		http.Error(w, "❌ Erreur MongoDB", http.StatusInternalServerError)
		return
	}

	if res.MatchedCount == 0 {
		http.Error(w, "❌ Aucun super_user trouvé avec cet email", http.StatusNotFound)
		return
	}

	log.Printf("🔻 Utilisateur %s rétrogradé à 'user'", email)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
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

	// Si tu stockes aussi l’email dans un cookie (sinon remplacer par "admin")
	email := "admin"
	emailCookie, err := r.Cookie("session_email")
	if err == nil {
		email = emailCookie.Value
	}

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
	_, err = collection.InsertOne(context.Background(), quiz)
	if err != nil {
		http.Error(w, "Erreur enregistrement MongoDB", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}
