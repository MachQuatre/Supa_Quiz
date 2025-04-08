package controllers

import (
	"html/template"
	"log"
	"net/http"
	"path/filepath"
)

// Dashboard affiche l'interface super utilisateur
func Dashboard(w http.ResponseWriter, r *http.Request) {
	// Chargement du template à partir du chemin relatif
	tmplPath := filepath.Join("views", "dashboard.html")

	tmpl, err := template.ParseFiles(tmplPath)
	if err != nil {
		log.Printf("Erreur lors du parsing du template : %v", err)
		http.Error(w, "Erreur interne (template)", http.StatusInternalServerError)
		return
	}

	// Tu peux passer des données ici si besoin (ex: nom de l'utilisateur)
	err = tmpl.Execute(w, nil)
	if err != nil {
		log.Printf("Erreur lors de l'exécution du template : %v", err)
		http.Error(w, "Erreur interne (rendu)", http.StatusInternalServerError)
		return
	}
}
