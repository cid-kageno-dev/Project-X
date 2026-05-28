package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ─── Models ──────────────────────────────────────────────────────────────────

type Container struct {
	ID          int     `json:"id"`
	WorkspaceID int     `json:"workspaceId"`
	Name        string  `json:"name"`
	Image       string  `json:"image"`
	Status      string  `json:"status"`
	Port        *int    `json:"port,omitempty"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemoryMB    int     `json:"memoryMb"`
	CreatedAt   string  `json:"createdAt"`
	StartedAt   *string `json:"startedAt,omitempty"`
}

type Deployment struct {
	ID            int     `json:"id"`
	WorkspaceID   int     `json:"workspaceId"`
	Status        string  `json:"status"`
	Environment   string  `json:"environment"`
	URL           *string `json:"url,omitempty"`
	CommitSHA     *string `json:"commitSha,omitempty"`
	CommitMessage *string `json:"commitMessage,omitempty"`
	BuildDuration *int    `json:"buildDuration,omitempty"`
	CreatedAt     string  `json:"createdAt"`
	FinishedAt    *string `json:"finishedAt,omitempty"`
}

type ActionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// ─── In-memory store ─────────────────────────────────────────────────────────

var (
	mu         sync.RWMutex
	containers = []Container{
		{ID: 1, WorkspaceID: 1, Name: "api-gateway-dev", Image: "node:20-alpine", Status: "running", Port: intPtr(3001), CPUPercent: 12.4, MemoryMB: 186, CreatedAt: ago(72), StartedAt: strPtr(ago(72))},
		{ID: 2, WorkspaceID: 2, Name: "frontend-dev", Image: "node:20-alpine", Status: "running", Port: intPtr(3000), CPUPercent: 8.7, MemoryMB: 312, CreatedAt: ago(120), StartedAt: strPtr(ago(120))},
		{ID: 3, WorkspaceID: 3, Name: "ml-service-gpu", Image: "python:3.12-slim", Status: "running", Port: intPtr(8000), CPUPercent: 38.2, MemoryMB: 892, CreatedAt: ago(168), StartedAt: strPtr(ago(168))},
		{ID: 4, WorkspaceID: 3, Name: "redis-cache", Image: "redis:7-alpine", Status: "running", Port: intPtr(6379), CPUPercent: 2.1, MemoryMB: 48, CreatedAt: ago(168), StartedAt: strPtr(ago(168))},
		{ID: 5, WorkspaceID: 4, Name: "postgres-dev", Image: "postgres:16-alpine", Status: "running", Port: intPtr(5432), CPUPercent: 5.3, MemoryMB: 128, CreatedAt: ago(24), StartedAt: strPtr(ago(24))},
		{ID: 6, WorkspaceID: 5, Name: "auth-svc", Image: "rust:1.78-slim", Status: "stopped", Port: intPtr(4000), CPUPercent: 0.0, MemoryMB: 0, CreatedAt: ago(240)},
	}
	deployments = []Deployment{
		{ID: 1, WorkspaceID: 1, Status: "success", Environment: "production", URL: strPtr("https://api.acme.app"), CommitSHA: strPtr("a3f4e91"), CommitMessage: strPtr("feat: add rate limiting middleware"), BuildDuration: intPtr(42), CreatedAt: ago(2), FinishedAt: strPtr(ago(2))},
		{ID: 2, WorkspaceID: 1, Status: "success", Environment: "staging", URL: strPtr("https://staging-api.acme.app"), CommitSHA: strPtr("b8c2d14"), CommitMessage: strPtr("fix: resolve CORS preflight issue"), BuildDuration: intPtr(28), CreatedAt: ago(24), FinishedAt: strPtr(ago(24))},
		{ID: 3, WorkspaceID: 2, Status: "success", Environment: "production", URL: strPtr("https://app.acme.com"), CommitSHA: strPtr("c1e9f23"), CommitMessage: strPtr("feat: dark mode implementation"), BuildDuration: intPtr(67), CreatedAt: ago(3), FinishedAt: strPtr(ago(3))},
		{ID: 4, WorkspaceID: 2, Status: "failed", Environment: "production", CommitSHA: strPtr("d7a5b36"), CommitMessage: strPtr("refactor: migrate to app router"), CreatedAt: ago(4), FinishedAt: strPtr(ago(4))},
		{ID: 5, WorkspaceID: 3, Status: "deploying", Environment: "staging", CommitSHA: strPtr("e4c8a47"), CommitMessage: strPtr("perf: batch embedding requests"), CreatedAt: ago(0)},
		{ID: 6, WorkspaceID: 3, Status: "success", Environment: "production", URL: strPtr("https://ml.acme.app"), CommitSHA: strPtr("f1b3c58"), CommitMessage: strPtr("feat: add streaming inference endpoint"), BuildDuration: intPtr(89), CreatedAt: ago(48), FinishedAt: strPtr(ago(48))},
		{ID: 7, WorkspaceID: 4, Status: "pending", Environment: "development", CreatedAt: ago(0)},
	}
)

func intPtr(v int) *int    { return &v }
func strPtr(v string) *string { return &v }
func ago(hours int) string {
	t := time.Now().Add(-time.Duration(hours) * time.Hour)
	return t.UTC().Format(time.RFC3339)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func parseID(path, prefix string) (int, error) {
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.SplitN(trimmed, "/", 2)
	return strconv.Atoi(parts[0])
}

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// ─── Container Handlers ───────────────────────────────────────────────────────

func handleContainers(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// POST /api/containers
	if r.Method == http.MethodPost && path == "/api/containers" {
		var body struct {
			WorkspaceID int    `json:"workspaceId"`
			Name        string `json:"name"`
			Image       string `json:"image"`
			Port        *int   `json:"port"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid body"})
			return
		}
		mu.Lock()
		c := Container{
			ID:          len(containers) + 1,
			WorkspaceID: body.WorkspaceID,
			Name:        body.Name,
			Image:       body.Image,
			Status:      "stopped",
			Port:        body.Port,
			CPUPercent:  0,
			MemoryMB:    0,
			CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		}
		containers = append(containers, c)
		mu.Unlock()
		writeJSON(w, 201, c)
		return
	}

	// GET /api/containers
	if r.Method == http.MethodGet && path == "/api/containers" {
		mu.RLock()
		defer mu.RUnlock()
		writeJSON(w, 200, containers)
		return
	}

	// /api/containers/:id/...
	if strings.HasPrefix(path, "/api/containers/") {
		id, err := parseID(path, "/api/containers/")
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid id"})
			return
		}

		// Action endpoints
		if strings.HasSuffix(path, "/start") {
			mu.Lock()
			for i := range containers {
				if containers[i].ID == id {
					containers[i].Status = "running"
					now := time.Now().UTC().Format(time.RFC3339)
					containers[i].StartedAt = &now
					containers[i].CPUPercent = float64(rand.Intn(30) + 5)
					containers[i].MemoryMB = rand.Intn(400) + 100
				}
			}
			mu.Unlock()
			writeJSON(w, 200, ActionResponse{Success: true, Message: fmt.Sprintf("Container %d started", id)})
			return
		}
		if strings.HasSuffix(path, "/stop") {
			mu.Lock()
			for i := range containers {
				if containers[i].ID == id {
					containers[i].Status = "stopped"
					containers[i].CPUPercent = 0
					containers[i].MemoryMB = 0
				}
			}
			mu.Unlock()
			writeJSON(w, 200, ActionResponse{Success: true, Message: fmt.Sprintf("Container %d stopped", id)})
			return
		}
		if strings.HasSuffix(path, "/restart") {
			mu.Lock()
			for i := range containers {
				if containers[i].ID == id {
					containers[i].Status = "running"
					now := time.Now().UTC().Format(time.RFC3339)
					containers[i].StartedAt = &now
					containers[i].CPUPercent = float64(rand.Intn(20) + 5)
					containers[i].MemoryMB = rand.Intn(300) + 100
				}
			}
			mu.Unlock()
			writeJSON(w, 200, ActionResponse{Success: true, Message: fmt.Sprintf("Container %d restarted", id)})
			return
		}

		// GET /api/containers/:id
		if r.Method == http.MethodGet {
			mu.RLock()
			defer mu.RUnlock()
			for _, c := range containers {
				if c.ID == id {
					writeJSON(w, 200, c)
					return
				}
			}
			writeJSON(w, 404, map[string]string{"error": "container not found"})
			return
		}
	}

	writeJSON(w, 404, map[string]string{"error": "not found"})
}

