package database

import "strings"

// escapeILIKE escapes special ILIKE wildcard characters (% and _)
func escapeILIKE(s string) string {
    s = strings.ReplaceAll(s, `\`, `\\`)
    s = strings.ReplaceAll(s, `%`, `\%`)
    s = strings.ReplaceAll(s, `_`, `\_`)
    return s
}