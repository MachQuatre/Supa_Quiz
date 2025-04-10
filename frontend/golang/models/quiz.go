package models

import "time"

type Quiz struct {
	QuizID        string    `bson:"quiz_id"`
	Title         string    `bson:"title"`
	Theme         string    `bson:"theme"`
	Difficulty    string    `bson:"difficulty"`
	QuestionCount int       `bson:"question_count"`
	CreationDate  time.Time `bson:"creation_date"`
	CreatedBy     string    `bson:"created_by"`
}
