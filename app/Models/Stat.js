'use strict'

// مدل های مرتبط با آمارهای کلی پنل مدیریت

const Model = use('Model')
const Env = use('Env')
const Redis = use('Redis')
class Stat extends Model {
  static get table () {
    return 'stats'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Methods
  // آفزایش یک پله ای آمار بازدید از مرکز مبادله و ثبت در redis
  static async incrementView () {
    await Redis.select(Env.get('REDIS_STAT_DATABASE'))
    let exists = await Redis.get(Env.get('REDIS_STAT_EXCHANGE_VIEW'))

    if (!exists) {
      exists = 0
    }
    exists++
    await Redis.set(Env.get('REDIS_STAT_EXCHANGE_VIEW'), exists)
  }
}

module.exports = Stat
