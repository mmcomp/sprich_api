'use strict'

// مدل مرتبط با فراخوان های بازی

const Model = use('Model')

class Recall extends Model {
  static get table () {
    return 'recalls'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = Recall
