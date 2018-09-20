'use strict'

const Model = use('Model')

class User extends Model {
  static get table () {
    return 'users'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = User
