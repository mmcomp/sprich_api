'use strict'

// مدل های مرتبط با اعلان های مرکز مبادله

const Model = use('Model')

class ExchangeNotification extends Model {
  static get table () {
    return 'exchange_notification'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  exchange () {
    return this.belongsTo('App/Models/Exchange', 'exchange_id', 'id')
  }
}

module.exports = ExchangeNotification
