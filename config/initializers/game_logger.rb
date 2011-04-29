class GameLogger < Logger
  def format_message(severity, timestamp, progname, msg)
    "#{msg}\n"
  end
end
