'use strict'

// مدل های مرتبط با اعلان های مرکز مبادله

const Model = use('Model')

class IntelligentNotification extends Model {
  static get table () {
    return 'intelligent_notification'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = IntelligentNotification
