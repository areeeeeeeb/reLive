package services

func indexBy[T any, K comparable](items []T, keyFn func(T) K) map[K]T {
	out := make(map[K]T, len(items))
	for _, item := range items {
		out[keyFn(item)] = item
	}
	return out
}
