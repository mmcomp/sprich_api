'use strict'

// مدل مرتبط به تکه های پازل که به کاربران اهدا می شود .

const Model = use('Model')

class Puzzle extends Model {
  static get table () {
    return 'users_puzzle'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
}

module.exports = Puzzle
