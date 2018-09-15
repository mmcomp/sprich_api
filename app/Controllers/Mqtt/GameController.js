'use strict'

const Game = use('App/Models/Game')
const Level = use('App/Models/Level')
const GameItem = use('App/Models/GameItem')
const GameSession = use('App/Models/GameSession')
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const Award = use('App/Models/Award')
const Log = use('App/Models/Log')
const Setting = use('App/Models/Setting')

const Redis = use('Redis')
const _ = require('lodash')
const randomatic = require('randomatic')
const Moment = use('App/Libs/Moment')
const MineSweeper = use('App/Libs/MineSweeper.js')
const Time = Moment.moment()
const Env = use('Env')
const hasha = require('hasha')

const hardness = [
  'very easy',
  'easy',
  'normal',
  'hard'
]
const gameName = ['front', 'back', 'cave', 'recall']
const label = {
  'none': 0,
  'ye': 1,
  'be': 2
}

class GameController {
  //  دریافت اطلاعات سیستمی داخل بازی
  static async info (params, user) {
    const rules = {
      gameLandType: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let results = []
    for (const hard of hardness) {
      let itemHardness = 0
      _.mapKeys(hardness, (value, index) => {
        if (value === hard) {
          itemHardness = index
        }
      })

      let game = await Game.query().where('type', gameName[params.gameLandType]).where('hardness', hard).first()
      if (game) {
        let gameItems = await game.gameItems().with('award').with('award.awardItems').fetch()
        let gameItemsData = gameItems.toJSON()
        let land = {
          name: game.name,
          hardness: itemHardness,
          gameLandInfos: []
        }

        for (const item of gameItemsData) {
          let awards = {
            yellow: [0, 0],
            blue: [0, 0],
            elixir: [0, 0]
          }

          _.each(item.award.awardItems, (itm) => {
            if (!_.has(awards, 'yellow')) {
              awards['yellow'] = [itm.ye_min, itm.ye_max]
            } else {
              if (awards['yellow'][0] < itm.ye_min) {
                awards['yellow'][0] = itm.ye_min
              }

              if (awards['yellow'][1] < itm.ye_max) {
                awards['yellow'][1] = itm.ye_max
              }
            }

            if (!_.has(awards, 'blue')) {
              awards['blue'] = [itm.be_min, itm.be_max]
            } else {
              if (awards['blue'][0] < itm.be_min) {
                awards['blue'][0] = itm.be_min
              }

              if (awards['blue'][1] < itm.be_max) {
                awards['blue'][1] = itm.be_max
              }
            }

            if (!_.has(awards, 'elixir')) {
              awards['elixir'] = [itm.elixir_min, itm.elixir_max]
            } else {
              if (awards['elixir'][0] < itm.elixir_min) {
                awards['elixir'][0] = itm.elixir_min
              }

              if (awards['elixir'][1] < itm.elixir_max) {
                awards['elixir'][1] = itm.elixir_max
              }
            }
          })

          if (params.gameLandType == 1) {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              }
            })
          } else {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              row: item.rows,
              col: item.cols,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              },
              cancel: {
                type: label[item.cancel_type],
                amount: item.cancel_amount
              },
              bombCount: item.bomb
            })
          }
        }
        results.push(land)
      } else {
        results.push({})
      }
    }

    return [{
      status: 1,
      messages: [],
      data: {
        lands: results
      }
    }]
  }
  static async mineInfo (params, user) {
    params['gameLandType'] = 0
    const rules = {
      gameLandType: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let results = []
    for (const hard of hardness) {
      let itemHardness = 0
      _.mapKeys(hardness, (value, index) => {
        if (value === hard) {
          itemHardness = index
        }
      })

      let game = await Game.query().where('type', gameName[params.gameLandType]).where('hardness', hard).first()
      if (game) {
        let gameItems = await game.gameItems().with('award').with('award.awardItems').fetch()
        let gameItemsData = gameItems.toJSON()
        let land = {
          name: game.name,
          hardness: itemHardness,
          gameLandInfos: []
        }
        // console.log('GAMES')
        for (const item of gameItemsData) {
          let awards = {/*
            yellow: [0, 0],
            blue: [0, 0],
            elixir: [0, 0]
          */}
          // console.log(item)
          _.each(item.award.awardItems, (itm) => {
            // console.log(itm)
            if (!_.has(awards, 'yellow')) {
              awards['yellow'] = [itm.ye_min, itm.ye_max]
            } else {
              if (awards['yellow'][0] > itm.ye_min/* || awards['yellow'][0] <= 0*/) {
                awards['yellow'][0] = itm.ye_min
              }

              if (awards['yellow'][1] < itm.ye_max) {
                awards['yellow'][1] = itm.ye_max
              }
            }

            if (!_.has(awards, 'blue')) {
              awards['blue'] = [itm.be_min, itm.be_max]
            } else {
              if (awards['blue'][0] > itm.be_min/* || awards['blue'][0] <= 0*/) {
                awards['blue'][0] = itm.be_min
              }

              if (awards['blue'][1] < itm.be_max) {
                awards['blue'][1] = itm.be_max
              }
            }

            if (!_.has(awards, 'elixir')) {
              awards['elixir'] = [itm.elixir_min, itm.elixir_max]
            } else {
              if (awards['elixir'][0] > itm.elixir_min/* || awards['elixir'][0] <= 0*/) {
                awards['elixir'][0] = itm.elixir_min
              }

              if (awards['elixir'][1] < itm.elixir_max) {
                awards['elixir'][1] = itm.elixir_max
              }
            }
          })

          if (params.gameLandType == 1) {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              }
            })
          } else {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              row: item.rows,
              col: item.cols,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              },
              cancel: {
                type: label[item.cancel_type],
                amount: item.cancel_amount
              },
              bombCount: item.bomb
            })
          }
        }
        results.push(land)
      } else {
        results.push({})
      }
    }

    return [{
      status: 1,
      messages: [],
      data: {
        lands: results
      }
    }]
  }
  static async smasherInfo (params, user) {
    params['gameLandType'] = 1
    const rules = {
      gameLandType: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let results = []
    for (const hard of hardness) {
      let itemHardness = 0
      _.mapKeys(hardness, (value, index) => {
        if (value === hard) {
          itemHardness = index
        }
      })

      let game = await Game.query().where('type', gameName[params.gameLandType]).where('hardness', hard).first()
      if (game) {
        let gameItems = await game.gameItems().with('award').with('award.awardItems').fetch()
        let gameItemsData = gameItems.toJSON()
        let land = {
          name: game.name,
          hardness: itemHardness,
          gameLandInfos: []
        }

        for (const item of gameItemsData) {
          let awards = {
            yellow: [0, 0],
            blue: [0, 0],
            elixir: [0, 0]
          }

          _.each(item.award.awardItems, (itm) => {
            if (!_.has(awards, 'yellow')) {
              awards['yellow'] = [itm.ye_min, itm.ye_max]
            } else {
              if (awards['yellow'][0] > itm.ye_min || awards['yellow'][0] <= 0) {
                awards['yellow'][0] = itm.ye_min
              }

              if (awards['yellow'][1] < itm.ye_max) {
                awards['yellow'][1] = itm.ye_max
              }
            }

            if (!_.has(awards, 'blue')) {
              awards['blue'] = [itm.be_min, itm.be_max]
            } else {
              if (awards['blue'][0] > itm.be_min || awards['blue'][0] <= 0) {
                awards['blue'][0] = itm.be_min
              }

              if (awards['blue'][1] < itm.be_max) {
                awards['blue'][1] = itm.be_max
              }
            }

            if (!_.has(awards, 'elixir')) {
              awards['elixir'] = [itm.elixir_min, itm.elixir_max]
            } else {
              if (awards['elixir'][0] > itm.elixir_min || awards['elixir'][0] <= 0) {
                awards['elixir'][0] = itm.elixir_min
              }

              if (awards['elixir'][1] < itm.elixir_max) {
                awards['elixir'][1] = itm.elixir_max
              }
            }
          })

          if (params.gameLandType == 1) {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              }
            })
          } else {
            land.gameLandInfos.push({
              gameLandID: item.id,
              rewardInfos: awards,
              gameTime: item.time,
              row: item.rows,
              col: item.cols,
              hardness: parseInt(itemHardness),
              score: item.score,
              depo: {
                type: label[item.depo_type],
                amount: item.depo_amount
              },
              cancel: {
                type: label[item.cancel_type],
                amount: item.cancel_amount
              },
              bombCount: item.bomb
            })
          }
        }
        results.push(land)
      } else {
        results.push({})
      }
    }

    return [{
      status: 1,
      messages: [],
      data: {
        lands: results
      }
    }]
  }
  // ایجاد بازی سیستمی جدید
  static async create (params, user) {
    // console.log('Create Game',params)
    const rules = {
      gameLandID: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    await user.loadMany(['property'])
    let userData = user.toJSON()

    let game = await GameItem.query().where('status', 'active').where('id', params.gameLandID).with('game').first()
    if (!game) {
      return [{
        status: 1,
        messages: Messages.parse(['GameNotFound']),
        data: {}
      }]
    }

    if (game.depo_type != 'none') {
      if (userData.property[game.depo_type] < game.depo_amount) {
        return [{
          status: 0,
          messages: Messages.parse([game.depo_type + 'NotEnough']),
          data: {}
        }]
      }
      const log = new Log()
      let gameData = game.toJSON()
      const gameTypes = {
        'front': 'mine_start',
        'back': 'smasher_start'
      }

      log.type = (gameTypes[gameData.game.type])?gameTypes[gameData.game.type]:'unknown'
      log.type_id = gameData.id
      log.user_id = user.id
      log.before_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3
      })
      let logState = {
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3
      }
      logState[game.depo_type] -= game.depo_amount
      log.after_state = JSON.stringify(logState)
      await log.save()
      userData.property[game.depo_type] = userData.property[game.depo_type] - game.depo_amount
      if(game.depo_type=='be'){
        user.blue_depo += game.depo_amount
        await user.save()
      }
      await user.property().update(userData.property)
    }
    let stageKey = randomatic('Aa', 30)
    stageKey = 'game_' + stageKey

    let gameSession = new GameSession()
    gameSession.user_id = user.id
    gameSession.game_id = game.id
    gameSession.depo_type = game.depo_type
    gameSession.depo_amount = game.depo_amount
    gameSession.session_id = stageKey
    await gameSession.save()
    // console.log('gamesession',gameSession.toJSON())

    await Redis.select(1)
    await Redis.hmset(stageKey, [
      'user',
      user.id,
      'rows',
      game.rows,
      'cols',
      game.cols,
      'bombs',
      game.bomb,
      'game',
      game.id,
      'flags',
      JSON.stringify([])
    ])
    let depoTraslate = {
      'ye': 1,
      'be': 2
    }
    // console.log('Game Time ', game.time + 8)
    await Redis.expire(stageKey, game.time + 8)
    await game.updateStat('play')
    return [{
      status: 1,
      messages: [],
      data: {
        gameLandSession: stageKey,
        row: game.rows,
        col: game.cols,
        gameTime: game.time,
        bombs: game.bomb,
        depo: depoTraslate[game.depo_type]
      }
    }]
  }

  // انجام بازی سیستمی جدید
  static async play (params, user) {
    const rules = {
      gameLandSession: 'required',
      type: 'required',
      row: 'required',
      col: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }
    await user.loadMany(['property', 'level'])
    let userData = user.toJSON()

    let target = [params.row, params.col]
    let stageId = params.gameLandSession

    let actionType = ['fill', 'flag']
    let action = actionType[params.type]

    await Redis.select(1)
    let stageExists = await Redis.keys(stageId)
    let response = {
      flagType: -1,
      winStatus: -1,
      gridArray: [],
      rewards: [],
      loseGameType: -1
    }

    if (!stageExists.length) {
      return [{
        status: 0,
        messages: Messages.parse(['stageNotFound']),
        data: response
      }]
    }

    let stage = await Redis.hgetall(stageId)
    if (!_.inRange(target[0], 0, stage.rows) || !_.inRange(target[1], 0, stage.cols)) {
      return [{
        status: 0,
        messages: Messages.parse(['targetOutOfRange']),
        data: response
      }]
    }
    const fill = await MineSweeper.fill(stageId, stage, target, action)

    let game = await GameItem.query().where('id', stage.game).with('award').with('award.awardItems').first()
    let gameData = game.toJSON()


    let levels, levelJson, levelUp =  {
      status: false,
      yellow: 0,
      blue: 0
    }

    // بررسی پایان بازی و در صورت پایان بازی اهدای جوایز
    if (fill['data']['winStatus'] == 0) {
      await user.property().update({
        lose_minesweeper: userData.property.lose_minesweeper+1
      })
      user.game_lose++
      levels = await Level.query().where('score_min','<=',user.score).where('score_max','>=',user.score).first()
    } else if (fill['data']['winStatus'] == 1) {
      user.score += gameData.score
      user.game_success++

      levels = levels = await Level.query().where('score_min','<=',user.score).where('score_max','>=',user.score).first()

      if(levels){
        levelJson = levels.toJSON()
      }else{
        // console.log(user.toJSON())
        let userJSON = user.toJSON()
        levelJson = userJSON.level
      }
      levelJson.score = user.score
      levelJson.blue = levelJson.be
      levelJson.yellow = levelJson.ye
      if(user.level_id<levelJson.id){
        let oldLevel = await Level.query().where('id', user.level_id).first()
        oldLevel.users--
        oldLevel.save()
        let newLevel = await Level.query().where('id', levelJson.id).first()
        newLevel.users++
        newLevel.save()

        user.level_id = levelJson.id
        levelUp =  {
          status: true,
          yellow: levelJson.ye,
          blue: levelJson.be,
          message: levelJson.levelup_message
        }

        const log = new Log()
        log.type = 'levelup'
        log.type_id = levelJson.id
        log.user_id = user.id
        log.before_state = JSON.stringify({
          ye: userData.property.ye,
          be: userData.property.be,
          elixir_1: userData.property.elixir_1,
          elixir_2: userData.property.elixir_2,
          elixir_3: userData.property.elixir_3
        })
        log.after_state = JSON.stringify({
          ye: levelJson.ye+userData.property.ye,
          be: levelJson.be+userData.property.be,
          elixir_1: userData.property.elixir_1,
          elixir_2: userData.property.elixir_2,
          elixir_3: userData.property.elixir_3
        })
        await log.save()
      }

      let gData = {
        type: 'mine_finish',
        id: stage.game
      }

      let userAwards = await Award.calculateAwards(user, game, gameData.award, levelUp.blue, levelUp.yellow, gData)
      if (!userAwards.status) {
        return [{
          status: 0,
          messages: userAwards.messages,
          data: userAwards.data
        }]
      }

      await user.property().update({
        success_minesweeper: userData.property.success_minesweeper+1
      })

      fill['data']['chance_wheel'] = userAwards.data
    }

    if (fill['data']['winStatus'] > -1) {
      let gameSession = await GameSession.query().where('user_id', user.id).where('session_id', params.gameLandSession).first()
      if (gameSession) {
        await gameSession.delete()
      }

      await Redis.del(stageId)
    }


    fill['data']['level'] = levelJson
    fill['data']['level_up'] = levelUp

    await user.save()

    return [{
      status: fill['status'],
      messages: Messages.parse(fill['messages']),
      data: fill['data']
    }]
  }

  static async mineSweeperFinish (params, user) {
    try {
      if(params['session']){
        params['gameLandSession'] = params['session']
      }
      
      const rules = {
        gameLandSession: 'required',
        hash: 'required'
      }

      let check = await Validations.check(params, rules)
      if (check.err) {
        return [{
          status: 0,
          messages: check.messages,
          data: {}
        }]
      }

      let settings = await Setting.get()

      await user.loadMany(['property', 'level'])
      let userData = user.toJSON()
      // console.log('session from','user_id='+user.id,'session_id='+params.gameLandSession)
      let session = await GameSession.query().where('type', 'system').where('user_id', user.id).where('session_id', ''+params.gameLandSession+'').with('game').first()
      // console.log('session',session)
      if (!session) {
        return [{
          status: 0,
          messages: Messages.parse(['GameNotFound']),
          data: {}
        }]
      }

      let game = await GameItem.query().where('id', session.game_id).with('award').with('award.awardItems').first()
      let gameData = game.toJSON()

      const storeHash = hasha('win' + Env.get('ATTACK_SESSION') + params.gameLandSession, {
        algorithm: 'sha256'
      }).toUpperCase()

      let data = {}
      let levelUp = {
        status: false,
        yellow: 0,
        blue: 0
      }
      let levelJson = {
        id: -1,
        name: '',
        score_min: 0,
        score_max: 0,
        be: 0,
        ye: 0
      }
      await Redis.del(params.gameLandSession)
      // await user.save()
      if (storeHash != params.hash) {
        await user.property().update({
          lose_smasher: userData.property.lose_smasher+1
        })

        let blueLost = 0, yellowLost = 0
        if(gameData.depo_type=='be' && user.blue_lost < settings.blue_lost_max) {
          blueLost = parseInt(gameData.depo_amount * settings.blue_lost_percent / 100, 10)
          user.blue_lost += blueLost
          if(user.blue_lost > settings.blue_lost_max) {
            user.blue_lost = settings.blue_lost_max
          }
        } else if(gameData.depo_type=='ye' && user.yellow_lost < settings.yellow_lost_max) {
          yellowLost = parseInt(gameData.depo_amount * settings.yellow_lost_percent / 100, 10)
          user.yellow_lost += yellowLost
          if(user.yellow_lost > settings.yellow_lost_max) {
            user.yellow_lost = settings.yellow_lost_max
          }
        }

        user.game_lose++
        await user.save()
        // await game.delete()
        // await Redis.del(params.gameLandSession)
        // await user.save()
      } else {
        
        user.score += gameData.score

        let levels = await Level.query().where('score_min','<=',user.score).where('score_max','>=',user.score).first()
        let tmplevelJson

        if(levels){
          tmplevelJson = levels.toJSON()
        }else{
          tmplevelJson = userData.level
        }

        levelJson.id = tmplevelJson.id
        levelJson.name = tmplevelJson.name
        levelJson.score_min = tmplevelJson.score_min
        levelJson.score_max = tmplevelJson.score_max
        levelJson.score = user.score
        levelJson.blue = tmplevelJson.be
        levelJson.yellow = tmplevelJson.ye
        user.game_success++
        if(user.level_id<levelJson.id){
          let oldLevel = await Level.query().where('id', user.level_id).first()
          oldLevel.user--
          oldLevel.save()
          let newLevel = await Level.query().where('id', levelJson.id).first()
          if(isNaN(parseInt(newLevel.user, 10))) {
            newLevel.user = 0
          }
          newLevel.user++
          newLevel.save()

          user.level_id = levelJson.id
          levelUp.status = true
          levelUp.yellow = tmplevelJson.ye
          levelUp.blue = tmplevelJson.be
          levelUp.message = tmplevelJson.levelup_message

          const log = new Log()
          log.type = 'levelup'
          log.type_id = levelJson.id
          log.user_id = user.id
          log.before_state = JSON.stringify({
            ye: userData.property.ye,
            be: userData.property.be,
            elixir_1: userData.property.elixir_1,
            elixir_2: userData.property.elixir_2,
            elixir_3: userData.property.elixir_3
          })
          log.after_state = JSON.stringify({
            ye: tmplevelJson.ye+userData.property.ye,
            be: tmplevelJson.be+userData.property.be,
            elixir_1: userData.property.elixir_1,
            elixir_2: userData.property.elixir_2,
            elixir_3: userData.property.elixir_3
          })
          await log.save()

        }
        
        
        await user.save()
        
        let gData = {
          type: 'mine_finish',
          id: session.game_id
        }
        let userAwards = await Award.calculateAwards(user, game, gameData.award, levelUp.blue, levelUp.yellow, gData)
        if (!userAwards.status) {
          return [{
            status: 0,
            messages: userAwards.messages,
            data: userAwards.data
          }]
        }

        await user.property().update({
          success_smasher: userData.property.success_smasher+1
        })

        data = userAwards.data
        
      }

      // await game.delete()
      

      return [{
        status: 1,
        messages: [],
        data: {
          chance_wheel: data,
          level_up: levelUp,
          level: levelJson
        }
      }]
    }catch (error) {
      // log error
      // SentryException.captureException(error)

      return [{
        status: 0,
        messages: [{code:'UnknownError', message: JSON.stringify(error)}],//Messages.parse(['UnknownError']),
        data: {}
      }]
    }
  }

  // اعلام پایان بازی توسط کلاینت در بازی های اسمشر و مشخص شدن برد و باخت بازیکن
  // اهدای جوایز بازیکن
  static async smasherFinish (params, user) {
    try {
      if(params['session']){
        params['gameLandSession'] = params['session']
      }
      
      const rules = {
        gameLandSession: 'required',
        hash: 'required'
      }

      let check = await Validations.check(params, rules)
      if (check.err) {
        return [{
          status: 0,
          messages: check.messages,
          data: {}
        }]
      }

      let settings = await Setting.get()

      await user.loadMany(['property', 'level'])
      let userData = user.toJSON()
      // console.log('session from','user_id='+user.id,'session_id='+params.gameLandSession)
      let session = await GameSession.query().where('type', 'system').where('user_id', user.id).where('session_id', ''+params.gameLandSession+'').with('game').first()
      // console.log('session',session)
      if (!session) {
        return [{
          status: 0,
          messages: Messages.parse(['GameNotFound']),
          data: {}
        }]
      }

      let game = await GameItem.query().where('id', session.game_id).with('award').with('award.awardItems').first()
      let gameData = game.toJSON()

      const storeHash = hasha('win' + Env.get('ATTACK_SESSION') + params.gameLandSession, {
        algorithm: 'sha256'
      }).toUpperCase()

      let data = {}
      let levelUp = {
        status: false,
        yellow: 0,
        blue: 0
      }
      let levelJson = {
        id: -1,
        name: '',
        score_min: 0,
        score_max: 0,
        be: 0,
        ye: 0
      }
      
      // await user.save()
      if (storeHash != params.hash) {
        await user.property().update({
          lose_smasher: userData.property.lose_smasher+1
        })

        let blueLost = 0, yellowLost = 0
        if(gameData.depo_type=='be' && user.blue_lost < settings.blue_lost_max) {
          blueLost = parseInt(gameData.depo_amount * settings.blue_lost_percent / 100, 10)
          user.blue_lost += blueLost
          if(user.blue_lost > settings.blue_lost_max) {
            user.blue_lost = settings.blue_lost_max
          }
        } else if(gameData.depo_type=='ye' && user.yellow_lost < settings.yellow_lost_max) {
          yellowLost = parseInt(gameData.depo_amount * settings.yellow_lost_percent / 100, 10)
          user.yellow_lost += yellowLost
          if(user.yellow_lost > settings.yellow_lost_max) {
            user.yellow_lost = settings.yellow_lost_max
          }
        }

        user.game_lose++
        await user.save()
        // await game.delete()
        await Redis.del(params.gameLandSession)
        // await user.save()
      } else {
        
        user.score += gameData.score

        let levels = await Level.query().where('score_min','<=',user.score).where('score_max','>=',user.score).first()
        let tmplevelJson

        if(levels){
          tmplevelJson = levels.toJSON()
        }else{
          tmplevelJson = userData.level
        }

        levelJson.id = tmplevelJson.id
        levelJson.name = tmplevelJson.name
        levelJson.score_min = tmplevelJson.score_min
        levelJson.score_max = tmplevelJson.score_max
        levelJson.score = user.score
        levelJson.blue = tmplevelJson.be
        levelJson.yellow = tmplevelJson.ye
        user.game_success++
        if(user.level_id<levelJson.id){
          let oldLevel = await Level.query().where('id', user.level_id).first()
          oldLevel.user--
          oldLevel.save()
          let newLevel = await Level.query().where('id', levelJson.id).first()
          if(isNaN(parseInt(newLevel.user, 10))) {
            newLevel.user = 0
          }
          newLevel.user++
          newLevel.save()
          
          user.level_id = levelJson.id
          levelUp.status = true
          levelUp.yellow = tmplevelJson.ye
          levelUp.blue = tmplevelJson.be
          levelUp.message = tmplevelJson.levelup_message

          const log = new Log()
          log.type = 'levelup'
          log.type_id = levelJson.id
          log.user_id = user.id
          log.before_state = JSON.stringify({
            ye: userData.property.ye,
            be: userData.property.be,
            elixir_1: userData.property.elixir_1,
            elixir_2: userData.property.elixir_2,
            elixir_3: userData.property.elixir_3
          })
          log.after_state = JSON.stringify({
            ye: tmplevelJson.ye+userData.property.ye,
            be: tmplevelJson.be+userData.property.be,
            elixir_1: userData.property.elixir_1,
            elixir_2: userData.property.elixir_2,
            elixir_3: userData.property.elixir_3
          })
          await log.save()

        }
        
        
        await user.save()
        
        let gData = {
          type: 'smasher_finish',
          id: session.game_id
        }
        let userAwards = await Award.calculateAwards(user, game, gameData.award, levelUp.blue, levelUp.yellow, gData)
        if (!userAwards.status) {
          return [{
            status: 0,
            messages: userAwards.messages,
            data: userAwards.data
          }]
        }

        await user.property().update({
          success_smasher: userData.property.success_smasher+1
        })

        data = userAwards.data
        
      }

      // await game.delete()
      await Redis.del(params.gameLandSession)

      return [{
        status: 1,
        messages: [],
        data: {
          chance_wheel: data,
          level_up: levelUp,
          level: levelJson
        }
      }]
    }catch (error) {
      // log error
      // SentryException.captureException(error)

      return [{
        status: 0,
        messages: [{code:'UnknownError', message: JSON.stringify(error)}],//Messages.parse(['UnknownError']),
        data: {}
      }]
    }
  }

  // کنسل کردن بازی سیستمی
  static async cancel (params, user) {
    const rules = {
      gameLandSession: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    await user.loadMany(['property'])
    let userData = user.toJSON()

    let gameSession = await GameSession.query().where('user_id', user.id).where('session_id', params.gameLandSession).first()
    if (!gameSession) {
      return [{
        status: 0,
        messages: Messages.parse(['stageNotFound']),
        data: {}
      }]
    }

    let game = await GameItem.query().where('id', gameSession.game_id).first()

    if (Time(gameSession.created_at).add(game.time + 1, 'seconds').format('YYYY-M-D HH:mm:ss') < Time().format('YYYY-M-D HH:mm:ss')) {
      return [{
        status: 0,
        messages: Messages.parse(['stageExpired']),
        data: {}
      }]
    }

    // check Depo to user
    // if (game.depo_type != 'none') {
    //   userData.property[game.depo_type] = userData.property[game.depo_type] + game.depo_amount
    // }

    // check Cancel
    if (game.cancel_type != 'none' && game.cancel_amount > 0) {
      userData.property[game.cancel_type] = userData.property[game.cancel_type] + game.cancel_amount
      if(game.cancel_type=='be'){
        user.blue_reward += game.cancel_amount
      }
      await user.save()
      await user.property().update(userData.property)
    }

    await gameSession.delete()

    return [{
      status: 1,
      messages: [],
      data: {
        type: label[game.cancel_type],
        amount: userData.property[game.cancel_type]
      }
    }]
  }

  // انجام دادن بازی و از سر گیری در صورت خروج کاربر از بازی
  // اگر به هر دللی بازیکن از بازی خارج شود در صورتی که تایمش به پایان نرسیده باشد می تواند مجدد وارد بازی شود و بازی را ادامه بدهد
  static async gameContinue (params, user) {
    const rules = {
      gameLandSession: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let gameSession = await GameSession.query().where('user_id', user.id).where('session_id', params.gameLandSession).first()
    if (!gameSession) {
      return [{
        status: 0,
        messages: Messages.parse(['stageNotFound']),
        data: {}
      }]
    }

    let game = await GameItem.query().where('id', gameSession.game_id).first()

    let endTime = Time(gameSession.created_at).add(game.time + 1, 'seconds').format('YYYY-M-D HH:mm:ss')
    if (endTime < Time().format('YYYY-M-D HH:mm:ss')) {
      return [{
        status: 0,
        messages: Messages.parse(['stageExpired']),
        data: {}
      }]
    }

    return [{
      status: 1,
      messages: [],
      data: {
        time: Time(endTime).diff(Time(), 'seconds')
      }
    }]
  }
}

module.exports = GameController
