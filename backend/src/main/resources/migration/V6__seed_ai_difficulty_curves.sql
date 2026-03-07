ALTER TABLE ai_difficulty_curves
    ADD COLUMN slope DECIMAL(10, 4) NOT NULL DEFAULT 0,
    ADD COLUMN intercept DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN esports_ref_time_ms INT NULL,
    ADD COLUMN avg_ref_time_ms INT NULL,
    ADD COLUMN source VARCHAR(255) NULL;

-- Data source: f1laps.com (24 circuits), mapped to internal slugs.
INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.7288, 227.78, 73915, 85484, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'australia'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.3502, 220.32, 89116, 101707, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'china'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.5742, 231.38, 83462, 96167, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'japan'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.7476, 249.30, 85430, 96302, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'bahrain'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.7558, 250.36, 85637, 95889, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'saudi-arabia'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.7995, 251.36, 84111, 95225, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'miami'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.9429, 241.02, 72578, 83901, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'emilia-romagna'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.5386, 202.64, 66711, 79710, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'monaco'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.0072, 241.56, 70527, 79993, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'spain'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.0155, 235.64, 67298, 77717, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'canada'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.3723, 248.38, 62547, 71399, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'austria'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.5278, 226.49, 82797, 94579, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'great-britain'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.3184, 231.81, 99970, 111347, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'belgium'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.8331, 233.52, 72837, 84293, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'hungary'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.0121, 236.47, 67827, 76276, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'netherlands'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.6406, 304.75, 77538, 86248, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'italy'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.6412, 258.09, 96324, 108510, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'azerbaijan'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.4200, 220.89, 85132, 98512, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'singapore'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -1.9048, 270.44, 89482, 99457, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'united-states'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.3547, 270.99, 72618, 81961, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'mexico'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.0611, 236.18, 66074, 73837, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'brazil'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.3999, 313.26, 88860, 98027, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'las-vegas'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.0080, 260.24, 79801, 87271, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'qatar'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);

INSERT INTO ai_difficulty_curves
    (game_id, track_id, version, slope, intercept, esports_ref_time_ms, avg_ref_time_ms, source)
SELECT g.id, t.id, 3, -2.1297, 272.25, 80879, 90270, 'f1laps.com'
FROM games g
         JOIN tracks t ON t.game_id = g.id
WHERE g.code IN ('f12023', 'f12024', 'f12025')
  AND t.slug = 'abu-dhabi'
ON DUPLICATE KEY UPDATE version             = VALUES(version),
                        slope               = VALUES(slope),
                        intercept           = VALUES(intercept),
                        esports_ref_time_ms = VALUES(esports_ref_time_ms),
                        avg_ref_time_ms     = VALUES(avg_ref_time_ms),
                        source              = VALUES(source);
