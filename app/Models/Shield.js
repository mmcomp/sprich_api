'use strict'

const Model = use('Model')

class Shield extends Model {
    static get table () {
        return 'shields'
    }

    static get createdAtColumn () {
        return 'created_at'
    }

    static get updatedAtColumn () {
        return 'updated_at'
    }
}

module.exports = Shield
