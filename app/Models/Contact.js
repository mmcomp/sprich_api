'use strict'

// مدل مرتبط با بخش ارتباط با ما از طریق اپ

const Model = use('Model')

class Contact extends Model {
  static get table () {
    return 'users'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
}

module.exports = Contact
