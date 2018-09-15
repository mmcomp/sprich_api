'use strict'

// مدل مرتبط با هرگونه درخواست و پاسخ از سمت سرور

const Model = use('Model')

class RequestLog extends Model {
  static get table () {
    return 'request_log'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
	}
}

module.exports = RequestLog
