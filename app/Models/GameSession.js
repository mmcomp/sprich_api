'use strict'

// مدل مرتبط با بازی ها در حال اجرا که به ازای هر بازی یا حمله یک رکورد ایجاد می شود و تنها زمانی که بازی به پایان برسد این رکورد پاک خواهد شد .

const Model = use('Model')

class GameSession extends Model {
  static get table () {
    return 'game_sessions'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  game () {
    return this.belongsTo('App/Models/GameItem', 'game_id', 'id')
  }

  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }
}

module.exports = GameSession
