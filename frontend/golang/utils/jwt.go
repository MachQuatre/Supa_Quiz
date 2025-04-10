package utils

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v4"
)

// JwtSecret doit être exactement le même que celui utilisé dans le backend Node.js
var JwtSecret = []byte("votre_secret_commun_avec_Node") // À remplacer par ta vraie clé

// DecodeJWT vérifie, décode et retourne les claims d’un token JWT
func DecodeJWT(tokenStr string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// On vérifie que la méthode de signature est bien HMAC (ex: HS256)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("méthode de signature inattendue : %v", token.Header["alg"])
		}
		return JwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("échec de parsing du token : %w", err)
	}

	// Vérifie que le token est bien valide
	if !token.Valid {
		return nil, errors.New("token non valide")
	}

	// Extraction des claims (données contenues dans le token)
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}

	return nil, errors.New("échec d’extraction des claims")
}
