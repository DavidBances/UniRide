package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Middleware returns a Gin handler that validates JWT Bearer tokens.
func Middleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authorizationHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authorizationHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		parts := strings.SplitN(authorizationHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
			return
		}

		tokenClaims := &claims{}
		token, err := jwt.ParseWithClaims(
			strings.TrimSpace(parts[1]),
			tokenClaims,
			func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %T", t.Method)
				}

				return []byte(jwtSecret), nil
			},
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		)
		if err != nil || token == nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("authUserID", tokenClaims.UserID)
		c.Set("authUsername", tokenClaims.Username)
		c.Set("authEmail", tokenClaims.Email)
		c.Next()
	}
}
