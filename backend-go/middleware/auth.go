package middleware

import (
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/areeeeeeeb/reLive/backend-go/config"
	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/auth0/go-jwt-middleware/v2/validator"
	"github.com/gin-gonic/gin"
)

func AuthRequired(auth0 config.Auth0Config) gin.HandlerFunc {
	domain := auth0.Domain
	audience := auth0.Audience

	issuerUrl, err := url.Parse("https://" + domain + "/")
	if err != nil {
		log.Fatalf("failed to parse issuer url: %v", err)
	}

	provider := jwks.NewCachingProvider(issuerUrl, 5*time.Minute)

	jwtValidator, err := validator.New(
		provider.KeyFunc,   // function that selects the correct Auth0 public key (by JWT header `kid`) from the cached JWKS
		validator.RS256,    // require RS256-signed tokens (Auth0 signs with private key; we verify with public key)
		issuerUrl.String(), // expected `iss` (issuer) claim; must match Auth0 domain URL
		[]string{audience}, // expected `aud` (audience) claim; must include your API identifier
		validator.WithAllowedClockSkew(time.Minute), // allow small clock differences when checking exp/nbf/iat
	)
	if err != nil {
		log.Fatalf("Failed to set up the jwt validator: %v", err)
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid Authorization header"})
			return
		}

		rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if rawToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}

		claimsAny, err := jwtValidator.ValidateToken(c.Request.Context(), rawToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		// now we can safely assume claims is *validator.ValidatedClaims
		claims, ok := claimsAny.(*validator.ValidatedClaims)
		if !ok || claims == nil {
			// we really shouldn't get here
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}

		auth0ID := claims.RegisteredClaims.Subject
		if auth0ID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token missing sub"})
			return
		}

		c.Set("auth0_id", auth0ID)

		c.Next()
	}
}
