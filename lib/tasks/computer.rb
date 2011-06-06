def play_game(game_id)
  game = Game.find(game_id)
  standard_move = game.get_computer_next_move
  move = game.from_standard(standard_move)

  if move['replace_piece'] # Replace Move
    played = game.can_move?(move) && game.commit_move(move)
    game.replace_move = move
    game.replace(move['replace_piece'])
  else
    played = game.can_move?(move) && game.commit_move(move)
  end
end

# Loading the games in the queue
while(next_game_id = REDIS.lpop("computer_games"))do
  play_game(next_game_id)
end

REDIS2 = Redis.new

REDIS2.subscribe('computer_play') do |on|
  on.message do |channel, game_id|
    play_game(game_id)
    next_game_id = REDIS.lpop "computer_games"
  end
end
