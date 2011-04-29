require 'rubygems'
require 'sinatra'
require 'redis'
require File.join(File.dirname(__FILE__), 'app', 'models', 'game.rb')

get 'games/:id/refresh' do
  g = Game.find(params[:id])
end
