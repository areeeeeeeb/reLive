package models

import "time"

// Attendance represents when a user attended a event
type Attendance struct {
    ID         int       `db:"id" json:"id"`
    UserID     int       `db:"user_id" json:"user_id"`
    EventID    int       `db:"event_id" json:"event_id"`
    AttendedAt time.Time `db:"attended_at" json:"attended_at"`
}

// AttendanceWithDetails includes user and event information
type AttendanceWithDetails struct {
    Attendance
    User    User    `json:"user"`
    Event   Event   `json:"event"`
}