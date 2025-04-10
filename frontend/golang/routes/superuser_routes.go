package routes

import (
	"PageAdmin/controllers"
	"PageAdmin/middleware"
	"net/http"
)

func RegisterSuperUserRoutes() {
	http.HandleFunc("/dashboard", middleware.RequireSuperUserOrAdmin(controllers.Dashboard))
	http.HandleFunc("/promote-user", middleware.RequireAdmin(controllers.PromoteUser))
	http.HandleFunc("/demote-user", middleware.RequireAdmin(controllers.DemoteUser))
	http.HandleFunc("/create-quiz", middleware.RequireSuperUserOrAdmin(controllers.CreateQuiz))
}
