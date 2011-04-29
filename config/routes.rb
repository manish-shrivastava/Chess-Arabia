ChessArabia::Application.routes.draw do
  devise_for :users

  match '/about', :to => "home#about"
  match '/help', :to => "home#help"
  match '/set_guest_name', :to => "home#set_guest_name", :as => 'set_guest_name', :method => "post"

  root :to => "home#index"
  resources :games do
    collection do
      get :index
      post :play_with_computer
    end
    member do
      post :sit
      post :move
      get :replace
    end
  end

  resources :players do
    collection do
      get :top
    end
  end

end
