'use strict'

// مدل مرتبط با تله های در اختیار هر کاربر 

const Model = use('Model')

class UserAvatar extends Model {
  static get table () {
    return 'users_avatar'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  avatar () {
    return this.belongsTo('App/Models/Avatar', 'avatar_id', 'id')
  }
}

module.exports = UserAvatar
