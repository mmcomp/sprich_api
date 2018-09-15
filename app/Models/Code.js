'use strict'

// مدل مرتبط با کدهای مرکز مبادله

const Model = use('Model')

class Code extends Model {
  static get table () {
    return 'codes'
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

module.exports = Code
