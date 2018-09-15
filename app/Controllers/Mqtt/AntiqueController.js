'use strict'

const Antique = use('App/Models/Antique')
const UserAntique = use('App/Models/UserAntique')
const Setting = use('App/Models/Setting')
const Log = use('App/Models/Log')
const Level = use('App/Models/Level')

const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const _ = require('lodash')

class AntiqueController {
  // نمایش کلیه عتیقه های داخل بازی و همچنین عتیقه های کاربر
  static async list (params, user) {
    let settings = await Setting.get()
    const rules = {
      limit: 'required|integer',
      page: 'required|integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let antiques = []
    let userAntiqueID = []
    let isMax = false

    await user.loadMany(['antiques', 'antiques.antique'])
    const userData = user.toJSON()
    let userLevel = await Level.find(userData.level_id)
    let myAntiquesCount = 0
    if(userLevel) {
      isMax = (userLevel.antique_count<=antiques.length)
    }
    if(!isMax && userLevel.antique_count > userData.antiques.length) {
      myAntiquesCount = userLevel.antique_count - userData.antiques.length//parseInt(userData.antiques.length*100/userLevel.antique_count, 10)
    }

    for (const ant of userData.antiques) {
      if (ant.antique.status == 'active') {
        let timeAll = await UserAntique.calculateMinutes(ant.antique)
        timeAll = timeAll * 60 // convert to second
        userAntiqueID.push(ant.antique.id)
        antiques.push({
          id: ant.id,
          mine: true,
          name: ant.antique.name,
          description: ant.antique.description,
          image: ant.antique.image,
          yellow: settings.antique_bulk,
          score: ant.antique.score_first,
          time: ant.remaining,
          total: timeAll
        })
      }
    }

    
    let otherAntiques = await Antique.query().whereNotIn('id', userAntiqueID).where('status', 'active').fetch()
    for (const ant of otherAntiques.toJSON()) {
      antiques.push({
        mine: false,
        name: ant.name,
        description: ant.description,
        image: ant.image,
        yellow: settings.antique_bulk,
        score: ant.score_first
      })
    }
    

    params.page--

    return [{
      status: 1,
      messages: [],
      data: {
        antiques: _.slice(antiques, params.page * params.limit, (params.page * params.limit) + params.limit),
        count: myAntiquesCount,//antiques.length,
        is_max: isMax
      }
    }]
  }

  // برداشت انرژی زرد از عتیقه ها
  static async removal (params, user) {
    const rules = {
      id: 'required|integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let userAntique = await UserAntique.query().where('user_id', user.id).where('id', params.id).with('antique').fetch()

    if (!userAntique.rows.length) {
      return [{
        status: 0,
        messages: Messages.parse(['AntiqueNotFound']),
        data: {}
      }]
    }

    if (userAntique.rows[0].remaining > 0) {
      return [{
        status: 0,
        messages: Messages.parse(['wrongAction']),
        data: {}
      }]
    }

    userAntique = userAntique.rows[0]

    let settings = await Setting.get()
    let userProperty = await user.property().fetch()

    const log = new Log()
    log.type = 'antique_update'
    log.type_id = userAntique.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userProperty.ye,
      be: userProperty.be,
      elixir_1: userProperty.elixir_1,
      elixir_2: userProperty.elixir_2,
      elixir_3: userProperty.elixir_3
    })
    log.after_state = JSON.stringify({
      ye: userProperty.ye + settings.antique_bulk,
      be: userProperty.be,
      elixir_1: userProperty.elixir_1,
      elixir_2: userProperty.elixir_2,
      elixir_3: userProperty.elixir_3
    })
    await log.save()

    await user.property().update({
      ye: userProperty.ye + settings.antique_bulk
    })

    const userAntiqueData = userAntique.toJSON()
    const readyAt = await UserAntique.calculateReadyAt(userAntiqueData.antique)

    userAntique.remaining = undefined
    userAntique.ready_at = readyAt
    await userAntique.save()

    return [{
      status: 1,
      messages: [],
      data: {
        id: params.id
      }
    }]
  }
}

module.exports = AntiqueController
