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
	// Connexion MongoDB
	config.Connect()
	defer config.Disconnect()

	// Serveur HTTP avec ServeMux
	mux := http.NewServeMux()

	// 🔧 Enregistrement des routes sur le mux
	routes.RegisterAuthRoutes(mux)
	routes.RegisterSuperUserRoutes(mux)

	// 🧾 Fichiers statiques (JS, CSS...)
	fs := http.FileServer(http.Dir("static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Serveur HTTP attaché au mux
	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	// 🔌 Gestion du CTRL+C / SIGTERM
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop

		log.Println("🛑 Arrêt du serveur...")
		if err := server.Close(); err != nil {
			log.Fatalf("Erreur à l'arrêt : %v", err)
		}
	}()

	log.Println("✅ Serveur lancé sur http://localhost:8080")
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Erreur serveur : %v", err)
	}
}
