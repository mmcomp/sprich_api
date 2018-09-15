'use strict'

// مدل مرتبط با notification که در واقع همان پیام های تبایعاتی و سیستمی هستند که توسط مدیریت برای کاربران ارسال می شود .

const Model = use('Model')

class Notification extends Model {
  static get table () {
    return 'notifications'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = Notification
