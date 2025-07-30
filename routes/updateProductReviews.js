/*
 * Copyright (c) 2014-2021 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const utils = require('../lib/utils')
const challenges = require('../data/datacache').challenges
const db = require('../data/mongodb')
const insecurity = require('../lib/insecurity')

module.exports = function productReviews () {
  return (req, res, next) => {
    const id = req.body.id
    const message = req.body.message
    
    if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
      res.status(400).json({ error: 'Invalid review ID' })
      return
    }
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Invalid message' })
      return
    }
    
    const user = insecurity.authenticatedUsers.from(req)
    db.reviews.update(
      { _id: id },
      { $set: { message: message } },
      { multi: true }
    ).then(
      result => {
        utils.solveIf(challenges.noSqlReviewsChallenge, () => { return result.modified > 1 })
        utils.solveIf(challenges.forgedReviewChallenge, () => { return user && user.data && result.original[0].author !== user.data.email && result.modified === 1 })
        res.json(result)
      }, err => {
        res.status(500).json(err)
      })
  }
}
