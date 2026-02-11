package middleware

import (
	"github.com/areeeeeeeb/reLive/backend-go/database"
	"github.com/gin-gonic/gin"
)

func ResolveUser(store *database.Store) gin.HandlerFunc {
    return func(c *gin.Context) {
        auth0ID := c.GetString("auth0_id")
        if auth0ID == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "missing auth0_id in context"})
            return
        }

        user, err := store.GetUserByAuth0ID(c.Request.Context(), auth0ID)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "user not found"})
            return
        }

        c.Set("user_id", user.ID)
        // c.Set("user", user) // snapshot user at the time of middleware. could be stale. therefore not returning
        c.Next()
    }
}