package routes

import (
	"PageAdmin/controllers"
	"PageAdmin/middleware"
	"net/http"
)

func RegisterSuperUserRoutes(mux *http.ServeMux) {
	// Route vers le dashboard avec user_id injecté
	mux.HandleFunc("/dashboard",
		middleware.RequireSuperUserOrAdmin(
			middleware.InjectUserID(controllers.DashboardHandler),
		),
	)

	// Autres routes
	mux.HandleFunc("/promote-user", middleware.RequireAdmin(controllers.PromoteUser))
	mux.HandleFunc("/demote-user", middleware.RequireAdmin(controllers.DemoteUser))
	mux.HandleFunc("/create-quiz", middleware.RequireSuperUserOrAdmin(controllers.CreateQuiz))
}
