'use strict'

// مدل مرتبط با مدیریت گردنبند ها

const Model = use('Model')

class Necklace extends Model {
  static get table () {
    return 'necklaces'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  levels () {
    return this.hasMany('App/Models/Level', 'id', 'necklace_id')
  }
}

module.exports = Necklace
