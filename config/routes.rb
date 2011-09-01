ChessArabia::Application.routes.draw do
  devise_for :users

  match '/about', :to => "home#about"
  match '/help', :to => "home#help"
  match '/set_guest_name', :to => "home#set_guest_name", :as => 'set_guest_name', :method => "post"

  root :to => "home#index"
  resources :games do
    collection do
      get :index
      post :play_against_computer
    end
    member do
      post :sit
      post :move
      post :replace
    end
  end

  resources :players do
    collection do
      get :top
      get :my_rating
    end
  end

end
