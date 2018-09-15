'use strict'

// مدل مرتبط با هدایای هفتگی ارسال شده به هر کاربر 

const Model = use('Model')

class UserGift extends Model {
  static get table () {
    return 'users_gifts'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }
}

module.exports = UserGift
