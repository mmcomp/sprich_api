'use strict'

// مدل مرتبط با تنظیمات کلی سیستم در پنل مدیریت پر می شوند

const Model = use('Model')

class Setting extends Model {
  static get table() {
    return 'settings'
  }

  static get createdAtColumn() {
    return null
  }

  static get updatedAtColumn() {
    return null
  }

  // Methods
  // دریافت لیست کلیه تنظیمات بازی به صورت یکجا
  static async get() {
    let settings = await Setting.first()

    return settings
  }
}

module.exports = Setting