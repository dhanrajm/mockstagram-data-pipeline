-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create influencer_summary table
CREATE TABLE IF NOT EXISTS influencer_summary (
    pk BIGINT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    current_follower_count BIGINT NOT NULL,
    total_follower_sum BIGINT NOT NULL,
    readings_count BIGINT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL
);

-- Create follower_timeline hypertable
CREATE TABLE IF NOT EXISTS follower_timeline (
    pk BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    follower_count BIGINT NOT NULL,
    CONSTRAINT fk_influencer
        FOREIGN KEY (pk)
        REFERENCES influencer_summary(pk)
        ON DELETE CASCADE
);

-- Convert follower_timeline to a hypertable
SELECT create_hypertable('follower_timeline', 'timestamp', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follower_timeline_pk_timestamp 
    ON follower_timeline (pk, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_follower_timeline_timestamp 
    ON follower_timeline (timestamp DESC);
