package routes

import (
	"PageAdmin/controllers"
	"PageAdmin/middleware"
	"net/http"
)

func RegisterSuperUserRoutes() {
	http.HandleFunc("/dashboard", middleware.RequireSuperUserOrAdmin(controllers.Dashboard))
}
