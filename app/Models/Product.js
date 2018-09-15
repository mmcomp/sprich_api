'use strict'

// مدل مرتبط با بخش معاوضه سکه با محصول در فروشگاه

const Model = use('Model')

class Product extends Model {
  static get table () {
    return 'products'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = Product
