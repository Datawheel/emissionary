-- Emissionary schema (spec §15.2)

CREATE TABLE players (
  id uuid PRIMARY KEY,
  name text NULL,
  name_discriminator int NULL,
  country char(3) NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT true,
  oec_user_id text NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  renamed_at timestamptz NULL
);

CREATE UNIQUE INDEX players_name_disc_idx ON players (lower(name), name_discriminator)
  WHERE name IS NOT NULL;

CREATE TABLE items (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  version int NOT NULL DEFAULT 1
);

CREATE TABLE country_factors (
  iso3 char(3) PRIMARY KEY,
  grid_gco2_kwh numeric NOT NULL,
  grid_year int NOT NULL,
  car_gco2_km numeric NOT NULL,
  car_year int NOT NULL,
  sources jsonb NOT NULL
);

CREATE TABLE daily_sets (
  date date PRIMARY KEY,
  rounds jsonb NOT NULL,
  seed text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY,
  set_date date NULL REFERENCES daily_sets(date),
  set_index int NULL,               -- 0-4 within a daily set
  player_id uuid NULL REFERENCES players(id),  -- owner for free-play rounds
  item_a text NOT NULL REFERENCES items(id),
  qty_a numeric NOT NULL,
  item_b text NOT NULL REFERENCES items(id),
  qty_b numeric NULL,               -- binary rounds only
  round_type text NOT NULL CHECK (round_type IN ('binary','quant')),
  difficulty int NOT NULL,
  slider_min numeric NULL,
  slider_max numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rounds_set_date_idx ON rounds (set_date) WHERE set_date IS NOT NULL;
CREATE INDEX rounds_player_idx ON rounds (player_id, created_at) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX rounds_daily_unique ON rounds (set_date, set_index) WHERE set_date IS NOT NULL;

CREATE TABLE guesses (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id),
  round_id uuid NOT NULL REFERENCES rounds(id),
  country char(3) NOT NULL,
  guess numeric NULL,               -- quantitative rounds
  choice text NULL CHECK (choice IN ('a','b')),  -- binary rounds
  truth numeric NOT NULL,
  signed_log_error numeric NULL,
  score int NOT NULL,
  ms_elapsed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round_id)
);

CREATE INDEX guesses_round_idx ON guesses (round_id);
CREATE INDEX guesses_player_time_idx ON guesses (player_id, created_at);
CREATE INDEX guesses_created_idx ON guesses (created_at);
