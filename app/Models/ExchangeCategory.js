'use strict'

const Model = use('Model')

// مدل مرتبط با دسته بندی های محصولات در مرکز مبادله

class ExchangeCategory extends Model {
  static get table () {
    return 'exchanges_categories'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  exchanges () {
    return this.hasMany('App/Models/Exchange', 'id', 'category_id')
  }
}

module.exports = ExchangeCategory
