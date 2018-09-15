'use strict'

// آمارهای مرتبط با مرکز مبادله

const Model = use('Model')

class Exchange extends Model {
  static get table () {
    return 'exchanges'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  pictures () {
    return this.hasMany('App/Models/ExchangeGallery', 'id', 'exchange_id')
  }

  codes () {
    return this.hasMany('App/Models/Code', 'id', 'exchange_id')
  }

  category () {
    return this.belongsTo('App/Models/ExchangeCategory', 'category_id', 'id')
  }

  item () {
    return this.belongsTo('App/Models/ExchangeItem', 'item_id', 'id')
  }

  notifications () {
    return this.hasMany('App/Models/Notification', 'id', 'exchange_id')
  }
}

module.exports = Exchange
