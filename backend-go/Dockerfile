# STAGE 1
FROM golang:1.25.7-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Cache dependencies separately from source
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./main.go

# STAGE 2
FROM alpine:3.19

# Add OS-level runtime dependencies here as needed
# e.g. RUN apk add --no-cache ffmpeg
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8081/health || exit 1

CMD ["./server"]
