'use strict'

// مدل مرتبط با انواع مختاف و سطوح مختلف سانترفیوژ

const Model = use('Model')

class Fuge extends Model {
  static get table () {
    return 'fuges'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations

  levels () {
    return this.hasMany('App/Models/Level', 'id', 'fuge_id')
  }

  users () {
    return this.hasMany('App/Models/UserFuge', 'id', 'fuge_id')
  }
}

module.exports = Fuge
