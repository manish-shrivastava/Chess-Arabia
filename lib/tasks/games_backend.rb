REDIS2 = Redis.new

REDIS2.subscribe('game_finished') do |on|
  on.message do |channel, game_id|
    begin
      g = Game.find(game_id)
      if g.players.values.include?('computer')

      else
        player_w_guest = User.guest?(g.players['W'])
        player_b_guest = User.guest?(g.players['B'])

        player_w_rating = player_w_guest ? 1500 : User.find_by_email(g.players['W']).rating
        player_b_rating = player_b_guest ? 1500 : User.find_by_email(g.players['B']).rating

        expected_w = 1.0 / (1 + 10 ** ((player_b_rating - player_w_rating) / 400))
        expected_b = 1.0 / (1 + 10 ** ((player_w_rating - player_b_rating) / 400))

        w_result = ['W', 'ResignB'].include?(g.winner) ? 1 : (g.winner == 'TIE' ? 0.5 : 0)
        b_result = ['B', 'ResignW'].include?(g.winner) ? 1 : (g.winner == 'TIE' ? 0.5 : 0)

        unless player_w_guest
          new_w_rating = player_w_rating + (player_w_rating > 2200 ? 16 : 32) * (w_result - expected_w)
          player_w = User.find_by_email(g.players['W'])
          player_w.rating = new_w_rating
          player_w.save
        end

        unless player_b_guest
          new_b_rating = player_b_rating + (player_b_rating > 2200 ? 16 : 32) * (b_result - expected_b)
          player_b = User.find_by_email(g.players['B'])
          player_b.rating = new_b_rating
          player_b.save
        end
      end
    rescue

    end
  end
end
