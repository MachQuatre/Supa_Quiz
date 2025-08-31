package middleware

import (
	"context"
	"net/http"
)

func RequireSuperUserOrAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_role")
		if err != nil || (cookie.Value != "super_user" && cookie.Value != "admin") {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_role")
		if err != nil || cookie.Value != "admin" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func InjectUserID(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_user_id")
		if err != nil || cookie.Value == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", cookie.Value)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
