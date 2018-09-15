'use strict'

// مدل مرتبط با جوایز زیر مجموعه هر صندوقچه جایزه

const Model = use('Model')

class AwardItem extends Model {
  static get table () {
    return 'awards_items'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  award () {
    return this.belongsTo('App/Models/Award', 'award_id', 'id')
  }
}

module.exports = AwardItem
