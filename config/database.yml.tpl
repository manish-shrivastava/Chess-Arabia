development: &defaults
  adapter: postgresql
  encoding: unicode
  reconnect: true
  database: chess_arabia_development
  pool: 5
  username: omar
  password: password_here

test:
  <<: *defaults
  database: chess_arabia_test

production:
  <<: *defaults
  database: chess_arabia_production
