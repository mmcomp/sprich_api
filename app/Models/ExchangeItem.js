'use strict'

// مدل های مرتبط با قرارداد های مرکز مبادله

const Model = use('Model')

class ExchangeItem extends Model {
  static get table () {
    return 'exchanges_items'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

 // Relations
  exchanges () {
    return this.hasMany('App/Models/Exchange', 'id', 'item_id')
  }
}

module.exports = ExchangeItem
