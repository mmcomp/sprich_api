'use strict'

// مدل مرتبط با جزئیات تغییر داریی کاربر

const Model = use('Model')

class Log extends Model {
  static get table () {
    return 'log'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
	}
}

module.exports = Log
