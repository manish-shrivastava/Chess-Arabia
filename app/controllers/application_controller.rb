class ApplicationController < ActionController::Base
  protect_from_forgery
  
  before_filter :reload_classes, :set_player, :set_locale, :set_current_tab
  
  def reload_classes
    #load File.join(Rails.root, 'app', 'models', 'game.rb')
  end
  
  def set_current_tab
    @current_tab = params[:controller]
    @current_tab = 'about' if params[:controller] == 'home' && params[:action] == 'about'
    @current_tab = 'top_players' if params[:controller] == 'players' && params[:action] == 'top'
    @current_tab = 'sign_up' if params[:controller] == 'devise/registrations' && params[:action] == 'new'
    @current_tab = 'sign_in' if params[:controller] == 'devise/sessions' && params[:action] == 'new'
  end
  
  def set_locale
    cookies[:locale] = params[:locale] ? params[:locale].to_sym : (cookies[:locale] || 'ar')
    I18n.locale = cookies[:locale]
  end
  
  def set_player
    if current_user
      @guest = false
      @player_code = current_user.email
      @player_name = current_user.name
    else
      @guest = true
      @player_code = cookies[:player_code]
      if @player_code
        @player_name = cookies[:player_name]
        REDIS.set 'player_name_' + @player_code, @player_name
      else
        # Setting Guest for the first time
        @player_name = "Unkown"
        code = ('a'..'z').to_a.concat(('0'..'9').to_a).concat(('A'..'Z').to_a).sort_by { rand }[0, 6].join
        @player_code = "guest_#{code}"
        cookies[:player_code] = @player_code
        cookies[:player_name] = @player_name
        REDIS.set 'player_name_' + @player_code, @player_name
      end
    end
  end

end
