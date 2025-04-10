package routes

import (
	"PageAdmin/controllers"
	"net/http"
)

func RegisterAuthRoutes() {
	http.HandleFunc("/login", controllers.Login)
	http.HandleFunc("/logout", controllers.Logout)
	http.HandleFunc("/whoami", controllers.WhoAmI)

}
