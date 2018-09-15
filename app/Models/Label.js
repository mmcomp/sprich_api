'use strict'

// محل نگهداری برچسب های کاربران که در آمارها از آن ها استفاده می شود .

const Model = use('Model')

class Label extends Model {
  static get table () {
    return 'labels'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
}

module.exports = Label
