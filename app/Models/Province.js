'use strict'

//  مدل مرتبط با اطلاعات استان های کشور برای نمایش در پروفایل کاربران برای انتخاب استان محل سکونت

const Model = use('Model')

class Province extends Model {
  static get table () {
    return 'provinces'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  user () {
    return this.hasMany('App/Models/User', 'id', 'province_id')
  }
}

module.exports = Province
