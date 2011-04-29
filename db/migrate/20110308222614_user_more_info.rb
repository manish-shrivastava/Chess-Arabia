class UserMoreInfo < ActiveRecord::Migration
  def self.up
    add_column :users, :country, :string
    add_column :users, :wins, :integer, :default => 0
    add_column :users, :losts, :integer, :default => 0
  end

  def self.down
  end
end
