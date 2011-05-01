class Game
  
  # ------------ REDIS ------------
  # Attributes "game_#{id}"
  # IDs List "games"
  # Finished Games IDS "finished_games"
  # Last ID "last_game_id"
  # Queue "computer_games"
  
  # Channels
  # - move_finished
  # - computer_play
  # - player_joined
  
  Attributes = [:id, :cells, :turn, :players, :moves, :two_steps, :replace_move, :winner, :eaten_pieces, :created_at, :last_move_at, :started_at]
  Attributes += [:state_count]
  Attributes.each do |attrib|
    attr_accessor attrib
  end
  
  attr_accessor :next_moves

  BlackPieces = ['nB', 'bB', 'qB', 'kB', 'rB', 'pB']
  WhitePieces = ['nW', 'bW', 'qW', 'kW', 'rW', 'pW']
   
  def self.create
    g = Game.new
    g.id = REDIS.incr "last_game_id" while REDIS.get("game_#{g.id}")
    REDIS.rpush 'games', g.id
    g.cells = []
    g.cells << ['rB', 'nB', 'bB', 'qB', 'kB', 'bB', 'nB', 'rB']
    g.cells << ['pB', 'pB', 'pB', 'pB', 'pB', 'pB', 'pB', 'pB']
    4.times.each{ g.cells << [nil, nil, nil, nil, nil, nil, nil, nil] }
    g.cells << ['pW', 'pW', 'pW', 'pW', 'pW', 'pW', 'pW', 'pW']
    g.cells << ['rW', 'nW', 'bW', 'qW', 'kW', 'bW', 'nW', 'rW']
    g.turn = 'W'
    g.players = {}
    g.moves = []
    g.two_steps = nil
    g.replace_move = nil
    g.winner = nil
    g.started_at = nil
    g.eaten_pieces = []
    g.created_at = Time.now.getutc
    g.save # Save the game to Redis
    return g
  end

  def started?
    ! players['W'].nil? && ! players['B'].nil?
  end
  
  def in_game?(player_code)
    return [@players['W'], @players['B']].include?(player_code)
  end
  
  def finished?
    @winner
  end
  
  def players_count
    s = 0
    s += 1 if players['W']
    s += 1 if players['B']
    return s
  end
  
  def self.clear_db
    return unless Rails.env == 'development'
    # Reset Redis Storage, Shouldn't be run on the Production Environment
    REDIS.del 'games'
    REDIS.set 'last_game_id', 0
    (0..100).each{|n| REDIS.del "game_#{n}"; REDIS.lrem 'games', 1, n}
  end
  
  def self.find(id)
    g = Game.new
    redis_data = REDIS.get("game_#{id}")
    return Game.create unless redis_data
    redis_attributes = ActiveSupport::JSON.decode(redis_data)
    unless redis_attributes
      g = Game.create
      g.save
      return g      
    end
    #raise Attributes.map(&:to_s).inspect
    Attributes.each do |attribute, value|
      g.send "#{attribute.to_s}=", redis_attributes[attribute.to_s]
    end
    g.next_moves = redis_attributes['next_moves'] if redis_attributes['next_moves']
    return g
  end
  
  def self.all
    ids = (REDIS.lrange 'games', 0, (REDIS.LLEN 'games')) rescue []
    ids.map{|id| Game.find id}
  end
  
  def self.all_finished
    ids = (REDIS.lrange 'finished_games', 0, (REDIS.LLEN 'finished_games')) rescue []
    ids.map{|id| Game.find id} 
  end
  
  def rate_game
    return if [self.players['W'], self.players['B']].include?('computer')
    u1 = User.find_by_email(self.players['W'])
    u2 = User.find_by_email(self.players['B'])
    
    if ['resignB', 'W'].include?(self.winner)
      u1.rank += 10 if u1
      u2.rank -=10 if u2
    elsif ['resignW', 'B'].include?(self.winner)
      u1.rank -= 10 if u1
      u2.rank += 10 if u2
    end
    
    u1.save if u1
    u2.save if u2   
  end
  
  def save
    hash = {}
    hash['next_moves'] = self.next_moves()
    Attributes.each{|b| hash[b] = self.send(b) }    
    REDIS.set "game_#{@id}", hash.to_json
  end
  
  def self.all_places
    return @all_places if @all_places
    @all_places = []
    (0..7).each do |ind1|
      (0..7).each do |ind2|
        @all_places << [ind1, ind2]
      end
    end
    @all_places
  end
  
  def log(text)
    #@log.info(Time.now.to_s + " : " + text)
  end
  
  def places
    r = {}
    @cells.each_with_index do |row, ind1|
      row.each_with_index do |cell, ind2|
        r[cell] ||= []
        r[cell] << [ind1, ind2]
      end
    end
    return r
  end
  
  def white_king?
    king_place = places['kW'].first
    BlackPieces.each do |piece1|      
      (places[piece1] || []).each{|from| return true if can_move?({'from' => from, 'to' => king_place, 'piece1' => piece1, 'piece2' => 'kW'}, true)}
    end
    return false
  end
  
  def black_king?
    king_place = places['kB'].first
    WhitePieces.each do |piece1|
      (places[piece1] || []).each{|from| return true if can_move?({'from' => from, 'to' => king_place, 'piece1' => piece1, 'piece2' => 'kB'}, true)}
    end
    return false  
  end

  def white_cover?(to)
    WhitePieces.each do |piece1|      
      (places[piece1] || []).each{|from| return true if can_move?({'from' => from, 'to' => to, 'piece1' => piece1, 'piece2' => @cells[to[0]][to[1]]}, true) }
    end
    return false  
  end

  def black_cover?(to)
    BlackPieces.each do |piece1|
      (places[piece1] || []).each{|from| return true if can_move?({'from' => from, 'to' => to, 'piece1' => piece1, 'piece2' => @cells[to[0]][to[1]]}, true)}
    end
    return false  
  end

  def in_range?(move)
    from, to, piece1, piece2 = ['from', 'to', 'piece1', 'piece2', 'special_move'].map{|k| move[k] }
    return true if to[0] - from[0] == 0
    return true if to[1] - from[1] == 0
    return true if ((to[1] * 1.0 - from[1])/(to[0] - from[0])).abs == 1.0
  end
  
  def clear_range?(move)
    from, to, piece1, piece2 = ['from', 'to', 'piece1', 'piece2'].map{|k| move[k] }
    temp = from.clone
    begin
      temp[1] += 1 if to[1] > temp[1]
      temp[1] -= 1 if to[1] < temp[1]
      temp[0] += 1 if to[0] > temp[0]
      temp[0] -= 1 if to[0] < temp[0]
      return false if !@cells[temp[0]][temp[1]].nil? and temp != to
    end while temp != to
    return true
  end

  def special_move?(move)
    from, to, piece1, piece2 = ['from', 'to', 'piece1', 'piece2'].map{|k| move[k] }
    if piece1 == "pW" && piece2 == "pB" && (to[0] - from[0]) == 0 && (to[1] - from[1]).abs == 1 && @two_steps == to
      return 1
    elsif piece1 == "pB" && piece2 == "pW" && (to[0] - from[0]) == 0 && (to[1] - from[1]).abs == 1 && @two_steps == to
      return 2
    elsif piece1 == "kW" && piece2.nil? && !@kw_moved && !@r77_moved && (from[0] == 7) && (from[1] == 4) && (to[0] == 7) && (to[1] == 6) && @cells[7][5].nil? && @cells[7][6].nil?
      return 3 # Castling White King to Right
    elsif piece1 == "kW" && piece2.nil? && !@kw_moved && !@r70_moved && (from[0] == 7) && (from[1] == 4) && (to[0] == 7) && (to[1] == 2) && @cells[7][3].nil? && @cells[7][2].nil? && @cells[7][1].nil? 
      return 4 # Castling White King to Left
    elsif piece1 == "kB" && piece2.nil? && !@kb_moved && !@r07_moved && (from[0] == 0) && (from[1] == 4) && (to[0] == 0) && (to[1] == 6) && @cells[0][5].nil? && @cells[0][6].nil?
      return 5 # Castling Black King to Left
    elsif piece1 == "kB" && piece2.nil? && !@kb_moved && !@r00_moved && (from[0] == 0) && (from[1] == 4) && (to[0] == 0) && (to[1] == 2) && @cells[0][3].nil? && @cells[0][2].nil? && @cells[0][1].nil? 
      return 6 # Castling Black King to Right
    end
  end
 
  def replace(new_piece)
    if @turn == 'replaceW'
      return unless Game::WhitePieces.include?(new_piece)
      col = @cells[0].index('pW')
      @cells[0][col] = new_piece
      @replace_move['replace_piece'] = new_piece
      @replace_move['check_mate'] = black_king?
      @replace_move['standard'] = self.to_standard(@replace_move)
      @moves << @replace_move
      @replace_move = nil
      @next_moves = nil
      @turn = 'B'
      @last_move_at = Time.now.getutc
      move_finished()
      save()
      after_move_finished()
      return @moves.last
    elsif @turn == 'replaceB'
      return unless Game::BlackPieces.include?(new_piece)
      col = @cells[7].index('pB')
      @cells[7][col] = new_piece
      @replace_move['replace_piece'] = new_piece
      @replace_move['check_mate'] = white_king?
      @replace_move['standard'] = self.to_standard(@replace_move)
      @moves << @replace_move
      @replace_move = nil
      @next_moves = nil
      @turn = 'W'
      @last_move_at = Time.now.getutc
      move_finished()
      save()
      after_move_finished()
      return @moves.last
    end
  end
  
  def commit_move(move, trying = false)
    from, to, piece1, piece2, special_move, replace_move = ['from', 'to', 'piece1', 'piece2', 'special_move', 'replace_move'].map{|k| move[k] }
    old_cells = []
    @cells.each{|row| old_cells << row.clone}
    old_turn = @turn
    r = true
    @cells[from[0]][from[1]] = nil
    @cells[to[0]][to[1]] = piece1
    @turn = @turn == "W" ? "B" : "W"
    
    if special_move == 1
      @cells[to[0] - 1][to[1]] = 'pW'
      @cells[to[0]][to[1]] = nil
    elsif special_move == 2
      @cells[to[0] + 1][to[1]] = 'pB'
      @cells[to[0]][to[1]] = nil      
    elsif special_move == 3
      @cells[7][7] = nil
      @cells[7][5] = 'rW'
    elsif special_move == 4
      @cells[7][0] = nil
      @cells[7][3] = 'rW'
    elsif special_move == 5
      @cells[0][7] = nil
      @cells[0][5] = 'rB'
    elsif special_move == 6
      @cells[0][0] = nil
      @cells[0][3] = 'rB'
    end

    r = false if old_turn == 'W' && white_king?
    r = false if old_turn == 'B' && black_king?
    
    if r
      # Move is for sure OK
      @next_moves = nil
      move['check_mate'] = (white_king? || black_king?)
      move['standard'] = to_standard(move)
      @kw_moved = true if piece1 == 'kW'
      @kb_moved = true if piece1 == 'kB'
      @r00_moved = true if from == [0, 0]
      @r07_moved = true if from == [0, 7]
      @r70_moved = true if from == [7, 0]
      @r77_moved = true if from == [7, 7]
      @two_steps = (piece1 == "pW" || piece1 == "pB") && (to[0] - from[0]).abs == 2 ? to : nil
      @eaten_pieces << piece2 if piece2
      if piece1 == 'pW' && to[0] == 0
        @turn = 'replaceW'
        @replace_move = move
        save() unless trying
        return true
      elsif piece1 == 'pB' && to[0] == 7
        @turn = 'replaceB'
        @replace_move = move
        save() unless trying
        return true
      end
      unless trying
        @moves << move # NOT IN THE MIDDLE OF A REPLACE FOR SURE
        move_finished()
        save()
        after_move_finished()
      end
      return true
    else
      @cells = old_cells
      @turn = old_turn
      return false
    end
  end
  
  def move_finished
    if next_moves().length == 0
      #raise next_moves.inspect
      # Game Finished
      @winner = white_king? ? 'B' : (black_king? ? 'W' : 'TIE')
      REDIS.lrem 'games', 1, @id
      REDIS.lpush 'finished_games', @id
      rate_game
    end
    @last_move_at = Time.now.getutc  
  end
  
  def after_move_finished
    # Tell Computer to play
    if (@players[@turn] == 'computer' && @winner.nil?)
      tell_computer_to_play
    end
    r = REDIS.publish('move_finished', self.id) # move_finished channel
  end
  
  def tell_computer_to_play
    REDIS.rpush 'computer_games', @id
    REDIS.publish 'computer_play', @id
  end
  
  def self.standard_location(loc)
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][loc[1]] + (1..8).to_a.reverse.map(&:to_s)[loc[0]]
  end

  def get_computer_next_move
    game_state_string = [@cells, @moves].inspect
    game_state_string_digest = Digest::SHA1.hexdigest(game_state_string)
    computer_cached_move_key = 'computer_cached_move_' + game_state_string_digest
    computer_cached_move = REDIS.get(computer_cached_move_key)
    
    return computer_cached_move if computer_cached_move
    
    input_path = File.join(Rails.root, 'tmp', "game_input_#{@id}")
    output_path = File.join(Rails.root, 'tmp', "game_output_#{@id}")
    f = File.new input_path, 'w'
    f.write "force\n"
    f.write "level 1 1 1\n"
    @moves.each do |move|
      f.write to_standard(move) + "\n"
    end
    f.write "go\n"    
    f.close
    system("hoichess < #{input_path} > #{output_path}")
    f = File.open output_path
    response = f.read    
    if response.match /Illegal move/
      error_f = File.new(File.join(Rails.root, "log", "computer_error_#{Time.now.to_s}.log"), "w")
      error_f.write(response)
      error_f.close
      raise response
    end
    lines = response.split("\n")
    move = lines.pop
    move = lines.pop unless move.match /move\s/
    
    REDIS.set computer_cached_move_key, move
    
    f.close
    return move
  end

  def can_move?(move, ignore_turn = false)
    from, to, piece1, piece2 = *['from', 'to', 'piece1', 'piece2'].map{|k| move[k] }
    special_move = self.special_move?(move)
    move['special_move'] = special_move
    move['id'] = self.moves.length
    if @next_moves && !ignore_turn
      first_move =  @next_moves.select{|m| (m['from'] == move['from']) && (m['to'] == move['to'])}.first
      return !first_move.nil?
    end

    # Checks
    return false if from[0] < 0 || from[0] > 7
    return false if from[1] < 0 || from[1] > 7
    return false if to[0] < 0 || to[0] > 7
    return false if to[1] < 0 || to[1] > 7
    return false if to == from
    return false if piece2 && piece1.chars.to_a[1] == piece2.chars.to_a[1]
    return false if piece1.nil?
    return false if (piece1.chars.to_a[1] != @turn) && !ignore_turn
    
    # Checking for Special Moves
    if special_move == 1
      return true
    elsif special_move == 2
      return true
    elsif special_move == 3
      return !(white_king? || black_cover?([7, 5]) || black_cover?([7, 6]))
    elsif special_move == 4
      return !(white_king? || black_cover?([7, 3]) || black_cover?([7, 2]))
    elsif special_move == 5
      return !(black_king? || white_cover?([0, 5]) || white_cover?([0, 6]))
    elsif special_move == 6
      return !(black_king? || white_cover?([0, 3]) || white_cover?([0, 2]))
    end

    # Checking Moves of Pieces
    if piece1 == "pW"
      if piece2.nil?
        return (to[1] == from[1]) && ((to[0] - from[0] == -1) || (to[0] - from[0] == -2 && from[0] == 6 && cells[to[0] + 1][to[1]].nil?))
      else
        return ((to[1] - from[1]).abs == 1) && (to[0] - from[0] == -1)
      end
    elsif piece1 == "pB"
      if piece2.nil?
        return (to[1] == from[1]) && ((to[0] - from[0] == 1) || (to[0] - from[0] == 2 && from[0] == 1 && cells[to[0] - 1][to[1]].nil?))
      else
        return ((to[1] - from[1]).abs == 1) && (to[0] - from[0] == 1)
      end
    elsif piece1 == "nW" || piece1 == "nB"
      return ((to[1] - from[1]).abs == 1 && (to[0] - from[0]).abs == 2) || ((to[1] - from[1]).abs == 2 && (to[0] - from[0]).abs == 1)
    elsif piece1 == "qW" || piece1 == "qB"
      return in_range?(move) && clear_range?(move)
    elsif piece1 == 'bW' || piece1 == 'bB'
      return (((to[1] * 1.0 - from[1])/(to[0] - from[0])).abs == 1.0) && clear_range?(move)
    elsif piece1 == 'rW' || piece1 == 'rB'
      return ((to[0] - from[0] == 0) || (to[1] - from[1] == 0)) && clear_range?(move)
    elsif piece1 == 'kW' || piece1 == 'kB'
      return ((to[0] - from[0]).abs < 2) && ((to[1] - from[1]).abs < 2) 
    end  
  end

  def next_moves
    #return unless started?
    return @next_moves if @next_moves
    old_turn = @turn
    old_array = [@kw_moved, @kb_moved, @r00_moved, @r07_moved, @r70_moved, @r77_moved, @two_steps]
    moves = []
    pieces_places = []
    piece_types = @turn == 'W' ? Game::WhitePieces : Game::BlackPieces
    piece_types.each do |piece_type|
      (places[piece_type] || []).each do |from|
        piece1 = @cells[from[0]][from[1]]
        Game.all_places.each do |to|
          piece2 = @cells[to[0]][to[1]]
          move = { 'from' => from, 'to' => to, 'piece1' => piece1, 'piece2' => piece2 }
          move['special_move'] = self.special_move?(move)
          old_cells = []
          old_eaten_pieces = @eaten_pieces.clone
          @cells.each{|row| old_cells << row.clone}
          if can_move?(move) && commit_move(move, true)
            @kw_moved, @kb_moved, @r00_moved, @r07_moved, @r70_moved, @r77_moved, @two_steps = old_array
            moves << move
            @cells = old_cells
            last_move_turn = @turn
            @turn = old_turn
            @eaten_pieces = old_eaten_pieces
          end
        end
      end
    end
    @next_moves = moves
    return moves    
  end

  def from_standard(standard_move)
    arr = standard_move.split(" ").last.chars.to_a
    piece = {'N' => 'n', 'Q' => 'q', 'K' => 'k', 'B' => 'b', 'R' => 'r'}[arr[0]]
    if piece.nil?
      piece = nil
    else
      arr.shift
      piece += @game.turn
    end
    char = arr.shift
    num = arr.shift
    loc0 = [(1..8).to_a.reverse.map(&:to_s).index(num), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].index(char)]  
    piece = @cells[loc0[0]][loc0[1]] unless piece    
    char = arr.shift
    num = arr.shift
    loc1 = [(1..8).to_a.reverse.map(&:to_s).index(num), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].index(char)]    
    piece2 = @cells[loc1[0]][loc1[1]]    
    move = { 'from' => loc0, 'to' => loc1, 'piece1' => piece, 'piece2' => piece2 }
    # Checking if Special 1
    if (piece2 == nil && (loc1[0] - loc0[0]) == -1 && (loc1[1] - loc0[1]).abs == 1 && @cells[loc1[0] + 1][loc1[1]] == 'pB' ) && (@two_steps == [loc1[0] + 1, loc1[1]])
      # Translating to TO field, to the place of the Black Pawn
      move['to'][0] += 1
      move['piece2'] = 'pB'
    # Checking if Special 2
    elsif (piece2 == nil && (loc1[0] - loc0[0]) == 1 && (loc1[1] - loc0[1]).abs == 1 && @cells[loc1[0] - 1][loc1[1]] == 'pW' ) && (@two_steps == [loc1[0] - 1, loc1[1]])
      # Translating to TO field, to the place of the White Pawn
      move['to'][0] -= 1
      move['piece2'] = 'pW'
    end    
    # White Replace
    if piece == 'pW' && loc1[0] == 0
      move['replace_piece'] = {'n' => 'n', 'q' => 'q', 'b' => 'b', 'r' => 'r'}[arr.last] + "W"
    # Black Replace
    elsif piece == 'pB' && loc1[0] == 7
      move['replace_piece'] = {'n' => 'n', 'q' => 'q', 'b' => 'b', 'r' => 'r'}[arr.last] + "B"
    end
    return move
  end
  
  def to_standard(m)
    move = m.clone
    return "O-O" if [3, 5].include?(move['special_move'])
    return "O-O-O" if [4, 6].include?(move['special_move'])
    r = ""
    piece_type = move['piece1'][0..0]
    r += {'n' => 'N', 'q' => 'Q', 'k' => 'K', 'b' => 'B', 'r' => 'R'}[piece_type] unless piece_type == 'p'
    # First Special Moves
    if move['special_move'] == 1
      move['to'] = [move['to'][0] - 1, move['to'][1]]
    elsif move['special_move'] == 2
      move['to'] = [move['to'][0] + 1, move['to'][1]]
    end
    
    r += Game.standard_location(move['from']) if (move['piece2'] && piece_type == 'p') || piece_type != 'p'
    r.chop! if move['piece2'] && piece_type == 'p'
    r += "x" if move['piece2']# and piece_type != 'p'
    r += Game.standard_location(move['to'])
    if move['replace_piece']
      r += "=" + {'n' => 'N', 'q' => 'Q', 'k' => 'K', 'b' => 'B', 'r' => 'R'}[move['replace_piece'][0..0]]
    end
    r += '+' if move['check_mate']
    return r
  end

end
