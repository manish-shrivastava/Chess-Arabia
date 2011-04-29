Countries = ActiveSupport::JSON.decode(File.open(File.join(Rails.root, 'config', 'countries.txt'))).reject{|c| c.last.blank?}
