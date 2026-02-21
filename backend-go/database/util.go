package database

import "strings"

// escapeILIKE escapes special ILIKE wildcard characters (% and _)
func escapeILIKE(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

func prepareSearchQuery(raw string) (exact string, like string) {
	exact = strings.TrimSpace(raw)
	like = "%" + escapeILIKE(exact) + "%"
	return exact, like
}
