'use strict'

const Model = use('Model')

class Avatar extends Model {
  static get table () {
    return 'avatars'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
	}
}

module.exports = Avatar
