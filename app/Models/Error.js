'use strict'

// مدل مرتبط با ذخیره خطاهای نرم افزاری اتفاق افتاده در سیستم

const Model = use('Model')

class Error extends Model {
  static get table () {
    return 'errors'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
      return 'updated_at'
  }
  // Relations

}

module.exports = Error
