package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"PageAdmin/config"
	"PageAdmin/routes"
)

func main() {
	// Connexion Mongo
	config.Connect()
	defer config.Disconnect() // Fermeture propre

	// 💡 Enregistrement des routes
	routes.RegisterAuthRoutes()      // <-- Ajouté : login / logout
	routes.RegisterSuperUserRoutes() // dashboard

	// Fichiers statiques (JS, CSS...)
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Serveur HTTP
	server := &http.Server{Addr: ":8080"}

	// Gestion des signaux OS (CTRL+C)
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop

		log.Println("Arrêt du serveur...")
		if err := server.Close(); err != nil {
			log.Fatalf("Erreur lors de l'arrêt du serveur : %v", err)
		}
	}()

	log.Println("✅ Serveur démarré sur http://localhost:8080")
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Erreur du serveur : %v", err)
	}
}
