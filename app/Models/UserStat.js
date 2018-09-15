'use strict'

// جدول مرتبط به آمارهای هر کاربر که روزانه به ازای هر کاربر پر می شوند

const Model = use('Model')

class UserStat extends Model {
  static get table () {
    return 'users_stat'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }
}

module.exports = UserStat
