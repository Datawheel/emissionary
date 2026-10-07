-- Free Play survival runs: three strikes (0-point rounds) and the run is over.
-- Each free-play round belongs to a run; rounds from before this migration have
-- no run and are ignored, so every player starts with a fresh run.
ALTER TABLE rounds ADD COLUMN run_no integer NULL;
CREATE INDEX rounds_player_run_idx ON rounds (player_id, run_no) WHERE set_date IS NULL;
