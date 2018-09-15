'use strict'

// مدل مرتبط با اطلاعات حساب بانکی کاربران

const Model = use('Model')

class Bank extends Model {
  static get table () {
    return 'banks'
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

module.exports = Bank
