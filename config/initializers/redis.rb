REDIS = Redis.new

REDIS.set :last_game_id, 0 unless REDIS.get :last_game_id

LAST_TIME = {}
