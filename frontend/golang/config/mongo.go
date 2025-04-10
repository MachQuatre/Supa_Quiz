package config

import (
	"context"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	DB     *mongo.Database
	once   sync.Once
	client *mongo.Client
)

// Connect initialise la connexion à MongoDB et vérifie la base QuizDev
func Connect() {
	once.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		clientOptions := options.Client().ApplyURI("mongodb://10.9.11.14:27017") // IP Mongo interne
		var err error
		client, err = mongo.Connect(ctx, clientOptions)
		if err != nil {
			log.Fatalf("❌ Erreur de connexion MongoDB : %v", err)
		}

		err = client.Ping(ctx, nil)
		if err != nil {
			log.Fatalf("❌ Impossible de pinger Mongo : %v", err)
		}

		// Connexion à la base QuizDev
		dbName := "QuizDev"
		DB = client.Database(dbName)

		log.Printf("✅ Connecté à MongoDB sur %s (base : %s)", clientOptions.GetURI(), dbName)

		// 🎁 Affiche les collections disponibles (pour debug)
		collections, err := DB.ListCollectionNames(ctx, struct{}{})
		if err != nil {
			log.Printf("⚠️ Impossible de lister les collections : %v", err)
		} else {
			log.Printf("📂 Collections dans QuizDev : %v", collections)
		}
	})
}

// GetCollection retourne une collection spécifique de la base de données
func GetCollection(name string) *mongo.Collection {
	return DB.Collection(name)
}

// Disconnect ferme la connexion au client MongoDB
func Disconnect() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Disconnect(ctx); err != nil {
		log.Fatalf("❌ Erreur lors de la fermeture de la connexion MongoDB : %v", err)
	}
	log.Println("✅ Connexion MongoDB fermée proprement")
}
