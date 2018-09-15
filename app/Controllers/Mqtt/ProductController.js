'use strict'

const Product = use('App/Models/Product')
const Level = use('App/Models/Level')
const Transaction = use('App/Models/Transaction')
const Necklace = use('App/Models/Necklace')
const Trap = use('App/Models/Trap')
const UserTrap = use('App/Models/UserTrap')
const Log = use('App/Models/Log')

const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const _ = use('lodash')
class ProductController {
  // دریافت لیست محصولات
  static async list (params, user) {
    let rules = {
      filter: 'required|array'
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

    let results = {
      'necklace': [],
      'yellow': [],
      'blue': [],
      'avatar': [],
      'trap': [],
      'trap_box': []
    }
    let levels = await Level.query().where('score_min', '<=', userData.level.score_min).fetch()

    for (const record of params.filter) {
      if (params.page == 1) {
        params.page = 0
      } else {
        params.page--
        params.page *= params.limit
      }

      let type = record.type
      switch (record.type) {
        case 'yellow':
          type = 'ye'
          break

        case 'blue':
          type = 'be'
          break
      }
      let random = 'id'
      if (record['random']) {
        random = 'RAND()'
      }

      let products = await Product.query().where('type', type).where('status', 'active').orderByRaw(random).offset(params.page).limit(params.limit).fetch()

      for (const product of products.toJSON()) {
        let available = true

        let data = {
          available: true,
          product_id: product.id,
          product_name: product.name,
          description: product.description,
          price_type: product.price_type,
          price: product.price,
          image: product.image
        }

        switch (product.type) {
          case 'necklace':
            let neckalce = await Necklace.find(product.type_additional)
            data['necklace_name'] = neckalce.name
            data['necklace_health'] = neckalce.health
            data['available'] = false
            for (let level of levels.toJSON()) {
              if (product.type_additional == level.necklace_id) {
                data['available'] = true
              }
            }
            break

          case 'trap_box':
            let trapBox = JSON.parse(product.type_additional)
            if (userData.level.path_traps_hardness < trapBox['hardness']) {
              data['available'] = false
            }

            data['count'] = trapBox['count']
            data['hardness'] = trapBox['hardness']
            data['type'] = trapBox['type']
            break

          case 'trap':
            let trap = await Trap.query().where('id', product.type_additional).first()
            if (userData.level.path_traps_hardness < trap.hardness) {
              data['available'] = false
            }

            data['trap_id'] = trap.id
            data['hardness'] = trap.hardness
            data['block'] = trap.block
            break

          case 'ye':
            data['type'] = 'yellow'
            data['count'] = product.count
            break

          case 'be':
            data['type'] = 'blue'
            data['count'] = product.count
            break
        }

        data['available'] = available
        results[record.type].push(data)
      }
    }

    return [{
      status: 1,
      messages: [],
      data: results
    }]
  }

  // خرید محصول جدید
  static async buy (params, user) {
    let rules = {
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

    let product = await Product.query().where('id', params.id).whereNot('type', 'avatar').first()
    if (!product) {
      return [{
        status: 0,
        messages: Messages.parse(['ProductNotFound']),
        data: {}
      }]
    }
    await user.loadMany(['property', 'level'])
    let userData = user.toJSON()

    let available = true
    switch (product.type) {
      case 'necklace':
        let levels = await Level.query().where('score_min', '<=', userData.level.score_min).fetch()
        available = false
        for (let level of levels.toJSON()) {
          if (product.type_additional != level.necklace_id) {
            available = true
          }
        }
        break

      case 'trap':
        let trapCheck = await Trap.query().where('id', product.type_additional).first()
        if (userData.level.path_traps_hardness < trapCheck.hardness) {
          available = false
        }
        break

      case 'trap_box':
        let trapBoxCheck = JSON.parse(product.type_additional)
        if (userData.level.path_traps_hardness < trapBoxCheck.hardness) {
          available = false
        }
        break
    }

    if (!available) {
      return [{
        status: 0,
        messages: [{"code":'lowLevel',"message":'هنوز امکان خرید این محصول را ندارید'}], // Messages.parse(['WrongAction']),
        data: {}
      }]
    }

    if ((product.price_type == 'coin' && product.price > userData.coin) ||
      (product.price_type == 'elixir' && product.price > userData.property.elixir_3)) {
      return [{
        status: 0,
        messages: Messages.parse(['coinNotEnough']),
        data: {}
      }]
    }

    let transaction = new Transaction()
    transaction.user_id = user.id
    transaction.type = 'product'
    transaction.type_id = product.id
    transaction.price_type = product.price_type
    transaction.price = product.price
    transaction.status = 'success'
    await transaction.save()

    const log = new Log()
    log.type = 'mall_trade'
    log.type_id = product.id
    log.user_id = user.id
    if(product.price_type == 'elixir'){
      log.before_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3
      })
      log.after_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3-product.price
      })
      user.elixir_shop += product.price
    }else{
      log.before_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3,
        coin: userData.coin
      })
      log.after_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3,
        coin: userData.coin-product.price
      })
      user.coin_outcome += product.price
    }
    await log.save()
    await user.save()

    product.stat++
    await product.save()

    switch (product.type) {
      case 'coin':
        user.coin += product.count
        user.coin_income += product.count
        await user.save()
        break
      case 'ye':
      case 'be':
        let changes = {}
        changes[product.type] = userData.property[product.type] + product.count
        if(product.type=='be'){
          user.blue_shop += product.count
          await user.save()
        }
        await user.property().update(changes)
        break

      case 'trap':
        let trap = await Trap.query().where('id', product.type_additional).first()
        if (trap) {
          await UserTrap.create({
            trap_id: trap.id,
            user_id: user.id,
            in_use: 'no'
          })
        }
        break

      case 'trap_box':
        let trapBox = JSON.parse(product.type_additional)
        let traps = await Trap.query().where('hardness','<=', trapBox['hardness']).fetch()
        let trapsData = traps.toJSON()

        let res,results = []

        let typCount = trapBox['type']
        while (typCount > 0) {
          let randomTrap = _.random(0, trapsData.length - 1)

          for (res of results) {
            if (res.id == trapsData[randomTrap]['id']) {
              continue
            }
          }

          if(res && trapsData[randomTrap] && res.id == trapsData[randomTrap]['id']) {
            typCount--
            continue
          }

          await UserTrap.create({
            trap_id: trapsData[randomTrap]['id'],
            user_id: user.id,
            in_use: 'no'
          })
          results.push(trapsData[randomTrap])
          typCount--

        }

        let count = trapBox['count'] - trapBox['type']
        let typeCount = results.length

        while (count > 0) {
          let selectType = _.random(0, typeCount - 1)
          await UserTrap.create({
            trap_id: results[selectType]['id'],
            user_id: user.id,
            in_use: 'no'
          })
          count--
        }
        break

      case 'necklace':
        await user.calculateNecklace(product.type_additional)
        break
    }

    if (product.price_type == 'coin') {
      user.coin = user.coin - product.price
      await user.save()
    } else {
      await user.property().update({
        elixir_3: user.property.elixir_3 - product.price
      })
    }

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }
}

module.exports = ProductController
