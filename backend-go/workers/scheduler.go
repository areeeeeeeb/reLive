package workers

import (
	"context"
	"log"
	"time"
)

// FetchFunc is a function type that defines how to fetch jobs for the scheduler. 
// It takes a context and a limit on how many jobs to fetch, and returns a slice of jobs and an error if any.
type FetchFunc func (ctx context.Context, limit int) ([]Job, error)

// Scheduler polls for work at a fixed interval and submits jobs to a Pool.
type Scheduler struct {
	name string
	pool *Pool
	fetch FetchFunc
	interval time.Duration
}

// NewScheduler creates a new Scheduler with the given name, worker pool, fetch function, and polling interval.
func NewScheduler(name string, pool *Pool, fetch FetchFunc, interval time.Duration) *Scheduler {
	return &Scheduler{
		name: name,
		pool: pool,
		fetch: fetch,
		interval: interval,
	}
}

// Run starts the polling loop of the scheduler. It polls for jobs at the interval rate, submits to pool until context is done. 
// This is safe since we are using Postgres-based buffered queue, so we won't lose any jobs if the scheduler is stopped while processing.
func (s *Scheduler) Run(ctx context.Context) {
	log.Printf("[scheduler:%s] starting with interval=%s", s.name, s.interval)
	
	s.poll(ctx) // run immediately on start

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select { // same select pattern as worker pool to allow graceful shutdown when context is done
		case <- ctx.Done():
			log.Printf("[scheduler:%s] stopping", s.name)
			return
		case <- ticker.C:
			s.poll(ctx)
		}
	}
	
}

// Poll checks available pool capacity, fetches work accordingly and submits to pool until context is done. 
func (s *Scheduler) poll(ctx context.Context) {
	available := s.pool.Available()
	if available <= 0 {
		log.Printf("[scheduler:%s] no available workers, skipping poll", s.name)
		return
	}

	jobs, err := s.fetch(ctx, available)
	if err != nil {
		log.Printf("[scheduler:%s] error fetching jobs: %v", s.name, err)
		return
	}

	for _, job := range jobs {
		if !s.pool.Submit(ctx, job) { // if context is done while submitting, stop submitting more jobs
			log.Printf("[scheduler:%s] context done while submitting job, stopping", s.name)
			return
		}
	}
	if len(jobs) != 0 {
		log.Printf("[scheduler:%s] submitted %d jobs", s.name, len(jobs))
	}
}