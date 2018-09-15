'use strict'

// مدل مرتبط با تله های موجود در بازی

const Model = use('Model')

class Trap extends Model {
  static get table () {
    return 'traps'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  users () {
    return this.hasMany('App/Models/UserTrap', 'id', 'trap_id')
  }
}

module.exports = Trap
