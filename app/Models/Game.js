'use strict'

// مدل مرتبط به بازی های داخل سیستم

const Model = use('Model')

class Game extends Model {
  static get table () {
    return 'games'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  gameItems () {
    return this.hasMany('App/Models/GameItem', 'id', 'game_id')
  }

  // Methods
}

module.exports = Game
