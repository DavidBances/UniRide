package httpx

import "github.com/gin-gonic/gin"

// Success sends a standardized success response with a backward-compatible payload shape.
func Success(c *gin.Context, status int, payload gin.H) {
	if payload == nil {
		payload = gin.H{}
	}

	payload["success"] = true
	c.JSON(status, payload)
}

// Error sends a standardized error response while keeping the legacy "error" field.
func Error(c *gin.Context, status int, code string, message string, details any) {
	payload := gin.H{
		"success": false,
		"error":   message,
		"code":    code,
	}

	if details != nil {
		payload["details"] = details
	}

	if requestID := c.GetString("requestID"); requestID != "" {
		payload["requestId"] = requestID
	}

	c.JSON(status, payload)
}

// AbortError sends a standardized error and aborts the request pipeline.
func AbortError(c *gin.Context, status int, code string, message string, details any) {
	payload := gin.H{
		"success": false,
		"error":   message,
		"code":    code,
	}

	if details != nil {
		payload["details"] = details
	}

	if requestID := c.GetString("requestID"); requestID != "" {
		payload["requestId"] = requestID
	}

	c.AbortWithStatusJSON(status, payload)
}
