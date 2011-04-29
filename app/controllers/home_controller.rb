class HomeController < ApplicationController

  skip_before_filter :check_ie, :only => [:ie]

  def index
    render 'homepage'
  end
  
  def set_guest_name
    if @guest
      cookies[:player_name] = params[:guest_name]
      @player_name = cookies[:player_name]
      REDIS.set 'player_name_' + @player_code, @player_name
    end
    render :update do |page|
      page[".user_info .info"].html(@player_name)
      page << "$('#set_guest_name').dialog('close')"
    end
  end

end
