'use strict'

// مدل مرتبط با اعلان های ارسال شده به هر کاربر 

const Model = use('Model')

class UserRecall extends Model {
  static get table () {
    return 'user_recall'
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

module.exports = UserRecall
