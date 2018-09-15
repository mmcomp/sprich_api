'use strict'


const Model = use('Model')
const Env = use('Env')
const Redis = use('Redis')
class Ticket extends Model {
  static get table () {
    return 'tickets'
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

module.exports = Ticket
