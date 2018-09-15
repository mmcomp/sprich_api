'use strict'

// مدل مرتبط به مدل های و سطوح کاربری

const Model = use('Model')

class Level extends Model {
  static get table () {
    return 'levels'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
  // Relations

  users () {
    return this.hasMany('App/Models/User', 'id', 'level_id')
  }

  necklace () {
    return this.belongsTo('App/Models/Necklace', 'necklace_id', 'id')
  }

  fuge () {
    return this.belongsTo('App/Models/Fuge', 'fuge_id', 'id')
  }
}

module.exports = Level
