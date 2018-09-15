'use strict'

// مدل مرتبط با بازی های زیر مجموعه هر قبرستان به اساس درجه سختی و پارامتر های دیگر از هم تفکیک می شوند .

const Model = use('Model')

const GameStat = use('App/Models/GameStat')

const Moment = use('App/Libs/Moment')
const _ = require('lodash')
class GameItem extends Model {
  static get table () {
    return 'game_items'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  game () {
    return this.belongsTo('App/Models/Game', 'game_id', 'id')
  }

  award () {
    return this.belongsTo('App/Models/Award', 'award_id', 'id')
  }

  // Methods
  // ثبت این آمار که توسط این بازی چه جوایزی به کاربر داده شده است در طول یک روز
  async updateStat (type, awards = {}) {
    let stat = await GameStat.query().where('game_item_id', this.id).where('date', Moment.now('YYYY-M-D')).first()

    if (!stat) {
      stat = new GameStat()
      stat.game_item_id = this.id
      stat.date = Moment.now('YYYY-M-D')
      stat.play = 0
      stat.success = 0
      stat.award_elixir = 0
      stat.award_ye = 0
      stat.award_be = 0
    }

    if (type == 'success') {
      let aw = _.merge(awards, {
        ye: 0,
        be: 0,
        elixir: 0
      })

      stat.award_ye += aw.ye
      stat.award_be += aw.be
      stat.award_elixir += aw.elixir

      stat.success++
    } else {
      stat.play++
    }

    await stat.save()
  }
}

module.exports = GameItem
