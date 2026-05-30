package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ValidationDetails converts binding and validation errors into stable frontend-friendly details.
func ValidationDetails(err error) []gin.H {
	if err == nil {
		return nil
	}

	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) {
		details := make([]gin.H, 0, len(validationErrors))
		for _, fieldError := range validationErrors {
			details = append(details, gin.H{
				"field":   lowerFirst(fieldError.Field()),
				"message": validationMessage(fieldError),
			})
		}
		return details
	}

	var syntaxError *json.SyntaxError
	if errors.As(err, &syntaxError) {
		return []gin.H{{"field": "body", "message": "invalid JSON syntax"}}
	}

	var typeError *json.UnmarshalTypeError
	if errors.As(err, &typeError) {
		field := strings.TrimSpace(typeError.Field)
		if field == "" {
			field = "body"
		}
		return []gin.H{{"field": lowerFirst(field), "message": fmt.Sprintf("invalid type, expected %s", typeError.Type.String())}}
	}

	message := strings.TrimSpace(err.Error())
	if message == "" {
		message = "invalid request body"
	}

	return []gin.H{{"field": "body", "message": message}}
}

func validationMessage(fieldError validator.FieldError) string {
	switch fieldError.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email"
	case "min":
		if fieldError.Kind().String() == "string" {
			return fmt.Sprintf("must have at least %s characters", fieldError.Param())
		}
		return fmt.Sprintf("must be greater than or equal to %s", fieldError.Param())
	case "max":
		if fieldError.Kind().String() == "string" {
			return fmt.Sprintf("must have at most %s characters", fieldError.Param())
		}
		return fmt.Sprintf("must be less than or equal to %s", fieldError.Param())
	default:
		return "is invalid"
	}
}

func lowerFirst(input string) string {
	if input == "" {
		return input
	}

	return strings.ToLower(input[:1]) + input[1:]
}
