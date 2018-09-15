'use strict'

// مدل مرتبط با آمارهای مرکز مبادله

const Model = use('Model')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

class ExchangeStat extends Model {
  static get table () {
    return 'exchanges_stat'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Methods
  // افزایش یک پله ای آمار بازدید از یک کالا در مرکز مبادله
  static async incrementStat (id) {
    let stat = await ExchangeStat.query().where('id', id).where('date', Time().format('YYYY-M-D')).first()

    if (!stat) {
      stat = new ExchangeStat()
      stat.date = Time().format('YYYY-M-D')
      stat.exchange_id = id
      stat.view = 0
    }

    stat.view++
    await stat.save()
  }
}

module.exports = ExchangeStat
