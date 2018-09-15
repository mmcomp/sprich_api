'use strict'

// مدل مرتبط با عتیقه های در اختیار کاربران

const Model = use('Model')
const Setting = use('App/Models/Setting')

const Moment = use('App/Libs/Moment')
const Time = Moment.moment()
const _ = require('lodash')

class UserAntique extends Model {
  static boot () {
    super.boot()
    this.addHook('afterFetch', 'UserAntiqueHook.checkStatus')
  }

  static get table () {
    return 'users_antiques'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  antique () {
    return this.belongsTo('App/Models/Antique', 'antique_id', 'id')
  }

  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }

  // Method
  // محسابه زمان تا آماده شدن انرژی زرد موجود در عتیقه
  static async calculateMinutes (antique) {
    let settings = await Setting.get()
    if(antique.ye<=1){
      antique.ye = 1;
    }
    return _.round(settings.antique_bulk / antique.ye)
  }

  // محسابه این که در چه زمانی انرژی زرد موجود در عتیقه آماده برداشت می باشد .
  static async calculateReadyAt (antique) {
    let min = await this.calculateMinutes(antique)
    return Time().add(min, 'minutes').format('YYYY-M-D HH:mm:ss')
  }

  calculateRemaining () {
    return Time(this.ready_at).diff(Time(), 'seconds')
  }
}

module.exports = UserAntique
