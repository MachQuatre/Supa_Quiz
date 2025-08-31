package routes

import (
	"PageAdmin/controllers"
	"net/http"
)

func RegisterAuthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/login", controllers.Login)
	mux.HandleFunc("/logout", controllers.Logout)
	mux.HandleFunc("/whoami", controllers.WhoAmI)
}
