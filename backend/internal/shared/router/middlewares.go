package router

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isw2-unileon/proyect-scaffolding/backend/internal/shared/httpx"
)

func requestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := strings.TrimSpace(c.GetHeader("X-Request-ID"))
		if requestID == "" {
			requestID = newRequestID()
		}

		c.Set("requestID", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)
		c.Next()
	}
}

func recoveryMiddleware(logger *slog.Logger) gin.HandlerFunc {
	if logger == nil {
		logger = slog.Default()
	}

	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		// Capture stack for debugging/monitoring systems.
		stack := debug.Stack()

		logger.Error("panic recovered",
			"error", recovered,
			"stack", string(stack),
			"method", c.Request.Method,
			"path", c.FullPath(),
			"status", http.StatusInternalServerError,
			"request_id", c.GetString("requestID"),
		)

		httpx.AbortError(c, http.StatusInternalServerError, "internal_server_error", "internal server error", nil)
	})
}

func newRequestID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("req-%d", time.Now().UnixNano())
	}

	return hex.EncodeToString(buffer)
}
