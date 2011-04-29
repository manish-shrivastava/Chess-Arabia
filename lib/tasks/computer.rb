def play_game(game_id)
  game = Game.find(game_id)
  standard_move = game.get_computer_next_move
  move = game.from_standard(standard_move)

  if move['replace_piece'] # Replace Move
    played = game.can_move?(move) && game.commit_move(move)
    #game.turn = 'replace' + game.turn

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

=begin
loop do
  begin
    queue_length = REDIS.llen('computer_games')
    puts "QUEUE LENGTH: #{queue_length} -------------------------- #{Time.now}" if queue_length > 0
    next_game_id = REDIS.lpop "computer_games"

  rescue Exception => e
    f = File.open(File.join(Rails.root, 'tmp', "#{Time.now.to_s}.log"), "w")
    f.write(e.to_s)
    f.write(e.backtrace)
    f.close
  end
end
=end
