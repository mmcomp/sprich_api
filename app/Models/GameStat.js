'use strict'

// مدل های مرتبط با آمارهای بازی

const Model = use('Model')

class GameStat extends Model {
  static get table () {
    return 'game_stat'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }
}

module.exports = GameStat
