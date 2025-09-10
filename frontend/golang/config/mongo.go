package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// petit utilitaire env avec valeur par défaut
func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

var (
	DB     *mongo.Database
	client *mongo.Client
	once   sync.Once
)

func init() {
	// Charge .env si présent (silencieux) — les vars Docker ont priorité
	_ = godotenv.Load()
}

// Connect initialise la connexion Mongo en privilégiant MONGO_URI/MONGO_DB
func Connect() {
	once.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// 1) URI prioritaire via MONGO_URI, sinon fallback IP_ADDRESS/PORT_MONGO
		uri := os.Getenv("MONGO_URI")
		if uri == "" {
			host := getenv("IP_ADDRESS", "mongo")
			port := getenv("PORT_MONGO", "27017")
			uri = fmt.Sprintf("mongodb://%s:%s/", host, port)
		}
		// 2) Nom de base (par défaut: quiz_app)
		dbName := getenv("MONGO_DB", "quiz_app")

		var err error
		client, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err != nil {
			log.Fatalf("❌ Erreur de connexion MongoDB : %v", err)
		}
		if err := client.Ping(ctx, nil); err != nil {
			log.Fatalf("❌ Impossible de pinger Mongo : %v", err)
		}

		DB = client.Database(dbName)
		log.Printf("✅ Connecté à MongoDB sur %s (base : %s)", uri, dbName)

		// Debug: liste des collections (non bloquant)
		if names, err := DB.ListCollectionNames(ctx, struct{}{}); err == nil {
			log.Printf("📂 Collections dans %s : %v", dbName, names)
		} else {
			log.Printf("⚠️ Impossible de lister les collections : %v", err)
		}
	})
}

// GetCollection retourne une collection spécifique
func GetCollection(name string) *mongo.Collection {
	if DB == nil {
		log.Fatal("MongoDB non initialisé : appelle config.Connect() d'abord")
	}
	return DB.Collection(name)
}

// Disconnect ferme proprement la connexion
func Disconnect() {
	if client == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Disconnect(ctx); err != nil {
		log.Printf("⚠️ Erreur lors de la fermeture de MongoDB : %v", err)
	} else {
		log.Println("✅ Connexion MongoDB fermée proprement")
	}
}
