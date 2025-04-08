package models

type User struct {
	UserID     string `bson:"user_id"`
	Username   string `bson:"username"`
	Email      string `bson:"email"`
	Password   string `bson:"password"` // <- c’est ce champ qui manquait
	Role       string `bson:"role"`
	ScoreTotal int    `bson:"score_total"`
}
