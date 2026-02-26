package database

import (
	"fmt"
	"regexp"
	"strings"
)

var sqlIdentifierPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

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

func qualifyColumns(table string, cols string) (string, error) {
	if !sqlIdentifierPattern.MatchString(table) {
		return "", fmt.Errorf("invalid SQL identifier for table/alias: %q", table)
	}

	rawCols := strings.Split(cols, ",")
	if len(rawCols) == 0 {
		return "", nil
	}

	qualified := make([]string, 0, len(rawCols))
	for _, col := range rawCols {
		col = strings.TrimSpace(col)
		if col == "" {
			continue
		}
		if !sqlIdentifierPattern.MatchString(col) {
			return "", fmt.Errorf("invalid SQL column identifier: %q", col)
		}
		qualified = append(qualified, table+"."+col)
	}

	if len(qualified) == 0 {
		return "", nil
	}

	return "\n\t" + strings.Join(qualified, ",\n\t") + "\n", nil
}
