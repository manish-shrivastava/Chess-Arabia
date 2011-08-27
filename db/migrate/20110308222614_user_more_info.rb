class UserMoreInfo < ActiveRecord::Migration
  def self.up
    add_column :users, :country, :string
    add_column :users, :wins, :integer, :default => 0
    add_column :users, :losts, :integer, :default => 0
    add_column :users, :admin, :boolean, :default => false
  end

  def self.down
    remove_column :users, :country
    remove_column :users, :wins
    remove_column :users, :losts
    remove_column :users, :admin
  end
end
