'use strict'

// مدل مرتبط با اطلاعات سانترفیوژ در اختیار هر کاربر

const Model = use('Model')

const Level = use('App/Models/Level')

const Fuge = use('App/Models/Fuge')

class UserFuge extends Model {
  static get table () {
    return 'users_fuges'
  }

  static get createdAtColumn () {
    return null
  }

  static get updatedAtColumn () {
    return null
  }

  // Relations
  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }

  level () {
    return this.belongsTo('App/Models/Level', 'level_id', 'id')
  }

  fuge () {
    return this.belongsTo('App/Models/Fuge', 'fuge_id', 'id')
  }

  // Methods
  //  چک کردن این که آیا با توجه به لول کاربر بروزرسانی جدید در دسترس است یا خیر
  async upgradeAvalible (user) {
    const fugeLevel = await this.level().fetch()
    const userLevel = await user.level().fetch()
    // console.log('userFuge')
    // console.log(this.toJSON())
    // console.log('userLevel')
    // console.log(userLevel.toJSON())
    let nextLevel;
    if(userLevel.fuge_id<=this.fuge_id){
      // console.log('need to upgrade level, Next Level : ')
      nextLevel = await Level.query().where('fuge_id', '>', this.fuge_id)//.where('fuge_id', '!=', this.fuge_id)
        // .where('score_min', '>=', userLevel.score_min)
        .orderBy('score_min', 'ASC').with('fuge').first()
      // console.log(nextLevel.toJSON())
    }else{
      // console.log('level ok')
      nextLevel = userLevel
    }
    // console.log(this.toJSON())
    let nextFuge = await Fuge.query().where('id','>',this.fuge_id).orderBy('id','ASC').first()  
    // if(nextFuge){  
      // console.log('Next fuge')
      // console.log(nextFuge.toJSON())
    // }else{
      // console.log('No fuge left')
    // }

    if (!nextLevel) {
      return {
        avalible: false
      }
    }

    let result = {
      avalible: true,
      upgrade: false,
      data: nextLevel
    }

    nextLevel = nextLevel.toJSON()
    if(nextFuge && userLevel.fuge_id>=nextFuge.id){
      nextLevel.fuge = nextFuge.toJSON()
      result['upgrade'] = true
      result.data = nextLevel
    }



    // if (nextLevel.id > userLevel.id) {
    //   result['upgrade'] = true
    // }

    return result
  }
}

module.exports = UserFuge
