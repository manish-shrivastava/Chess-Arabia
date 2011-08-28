class PlayersController < ApplicationController

  def top
    @players = User.order('rank DESC').limit(15)
  end

  def edit

  end

  def update

  end

  def my_rating
    if user_signed_in?
      render :text => current_user.rating.to_s
    else
      render :text => 1500.to_s
    end
  end

end
