package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// DevAuthBypass injects auth0_id in local development so protected routes can
// be hit without obtaining a real JWT.
func DevAuthBypass(defaultAuth0ID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("auth0_id", strings.TrimSpace(defaultAuth0ID))
		c.Next()
	}
}
