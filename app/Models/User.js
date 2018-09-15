'use strict'

// مدل در اختیار کاربران

const Model = use('Model')
const Level = use('App/Models/Level')
const Bank = use('App/Models/Bank')
const Property = use('App/Models/Property')
const UserFuge = use('App/Models/UserFuge')
const UserAntique = use('App/Models/UserAntique')
const Antique = use('App/Models/Antique')
const Transaction = use('App/Models/Transaction')
const Setting = use('App/Models/Setting')
const Puzzle = use('App/Models/Puzzle')
const Necklace = use('App/Models/Necklace')
const UserStat = use('App/Models/UserStat')
const UserTrap = use('App/Models/UserTrap')
const Trap = use('App/Models/Trap')
const Log = use('App/Models/Log')

const Randomatic = require('randomatic')
const Messages = use('App/Libs/Messages/Messages')
const Moment = use('App/Libs/Moment')
const Logger = use('Logger')
const _ = require('lodash')

class User extends Model {
  static get table () {
    return 'users'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  property () {
    return this.hasOne('App/Models/Property', 'id', 'user_id')
  }

  province () {
    return this.belongsTo('App/Models/Province', 'province_id', 'id')
  }

  bank () {
    return this.hasOne('App/Models/Bank', 'id', 'user_id')
  }

  level () {
    return this.belongsTo('App/Models/Level', 'level_id', 'id')
  }

  fuge () {
    return this.hasOne('App/Models/UserFuge', 'id', 'user_id')
  }

  antiques () {
    return this.hasMany('App/Models/UserAntique', 'id', 'user_id')
  }

  puzzles () {
    return this.hasMany('App/Models/Puzzle', 'id', 'user_id')
  }

  transactions () {
    return this.hasMany('App/Models/Transaction', 'id', 'user_id')
  }

  traps () {
    return this.hasMany('App/Models/UserTrap', 'id', 'user_id')
  }

  tickets () {
    return this.hasMany('App/Models/Ticket', 'id', 'user_id')
  }
  
  notifications () {
    return this.hasMany('App/Models/UserNotification', 'id', 'user_id')
  }
  
  recalls () {
    return this.hasMany('App/Models/UserRecall', 'id', 'user_id')
  }

  sms () {
    return this.hasMany('App/Models/UserSms', 'id', 'user_id')
  }

  avatars () {
    return this.hasMany('App/Models/UserAvatar', 'id', 'users_id')
  }
  // funcs
  // آیجاد یک توکن تصادفی برای کاربر
  static getToken () {
    return Randomatic('Aa0', 15)
  }

  // دریافت رنگ فعلی کاربر در آمارهای مرتبط با کاربران برحسب نوَع آمار درخواستی
  async rank (type) {
    let count = await User.query().where(type, '>=', this[type]).where('id', '!=', this.id).count()
    let rank = count[0]['count(*)']
    return rank++
  }

  // عملیات ثبت نام کاربر جدید که پس از تایید شماره موبایل اتفاق می افند.
  async register () {
    try {
      const level = await Level.query().orderBy('score_min', 'ASC').with('necklace').with('fuge').first()
      const levelData = level.toJSON()

      const setting = await Setting.get()

      let antiques = await Antique.query().where('score_first', '<', setting.init_antique).orderByRaw('RAND()').limit(setting.init_antique_count).fetch()
      antiques = antiques.toJSON()

      let traps = await Trap.query().where('hardness', 0).orderByRaw('RAND()').limit(setting.init_trap_count).fetch()
      traps = traps.toJSON()

      this.level_id = level.id
      this.score = 0
      this.coin = setting.init_coin//0
      this.courage_stat = setting.init_courage_stat//50
      this.antiques_stat = 0
      this.elixir_stat = 0
      this.elixir_used = 0
      this.game_success = 0
      this.game_lose = 0
      this.cave_id = 0
      this.cave_order = 0

      // Add intial reward values
      this.coin_incomes = setting.init_coin
      this.elixir_reward = setting.init_elixir
      this.blue_reward = setting.init_be

      await this.save()

      let property = new Property()
      property.ye = setting.init_ye
      property.be = setting.init_be
      property.elixir_1 = setting.init_elixir
      property.necklace_id = levelData.necklace.id
      property.necklace_health = levelData.necklace.health
      let trap_path = [];
      let trap_id = 1
      for (const trap of traps) {
        trap_path.push({
          id : trap.id,
          block : trap.block,
          index : (trap_id-1)*2
        })
        trap_id++
      }
      property.path_traps_count = traps.length//0
      property.path = JSON.stringify(trap_path)
      await this.property().save(property)

      let bank = new Bank()
      bank.name = ''
      bank.number = ''
      bank.sheba = ''
      await this.bank().save(bank)

      let fuge = new UserFuge()
      fuge.fuge_id = levelData.fuge_id
      fuge.level_id = levelData.id
      fuge.type = 'none'
      fuge.amount = 0
      fuge.status = 'empty'
      await this.fuge().save(fuge)

      for (const antique of antiques) {
        let readyAt = await UserAntique.calculateReadyAt(antique)
        await UserAntique.create({
          user_id: this.id,
          antique_id: antique.id,
          status: 'working',
          ready_at: readyAt
        })
      }

      for (const trap of traps) {
        await UserTrap.create({
          user_id: this.id,
          trap_id: trap.id,
          in_use: 'no'
        })
      }

      const log = new Log()
      log.type = 'register'
      log.type_id = this.id
      log.user_id = this.id
      log.after_state = JSON.stringify({
        ye: setting.init_ye,
        be: setting.init_be,
        elixir_1: setting.init_elixir,
        elixir_2: 0,
        elixir_3: 0
      })
      await log.save()

    } catch (error) {
      Logger.error(error)
    }
  }

  async buy (type, entity) {
    if (type == 'avatar') {
      const alreadyBuy = await this.alreadyBuy(type, entity)
      if (alreadyBuy) {
        return {
          err: true,
          messages: Messages.parse(['alreadyPurchased'])
        }
      }
    }

    if (this.coin < entity.coin) {
      return {
        err: true,
        messages: Messages.parse(['coinNotEnough'])
      }
    }

    this.coin = this.coin - entity.coin
    entity.stat = entity.stat + 1

    let transaction = new Transaction()
    transaction.user_id = this.id
    transaction.type = type
    transaction.type_id = entity.id
    transaction.price = entity.coin
    transaction.status = 'success'

    await transaction.save()
    await entity.save()
    await this.save()

    Logger.info('' + Moment.now('YYYY-M-D HH:mm:ss') + 'buy new Product user:' + this.id + ' product:' + entity.id)

    return {
      err: false,
      messages: []
    }
  }

  // چک کردن اینکه آیا کاربر قبلا محصول را خریده است یا نه و برای جلوگیری از خرید مجدد آواتار استفاده می شود .
  async alreadyBuy (type, entity) {
    let transaction = await Transaction.query().where('type', type).where('type_id', entity.id).where('user_id', this.id).where('status', 'success').first()
    if (!transaction) {
      return false
    }

    return true
  }

  // چک کردن امتیاز برای لول جدید که بعد از هر بازی سیستمی اتفاق می افند .
  async checkLevel () {
    let currentLevel = await this.level().fetch()

    if (this.score < currentLevel.score_max) {
      return false
    }

    let nextLevel = await Level.query().where('score_min', '>=', this.score).where('score_max', '<', this.score).where('id', '!=', this.level_id).orderBy('score_min', 'DESC').with('necklace').first()
    if (!nextLevel) {
      return false
    }
    nextLevel.users = nextLevel.users + 1
    await nextLevel.save()
    nextLevel = nextLevel.toJSON()

    this.level_id = nextLevel.id
    await this.save()

    // await this.loadMany(['property', 'fuge'])
    await this.loadMany(['fuge'])
    let userData = this.toJSON()
    await this.property().update({
      necklace_id: nextLevel.necklace.id,
      necklace_health: nextLevel.necklace.necklace_health,
      ye: userData.property.ye + nextLevel.ye,
      be: userData.property.be + nextLevel.be
    })

    return {
      level: nextLevel.name,
      yellow: nextLevel.ye,
      blue: nextLevel.be,
      necklace: [nextLevel.necklace.name, nextLevel.necklace.necklace_health],
      antique_count: nextLevel.antique_count - currentLevel.antique_count,
      new_fuge: nextLevel.fuge_id != currentLevel.fuge_id
    }
  }

  courage (type = 'add', count = 1) {
    if (type == 'add') {
      this.courage_stat += count
    } else {
      if ((this.courage_stat - count) < 0) {
        this.courage_stat = 0
      } else {
        this.courage_stat -= count
      }
    }
  }

  // محسابه احتمال اینکه به کاربر یک تکه پازل هدیه شود .
  async calculatePuzzle () {
    const puzzles = await Puzzle.query().where('user_id', this.id).fetch()
    const settings = await Setting.get()
    const puzzlesLength = puzzles.rows.length

    if (settings.puzzle_parts <= puzzlesLength) {
      return false
    }

    let percent = (1 / puzzlesLength) * 0.5

    if (_.random(0, 1, true) > percent) {
      return false
    }

    await Puzzle.create({
      user_id: this.id,
      number: puzzlesLength + 1
    })

    return puzzlesLength + 1
  }

  // محسابه اینکه آیا لول کاربر در سطحی است که بتواند گردنبند درخواستی را به دست بیاورد و یا خیر و در زمان خرید گردنبند از فروشگاه مورد استفاده قرار می گیرد .
  async calculateNecklace (id = '') {
    // await this.loadMany(['property', 'level'])
    let userData = this.toJSON()

    let userNecklace
    if (userData.property.necklace_id) {
      userNecklace = await Necklace.find(userData.property.necklace_id)
    }

    let newNecklace
    if (id) {
      newNecklace = await Necklace.find(id)
    } else {
      newNecklace = await Necklace.find(userData.level.necklace_id)
    }

    if (userNecklace && (userNecklace.health > newNecklace.health)) {
      if (userData.property.necklace_health + newNecklace.health >= userNecklace.health) {
        await userData.property().update({
          necklace_health: userData.property.necklace_health + newNecklace.health
        })
      } else {
        await this.property().update({
          necklace_health: userNecklace.health
        })
      }
    } else {
      await this.property().update({
        necklace_id: newNecklace.id,
        necklace_health: newNecklace.health
      })
    }
  }

  // ثبت آمار مرتبط با جوایز جمع آوری شده توسط هر کاربر به صورت زوانه
  async awardStat (awards) {
    let stat = await UserStat.query().where('user_id', this.id).where('date', Moment.now('YYYY-M-D')).first()

    if (!stat) {
      stat = new UserStat()
      stat.user_id = this.id
      stat.date = Moment.now('YYYY-M-D')
      stat.elixir = 0
      stat.ye = 0
      stat.be = 0
    }

    if (_.has(awards, 'elixir')) {
      stat.elixir += awards.elixir
    }

    if (_.has(awards, 'yellow')) {
      stat.ye += awards.yellow
    }

    if (_.has(awards, 'be')) {
      stat.be += awards.blue
    }

    await stat.save()
  }
}

module.exports = User
