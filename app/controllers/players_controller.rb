class PlayersController < ApplicationController

  def top
    @players = User.order('rank DESC').limit(15)
  end

  def edit

  end

  def update

  end

end
