class GamesController < ApplicationController

  before_filter :load_game, :only => [:show, :sit, :reset, :move, :random_move, :refresh, :replace, :two_steps, :computer_sit]

  def load_game
    @game = Game.find(params[:id])
    @white = @game.players['W'] == @player_code
    @black = @game.players['B'] == @player_code
    @player_seat = 'W' if @white
    @player_seat = 'B' if @black
  end

  def show
    #redirect_to games_path unless @game.started?
  end

  def create
    g = Game.all.reject(&:started?).first || Game.create
    redirect_to game_path(:id => g.id)
  end

  def index
    @games = Game.all
    @new_games = @games.reject(&:started?)
    @started_games = @games.select(&:started?)
  end

  def play_against_computer
    g = Game.create
    g.players['B'] = 'computer'
    g.players['W'] = @player_code
    REDIS.publish('player_joined', {'game_id' => g.id, 'seat' => 'W', 'player_name' => User.player_code_name(@player_code), 'player_code' => @player_code, 'started' => g.started? ? '1' : '0' }.to_json)
    REDIS.publish('player_joined', {'game_id' => g.id, 'seat' => 'B', 'player_name' => 'Computer', 'player_code' => 'computer', 'started' => g.started? ? '1' : '0' }.to_json)
    g.started_at = Time.now.getutc if g.started?
    g.save
    g.game_started
    #g.tell_computer_to_play
    redirect_to game_path(:id => g.id)
  end

  def sit
    @game.players[params[:seat]] = @player_code
    @game.save
    @game.game_started if @game.started?
    REDIS.publish('player_joined', {'game_id' => @game.id, 'seat' => params[:seat], 'player_name' => User.player_code_name(@player_code), 'player_code' => @player_code, 'started' => @game.started? ? '1' : '0' }.to_json)
    redirect_to game_path(:id => @game.id)
  end

  def move
    return unless @game.players[@game.turn] == @player_code
    return unless @game.started?
    return if @game.finished?
    from = params[:from].split("").map(&:to_i)
    to = params[:to].split("").map(&:to_i)
    move = { 'from' => from,
             'to' => to,
             'piece1' => @game.cells[from[0]][from[1]],
             'piece2' => @game.cells[to[0]][to[1]]
            }
    @game.can_move?(move) && @game.commit_move(move)
    render :nothing => true
  end

  def replace
    piece = params[:piece]
    if @game.turn == "replaceW"
      return if @player_seat != "W"
      replace_move = @game.replace(params[:piece])
      render :update do |page|
        page << "hide_replace_white()"
        page << "moves = #{@game.moves.length}"
        page << "make_replace_move(#{@game.moves.last.to_json})"
        page << "$('#moves_list').append('<div class=\\'move_list_element\\'>' + #{replace_move['standard'].to_json} + '</div>');"
      end
    elsif @game.turn == "replaceB"
      return if @player_seat != "B"
      replace_move = @game.replace(params[:piece])
      render :update do |page|
        page << "hide_replace_black()"
        page << "moves = #{@game.moves.length}"
        page << "make_replace_move(#{@game.moves.last.to_json})"
        page << "$('#moves_list').append('<div class=\\'move_list_element\\'>' + #{replace_move['standard'].to_json} + '</div>');"
      end
    end
    render :nothing => true
  end

end
