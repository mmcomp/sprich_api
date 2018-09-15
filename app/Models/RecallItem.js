'use strict'

// مدل مرتبط با درصد های برد عتیقه در هر زمین در فراخوان ها

const Model = use('Model')

class RecallItem extends Model {
  static get table () {
    return 'recalls_items'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
}

module.exports = RecallItem
