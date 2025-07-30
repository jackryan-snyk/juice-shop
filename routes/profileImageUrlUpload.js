/*
 * Copyright (c) 2014-2021 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const fs = require('fs')
const models = require('../models/index')
const insecurity = require('../lib/insecurity')
const request = require('request')
const logger = require('../lib/logger')
const path = require('path')

module.exports = function profileImageUrlUpload () {
  return (req, res, next) => {
    if (req.body.imageUrl !== undefined) {
      const url = req.body.imageUrl
      
      if (!url || typeof url !== 'string') {
        res.status(400)
        next(new Error('Invalid image URL'))
        return
      }
      
      if (!url.match(/^https?:\/\//)) {
        res.status(400)
        next(new Error('Only HTTP/HTTPS URLs are allowed'))
        return
      }
      
      if (url.match(/(.)*solve\/challenges\/server-side(.)*/) !== null) req.app.locals.abused_ssrf_bug = true
      const loggedInUser = insecurity.authenticatedUsers.get(req.cookies.token)
      if (loggedInUser) {
        const imageRequest = request
          .get(url)
          .on('error', function (err) {
            models.User.findByPk(loggedInUser.data.id).then(user => { return user.update({ profileImage: url }) }).catch(error => { next(error) })
            logger.warn('Error retrieving user profile image: ' + err.message + '; using image link directly')
          })
          .on('response', function (res) {
            if (res.statusCode === 200) {
              const ext = ['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(url.split('.').slice(-1)[0].toLowerCase()) ? url.split('.').slice(-1)[0].toLowerCase() : 'jpg'
              const sanitizedUserId = loggedInUser.data.id.toString().replace(/[^a-zA-Z0-9]/g, '')
              const filePath = path.join('frontend/dist/frontend/assets/public/images/uploads/', `${sanitizedUserId}.${ext}`)
              imageRequest.pipe(fs.createWriteStream(filePath))
              models.User.findByPk(loggedInUser.data.id).then(user => { return user.update({ profileImage: `/assets/public/images/uploads/${loggedInUser.data.id}.${ext}` }) }).catch(error => { next(error) })
            } else models.User.findByPk(loggedInUser.data.id).then(user => { return user.update({ profileImage: url }) }).catch(error => { next(error) })
          })
      } else {
        next(new Error('Blocked illegal activity by ' + req.connection.remoteAddress))
      }
    }
    res.location(process.env.BASE_PATH + '/profile')
    res.redirect(process.env.BASE_PATH + '/profile')
  }
}
