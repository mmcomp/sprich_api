'use strict'

const Model = use('Model')

class WeeklyGift extends Model {
  static get table () {
    return 'weekly_gifts'
  }
}

module.exports = WeeklyGift
