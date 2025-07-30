/*
 * Copyright (c) 2014-2021 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const path = require('path')

module.exports = function serveLogFiles () {
  return ({ params }, res, next) => {
    const file = params.file

    if (!file || file.includes('/') || file.includes('..') || file.includes('\\')) {
      res.status(403)
      next(new Error('Invalid file name!'))
      return
    }
    
    res.sendFile(path.resolve(__dirname, '../logs/', file))
  }
}
