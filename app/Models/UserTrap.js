'use strict'

// مدل مرتبط با تله های در اختیار هر کاربر 

const Model = use('Model')

class UserTrap extends Model {
  static get table () {
    return 'users_traps'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  trap () {
    return this.belongsTo('App/Models/Trap', 'trap_id', 'id')
  }
}

module.exports = UserTrap
