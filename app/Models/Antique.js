'use strict'

// مدل مرتبط با عتیقه های موجود در بازی

const Model = use('Model')

class Antique extends Model {
  static get table () {
    return 'antiques'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
  // Relations

  users () {
    return this.hasMany('App/Models/UserAntique', 'id', 'antique_id')
  }
}

module.exports = Antique
