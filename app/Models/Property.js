'use strict'

// مدل مرتبط با دارایی های کاربران

const Model = use('Model')

class Property extends Model {
  static get table () {
    return 'users_property'
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

module.exports = Property