// ─── Deployment Handlers ──────────────────────────────────────────────────────

func handleDeployments(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// POST /api/deployments
	if r.Method == http.MethodPost && path == "/api/deployments" {
		var body struct {
			WorkspaceID   int    `json:"workspaceId"`
			Environment   string `json:"environment"`
			CommitSHA     string `json:"commitSha"`
			CommitMessage string `json:"commitMessage"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid body"})
			return
		}
		mu.Lock()
		d := Deployment{
			ID:            len(deployments) + 1,
			WorkspaceID:   body.WorkspaceID,
			Status:        "pending",
			Environment:   body.Environment,
			CommitSHA:     &body.CommitSHA,
			CommitMessage: &body.CommitMessage,
			CreatedAt:     time.Now().UTC().Format(time.RFC3339),
		}
		deployments = append(deployments, d)
		mu.Unlock()

		// Simulate async build
		go func(depID int) {
			time.Sleep(time.Duration(rand.Intn(30)+15) * time.Second)
			mu.Lock()
			defer mu.Unlock()
			for i := range deployments {
				if deployments[i].ID == depID {
					deployments[i].Status = "success"
					duration := rand.Intn(60) + 20
					deployments[i].BuildDuration = &duration
					now := time.Now().UTC().Format(time.RFC3339)
					deployments[i].FinishedAt = &now
				}
			}
		}(d.ID)

		writeJSON(w, 201, d)
		return
	}

	// GET /api/deployments
	if r.Method == http.MethodGet && path == "/api/deployments" {
		mu.RLock()
		defer mu.RUnlock()
		writeJSON(w, 200, deployments)
		return
	}

	// GET /api/deployments/:id
	if strings.HasPrefix(path, "/api/deployments/") {
		id, err := parseID(path, "/api/deployments/")
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid id"})
			return
		}
		mu.RLock()
		defer mu.RUnlock()
		for _, d := range deployments {
			if d.ID == id {
				writeJSON(w, 200, d)
				return
			}
		}
		writeJSON(w, 404, map[string]string{"error": "deployment not found"})
		return
	}

	writeJSON(w, 404, map[string]string{"error": "not found"})
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/containers", cors(handleContainers))
	mux.HandleFunc("/api/containers/", cors(handleContainers))
	mux.HandleFunc("/api/deployments", cors(handleDeployments))
	mux.HandleFunc("/api/deployments/", cors(handleDeployments))
	mux.HandleFunc("/api/healthz", cors(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok", "service": "go-infra", "lang": "Go 1.25"})
	}))

	addr := "0.0.0.0:" + port
	log.Printf("🐹 Go Infra Service listening on %s", addr)
	log.Printf("   Handles: /api/containers, /api/deployments")
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
