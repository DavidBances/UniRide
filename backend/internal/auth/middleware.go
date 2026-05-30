package auth

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
)

// Middleware returns a Gin handler that validates JWT Bearer tokens.
func Middleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authorizationHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		logger := slog.Default()

		if authorizationHeader == "" {
			logger.Info("missing authorization header", "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))
			httpx.AbortError(c, http.StatusUnauthorized, "missing_authorization_header", "missing authorization header", nil)
			return
		}

		parts := strings.SplitN(authorizationHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			logger.Info("invalid authorization header", "header", authorizationHeader, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))
			httpx.AbortError(c, http.StatusUnauthorized, "invalid_authorization_header", "invalid authorization header", nil)
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
			logger.Info("invalid token", "error", err, "path", c.FullPath(), "method", c.Request.Method, "request_id", c.GetString("requestID"))
			httpx.AbortError(c, http.StatusUnauthorized, "invalid_token", "invalid token", nil)
			return
		}

		c.Set("authUserID", tokenClaims.UserID)
		c.Set("authUsername", tokenClaims.Username)
		c.Set("authEmail", tokenClaims.Email)
		c.Next()
	}
}
