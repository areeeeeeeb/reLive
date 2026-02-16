package apperr

import "errors"

// fill as we go. they do NOT mean the same thing as HTTP status codes.

var (
	ErrNotFound  = errors.New("not found")
	ErrDuplicate = errors.New("duplicate")
)

