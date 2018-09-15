'use strict'

// الگوریتم بازی مین روبی

const _ = require('lodash')
const Redis = use('Redis')

class MineSweeper {
  // ایجاد اولیه زمین خالی
  static async create (params, target) {
    const stage = []
    for (let i = 0; i < params.rows; i++) {
      stage[i] = Array(parseInt(params.cols)).fill([0, ''])
    }

    while (params.bombs >= 1) {
      let row = _.random(parseInt(params.rows) - 1)
      let col = _.random(parseInt(params.cols) - 1)

      if ((row == target[0] && col == target[1]) || stage[row][col][0] < 0) {
        continue
      }

      stage[row][col] = [-1, '']
      params.bombs--

      let newRow,
        newCol

      // Caculate Grade
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          if (i == 0 && j == 0) {
            continue
          }

          newRow = row + i
          newCol = col + j

          if (_.inRange(newRow, 0, params.rows) && _.inRange(newCol, 0, params.cols) && stage[newRow][newCol][0] > -1) {
            let grade = stage[newRow][newCol][0]
            grade = grade + 1
            stage[newRow][newCol] = [grade, '']
          }
        }
      }
    }

    return stage
  }

  // پر کردن یکی از خانه های زمین
  // در صورت نبود زمین ابتدا آن را ایجاد می کند
  static async fill (stageId, stage, target, action = 'fill') {
    stage.bombs = parseInt(stage.bombs)

    const bombs = stage.bombs
    const flags = JSON.parse(stage.flags)
    let viwedNode = []
    let matrix = []

    await Redis.select(2)
    let stageMatrix = await Redis.keys(stageId + '_*')

    if (!stageMatrix.length) {
      let createdStage = await MineSweeper.create(stage, target)
      await MineSweeper._save(stageId, createdStage)
    }

    for (let i = 0; i < stage.rows; i++) {
      let record = await Redis.lrange(stageId + '_' + i, 0, -1)
      let row = []
      record.forEach(function (item, index) {
        row[index] = JSON.parse(item)
      })
      matrix.push(row)
    }

    let flagExists = false

    if (matrix[target[0]][target[1]][1] == 'flag') {
      flagExists = true
    }

    switch (action) {
      case 'flag':
        if (flagExists) {
          _.find(flags, (flag, index) => {
            if(flag){
              if (flag[0] == target[0] && flag[1] == target[1]) {
                flags.splice(index, 1)
              }
            }
          })

          await Redis.select(1)
          await Redis.hmset(stageId, [
            'flags', JSON.stringify(flags)
          ])

          matrix[target[0]][target[1]][1] = ''
          await MineSweeper._save(stageId, matrix)
          return {
            status: 1,
            messages: [],
            data: {
              flagType: 0,
              winStatus: -1,
              loseGameType: -1,
              gridArray: []
            }
          }
        } else {
          if (flags.length >= bombs) {
            return {
              status: 0,
              messages: ['MaxFlag'],
              data: {
                flagType: -1,
                winStatus: -1,
                loseGameType: -1,
                gridArray: []
              }
            }
          }
          matrix[target[0]][target[1]][1] = 'flag'
          flags.push(target)
          await MineSweeper._save(stageId, matrix)
        }
        break

      case 'fill':
        if (matrix[target[0]][target[1]][1] != '') {
          return {
            status: 0,
            data: {
              flagType: -1,
              winStatus: -1,
              loseGameType: -1,
              gridArray: []
            },
            messages: ['wrongPlace']
          }
        }

        if (matrix[target[0]][target[1]][0] <= -1) {
          let gridArray = await MineSweeper._bombPlace(matrix)
          return {
            status: 1,
            messages: [],
            data: {
              flagType: 1,
              winStatus: 0,
              loseGameType: 0,
              gridArray: gridArray
            }
          }
        }

        matrix[target[0]][target[1]][1] = 'fill'

        if (matrix[target[0]][target[1]][0] == 0) {
          [matrix, viwedNode] = await MineSweeper._calculateClick(matrix, target)
        }
        viwedNode.push({
          row: target[0],
          col: target[1],
          value: matrix[target[0]][target[1]][0]
        })

        await MineSweeper._save(stageId, matrix)
        break
    }

    await Redis.select(1)
    await Redis.hmset(stageId, [
      'flags', JSON.stringify(flags)
    ])

    // check win
    let playerWin = false

    if (_.size(flags) == bombs) {
      playerWin = true
      _.map(flags, (flag) => {
        if (matrix[flag[0]][flag[1]][0] > -1) {
          playerWin = false
        }
      })

      let viewedNodeCount = 0
      for (let i = 0; i < stage.rows; i++) {
        for (let j = 0; j < stage.cols; j++) {
          if (matrix[i][j][1] == 'view' || matrix[i][j][1] == 'fill') {
            viewedNodeCount++
          }
        }
      }
      if (viewedNodeCount != ((stage.rows * stage.cols) - bombs)) {
        playerWin = false
      }
    }

    if (playerWin) {
      return {
        status: 1,
        data: {
          flagType: -1,
          winStatus: 1,
          gridArray: [],
          loseGameType: 0
        },
        messages: []
      }
    }

    let result = {
      status: 1,
      data: {
        flagType: action == 'fill' ? 1 : 2,
        winStatus: -1,
        gridArray: [],
        loseGameType: -1
      },
      messages: []
    }

    if (action == 'fill') {
      result.data.gridArray = viwedNode
    }

    return result
  }

  // مشخص کردن بمب های موجود در زمین
  static _bombPlace (matrix) {
    let bombs = []
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        if (matrix[i][j][0] <= -1) {
          bombs.push({
            'row': i,
            'col': j,
            'value': matrix[i][j][0]
          })
        }
      }
    }
    return bombs
  }

  // ذخیره اطلاعت و تغییرات در redis
  static async _save (stageId, matrix) {
    for (let index = 0; index < matrix.length; index++) {
      await Redis.select(2)
      // Remove old Keys
      await Redis.ltrim(stageId + '_' + index, -1, 0)
      let row = []

      for (const item of matrix[index]) {
        row.push(JSON.stringify(item))
      }

      await Redis.rpush(stageId + '_' + index, row)
    }
  }

  static async _calculateClick (stage, target, history = []) {
    let newRow
    let newCol
    let viewedNode = []

    if (stage[target[0]][target[1]][1] == '') {
      stage[target[0]][target[1]][1] = 'view'
      viewedNode.push({
        'row': target[0],
        'col': target[1],
        'value': stage[target[0]][target[1]][0]
      })
    }

    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (i == 0 && j == 0) {
          continue
        }

        newRow = target[0] + i
        newCol = target[1] + j

        if (_.inRange(newRow, 0, stage.length) && _.inRange(newCol, 0, stage[0].length) && stage[newRow][newCol][0] > -1 && stage[newRow][newCol][1] == '') {
          if (stage[newRow][newCol][0] == 0 && !_.includes(history, `${newRow},${newCol}`)) {
            history.push(`${newRow},${newCol}`)
            let newViewedNode = [];
            [stage, newViewedNode] = await MineSweeper._calculateClick(stage, [
              newRow, newCol
            ], history)
            viewedNode = viewedNode.concat(newViewedNode)
          } else {
            if (stage[newRow][newCol][1] == '') {
              stage[newRow][newCol][1] = 'view'
              viewedNode.push({
                'row': newRow,
                'col': newCol,
                'value': stage[newRow][newCol][0]
              })
            }
          }
        }
      }
    }

    return [stage, viewedNode]
  }
}

module.exports = MineSweeper
