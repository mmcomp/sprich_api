'use strict'

// مدل مرتبط با صندوقچه های جایزه

const Model = use('Model')
const Messages = use('App/Libs/Messages/Messages')
const Recall = use('App/Models/Recall')
const RecallItem = use('App/Models/RecallItem')
const Game = use('App/Models/Game')
const RecallAntique = use('App/Models/RecallAntique')
const UserAntique = use('App/Models/UserAntique')
const Log = use('App/Models/Log')

const _ = require('lodash')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

class Award extends Model {
  static get table () {
    return 'awards'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  awardItems () {
    return this.hasMany('App/Models/AwardItem', 'id', 'award_id')
  }

  gameItem () {
    return this.hasMany('App/Models/gameItem', 'id', 'game_id')
  }

  // Methods
  // محاسبه جوایز کسب شده در صورت موفقیت حمله به یک کاربر دیگر
  static async calculateAwards (user, gameItem, awards, levelUpBe, levelUpYe, gameData) {
    let data = {}
    let userData = user.toJSON()
    let sumPercent = 0
    
    levelUpBe = (levelUpBe)?levelUpBe:0
    levelUpYe = (levelUpYe)?levelUpYe:0
    gameData = (gameData)?gameData:{
      type: 'mine_finish',
      id: 0
    }

    for (const item of awards.awardItems) {
      sumPercent += item.percent
    }

    let selectedAward
    let randomAward = _.random(0, sumPercent)
    let currentPercent = 0
    let selectedIndex = 0

    for (const item of awards.awardItems) {
      if (randomAward >= currentPercent && randomAward < (currentPercent + item.percent)) {
        selectedAward = item
        break
      }
      selectedIndex++
      currentPercent += item.percent
    }

    if (!selectedAward) {
      return {
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      }
    }

    let userAward = {
      necklace: selectedAward.necklace,
      yellow: _.random(selectedAward.ye_min, selectedAward.ye_max),
      blue: _.random(selectedAward.be_min, selectedAward.be_max),
      elixir: _.random(selectedAward.elixir_min, selectedAward.elixir_max),
      antique: []
    }

    const log = new Log()
    log.type = gameData.type
    log.type_id = gameData.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    log.after_state = JSON.stringify({
      ye: userAward.yellow+userData.property.ye,
      be: userAward.blue+userData.property.be,
      elixir_1: userAward.elixir+userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    await log.save()

    userData.property.ye += userAward.yellow + levelUpYe
    userData.property.be += userAward.blue + levelUpBe
    userData.property.elixir_1 += userAward.elixir

    user.elixir_reward += userAward.elixir
    user.blue_reward += userAward.blue + levelUpBe
    await user.save()

    await gameItem.updateStat('success', {
      'ye': userAward.yellow,
      'be': userAward.blue,
      'elixir': userAward.elixir
    })

    await user.awardStat(userAward)
    await user.property().update(userData.property)



    if (selectedAward.necklace) {
      await user.calculateNecklace()
    }

    let userAwardsList = []
    _.each(awards.awardItems, (aw, index) => {
      if (index == selectedIndex) {
        userAward.percent = aw.percent
        userAwardsList.push(userAward)
      } else {
        userAwardsList.push({
          necklace: aw.necklace,
          percent: aw.percent,
          yellow: _.random(aw.ye_min, aw.ye_max),
          blue: _.random(aw.be_min, aw.be_max),
          elixir: _.random(aw.elixir_min, aw.elixir_max)
        })
      }
    })

    // Check Puzzle
    let puzzleResult = await user.calculatePuzzle()
    if (puzzleResult) {
      data.puzzle = puzzleResult
    }

    // Check level
    let newLevel = await user.checkLevel()
    if (newLevel) {
      data.level = newLevel
    }

    // Check For recalls
    let game = await Game.query().where('id', gameItem.game_id).first()
    let activeRecall = await Recall.query().where('status', 'active').where('started_at', '<=', Time().format('YYYY-M-D')).where('expired_at', '>', Time().format('YYYY-M-D')).where('game', game.type).first()

    if (activeRecall) {
      let currentPercent = activeRecall.percent

      let recallGame = await RecallItem.query().where('recall_id', activeRecall.id).where('game_id', gameItem.id).first()
      if (recallGame) {
        currentPercent = recallGame.percent
      }

      if (_.random(0, 1, true) <= (currentPercent / 100)) {
        let antique = await RecallAntique.query().where('recall_id', activeRecall.id).where('remainder', '>', 0).orderByRaw('RAND()').with('antique').first()
        if (antique) {
          let antiqueData = antique.toJSON()
          const readyAt = await UserAntique.calculateReadyAt(antique.antique)
          await UserAntique.create({
            user_id: user.id,
            antique_id: antique.antique_id,
            status: 'working',
            ready_at: readyAt
          })

          user.score += antiqueData.antique.score_first
          await user.save()

          antique.remainder--
          await antique.save()

          userAward.antique.push({
            name: antiqueData.antique.name,
            description: antiqueData.antique.description,
            image: antiqueData.antique.image,
            score: antiqueData.antique.score_first
          })
        }
      }
    }

    data.reward = userAward
    data.reward_index = selectedIndex
    data.rewards = userAwardsList

    return {
      status: 1,
      messages: [],
      data: data
    }
  }
}

module.exports = Award
