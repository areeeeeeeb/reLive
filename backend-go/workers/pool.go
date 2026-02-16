package workers

import (
	"context"
	"log"
	"sync"
	)

// Job represents a unit of work to be processed by the worker pool
type Job func(context.Context) error

// Pool manages a set of worker goroutines pulled from the job queue
type Pool struct {
	name 	 string
	concurrency int // # of workers
	queue 	 chan Job // buffered channel to hold pending jobs
	wg 		 sync.WaitGroup // wait for all goroutines to finish
	onError  func(error)
}

// NewPool creates a new worker pool with the given name, concurrency level, and queue size
func NewPool(name string, concurrency int, queueSize int) *Pool {
	return &Pool{
		name: name,
		concurrency: concurrency,
		queue: make(chan Job, queueSize),
		onError: func(err error) { log.Printf("[pool:%s] job error: %v", name, err) }, //TEMP: write with error handler later
	}
}

// Run starts the worker pool and blocks until all workers have stopped (when context is finished)
// This is safe since we are using Postgres-based buffered queue, so we won't lose any jobs if the pool is stopped while processing
func (p *Pool) Run(ctx context.Context) {
	log.Printf("[pool:%s] starting with concurrency=%d", p.name, p.concurrency)
	for i := 0; i < p.concurrency; i++ {
		p.wg.Add(1)
		go p.worker(ctx)
	}
	p.wg.Wait()
	log.Printf("[pool:%s] all workers stopped", p.name)
}

// worker is the function run by each worker goroutine to process jobs from the queue
func (p *Pool) worker(ctx context.Context) {
	defer p.wg.Done() // clean up when worker exits
	for {
		select {
		case <- ctx.Done(): // stop worker if ctx is finished
			log.Printf("[pool:%s] worker stopping due to context done", p.name)
			return
		case job := <- p.queue: // get next job from queue 
			if err := job(ctx); err != nil && p.onError != nil {
				p.onError(err)
			}
		}
	}
}

// Submit adds a new job to the pool's queue. Returns false if the context is done before the job can be submitted.
func (p *Pool) Submit(ctx context.Context, job Job) bool {
	select { 
	case p.queue <- job: // submit job to queue
		log.Printf("[pool:%s] job submitted", p.name)
		return true
	case <- ctx.Done(): // stop submitting if ctx is finished
		log.Printf("[pool:%s] failed to submit job: context done", p.name)
		return false
	}
}

// Available returns the number of available slots in the queue (used as a hint for when to submit new jobs)
func (p *Pool) Available() int {
	return cap(p.queue) - len(p.queue)
}
