'use strict'

// مدل مرتبط به عتیقه های اهدایی به کاربران در هر فراخوان

const Model = use('Model')

class RecallAntique extends Model {
  static get table () {
    return 'recalls_antiques'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

    // Relations
  antique () {
    return this.belongsTo('App/Models/Antique', 'antique_id', 'id')
  }
}

module.exports = RecallAntique
