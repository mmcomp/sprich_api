'use strict'

// ممدل مرتبط با تصاویر موجود در مرکز مبادله

const Model = use('Model')

class ExchangeGallery extends Model {
  static get table () {
    return 'exchanges_galleries'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  exchanges () {
    return this.has('App/Models/Exchange', 'exchange_id', 'id')
  }
}

module.exports = ExchangeGallery
