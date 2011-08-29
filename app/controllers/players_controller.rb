class PlayersController < ApplicationController

  def top
    @players = User.order('rating DESC').limit(15)
  end

  def edit

  end

  def update
    current_user.update_attributes(params[:user])
    sign_in(current_user, :bypass => true)
    redirect_to edit_player_path(current_user)
    flash[:notice] = "Profile updated successfully"
  end

  def show
    @user = User.find(params[:id])
  end

  def my_rating
    if user_signed_in?
      render :text => current_user.rating.to_s
    else
      render :text => 1500.to_s
    end
  end

end
