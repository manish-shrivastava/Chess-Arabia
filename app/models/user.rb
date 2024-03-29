class User < ActiveRecord::Base

  has_attached_file :photo, :s3_credentials => "#{Rails.root}/config/s3.yml", :path => "chess_arabia_photos/:id/:basename_:style.:extension", :storage => :s3, :styles => { :thumb => ["38x50#", :jpg], :profile => ["205x245#", :jpg], :big => ["450x450#", :jpg], :medium => ["122X159#", :jpg] }

  # Setup accessible (or protected) attributes for your model
  attr_accessible :email, :password, :password_confirmation, :remember_me, :identity_url, :name, :country, :photo

  # Include default devise modules. Others available are:
  # :token_authenticatable, :confirmable, :lockable and :timeoutable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable#, :validatable

  devise :openid_authenticatable

  validates_presence_of :name, :email
  validates_uniqueness_of :email
  validates_format_of :email, :with => /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}/
  validates_length_of :password, :minimum => 4, :if => "identity_url.blank?", :unless => Proc.new { |a| a.password.blank? }

  def self.build_from_identity_url(identity_url)
    #debugger
    u = User.new(:identity_url => identity_url)
  end

  def self.openid_required_fields
    ["http://axschema.org/contact/email", "http://axschema.org/namePerson/first", "http://axschema.org/namePerson/last", "http://axschema.org/contact/country/home"]
  end

  def self.player_code_name(player_code)
    return nil if player_code.nil?
    return I18n.translate(:computer) if player_code == 'computer'
    player_code.match(/\Aguest_/) ? REDIS.get('player_name_' + player_code) + "" : User.find_by_email(player_code).name
  end

  def self.guest?(player_code)
    player_code.match(/\Aguest_/)
  end

  def openid_fields=(fields)
    fields.each do |key, value|
      # Some AX providers can return multiple values per key
      if value.is_a? Array
        value = value.first
      end

      case key.to_s
      when "http://axschema.org/namePerson/first"
        self.name ||= ""
        return true if self.name.match value
        self.name = "#{value} #{self.name}"
      when "http://axschema.org/namePerson/last"
        self.name ||= ""
        return true if self.name.match value
        self.name = "#{self.name} #{value}"
      when "http://axschema.org/contact/country/home"
        # NOTHING
      when "email", "http://axschema.org/contact/email"
        self.email = value
      when "gender", "http://axschema.org/person/gender"
        self.gender = value
      else
        logger.error "Unknown OpenID field: #{key}"
      end
    end
  end

end
