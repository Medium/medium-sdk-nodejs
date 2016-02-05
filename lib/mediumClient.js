// Copright 2015 A Medium Corporation

var https = require('https')
var qs = require('querystring')
var url = require('url')
var util = require('util')


var DEFAULT_ERROR_CODE = -1
var DEFAULT_TIMEOUT_MS = 5000


/**
 * Valid scope options.
 * @enum {string}
 */
var Scope = {
  BASIC_PROFILE: 'basicProfile',
  LIST_PUBLICATIONS: 'listPublications',
  PUBLISH_POST: 'publishPost'
}


/**
 * The publish status when creating a post.
 * @enum {string}
 */
var PostPublishStatus = {
  DRAFT: 'draft',
  UNLISTED: 'unlisted',
  PUBLIC: 'public'
}


/**
 * The content format to use when creating a post.
 * @enum {string}
 */
var PostContentFormat = {
  HTML: 'html',
  MARKDOWN: 'markdown'
}


/**
 * The license to use when creating a post.
 * @enum {string}
 */
var PostLicense = {
  ALL_RIGHTS_RESERVED: 'all-rights-reserved',
  CC_40_BY: 'cc-40-by',
  CC_40_BY_ND: 'cc-40-by-nd',
  CC_40_BY_SA: 'cc-40-by-sa',
  CC_40_BY_NC: 'cc-40-by-nc',
  CC_40_BY_NC_ND: 'cc-40-by-nc-nd',
  CC_40_BY_NC_SA: 'cc-40-by-nc-sa',
  CC_40_ZERO: 'cc-40-zero',
  PUBLIC_DOMAIN: 'public-domain'
}


/**
 * An error with a code.
 *
 * @param {string} message
 * @param {number} code
 * @constructor
 */
function MediumError(message, code) {
  this.message = message
  this.code = code
}
util.inherits(MediumError, Error)


/**
 * The core client.
 *
 * @param {{
 *  clientId: string,
 *  clientSecret: string
 * }} options
 * @constructor
 */
function MediumClient(options) {
  this._enforce(options, ['clientId', 'clientSecret'])
  this._clientId = options.clientId
  this._clientSecret = options.clientSecret
  this._accessToken = ""
}


/**
 * Sets an access token on the client used for making requests.
 *
 * @param {string} accessToken
 * @return {MediumClient}
 */
MediumClient.prototype.setAccessToken = function (accessToken) {
  this._accessToken = accessToken
  return this
}


/**
 * Builds a URL at which you may request authorization from the user.
 *
 * @param {string} state
 * @param {string} redirectUrl
 * @param {Array.<Scope>} requestedScope
 * @return {string}
 */
MediumClient.prototype.getAuthorizationUrl = function (state, redirectUrl, requestedScope) {
  return url.format({
    protocol: 'https',
    host: 'medium.com',
    pathname: '/m/oauth/authorize',
    query: {
      client_id: this._clientId,
      scope: requestedScope.join(','),
      response_type: 'code',
      state: state,
      redirect_uri: redirectUrl
    }
  })
}


/**
 * Exchanges an authorization code for an access token and a refresh token.
 *
 * @param {string} code
 * @param {string} redirectUrl
 * @param {NodeCallback} callback
 */
MediumClient.prototype.exchangeAuthorizationCode = function (code, redirectUrl, callback) {
  this._acquireAccessToken({
    code: code,
    client_id: this._clientId,
    client_secret: this._clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUrl
  }, callback)
}


/**
 * Exchanges a refresh token for an access token and a refresh token.
 *
 * @param {string} refreshToken
 * @param {NodeCallback} callback
 */
MediumClient.prototype.exchangeRefreshToken = function (refreshToken, callback) {
  this._acquireAccessToken({
    refresh_token: refreshToken,
    client_id: this._clientId,
    client_secret: this._clientSecret,
    grant_type: 'refresh_token'
  }, callback)
}


/**
 * Returns the details of the user associated with the current
 * access token.
 *
 * Requires the current access token to have the basicProfile scope.
 *
 * @param {NodeCallback} callback
 */
MediumClient.prototype.getUser = function (callback) {
  this._makeRequest({
    method: 'GET',
    path: '/v1/me'
  }, callback)
}


/**
 * Returns the publications related to the current user. Notice that
 * the userId needs to be passed in as an option. It can be acquired
 * with a call to getUser().
 *
 * Requires the current access token to have the
 * listPublications scope.
 *
 * @param {{
 *  userId: string
 * }} options
 * @param {NodeCallback} callback
 */
MediumClient.prototype.getPublicationsForUser = function (options, callback) {
  this._enforce(options, ['userId'])
  this._makeRequest({
    method: 'GET',
    path: '/v1/users/' + options.userId + '/publications'
  }, callback)
}


/**
 * Returns the contributors for a chosen publication. The publication is identified
 * by the publication ID included in the options argument. IDs for publications
 * can be acquired by getUsersPublications.
 *
 * Requires the current access token to have the basicProfile scope.
 *
 * @param {{
 *  publicationId: string
 * }} options
 * @param {NodeCallback} callback
 */
MediumClient.prototype.getContributorsForPublication = function (options, callback) {
  this._enforce(options, ['publicationId'])
  this._makeRequest({
    method: 'GET',
    path: '/v1/publications/' + options.publicationId + '/contributors'
  }, callback)
}


/**
 * Creates a post on Medium.
 *
 * Requires the current access token to have the publishPost scope.
 *
 * @param {{
 *  userId: string,
 *  title: string,
 *  contentFormat: PostContentFormat,
 *  content: string,
 *  tags: Array.<string>,
 *  canonicalUrl: string,
 *  publishStatus: PostPublishStatus,
 *  license: PostLicense
 * }} options
 * @param {NodeCallback} callback
 */
MediumClient.prototype.createPost = function (options, callback) {
  this._enforce(options, ['userId'])
  this._makeRequest({
    method: 'POST',
    path: '/v1/users/' + options.userId + '/posts',
    data: {
      title: options.title,
      content: options.content,
      contentFormat: options.contentFormat,
      tags: options.tags,
      canonicalUrl: options.canonicalUrl,
      publishStatus: options.publishStatus,
      license: options.license
    }
  }, callback)
}


/**
 * Creates a post on Medium and places it under specified publication.
 * Please refer to the API documentation for rules around publishing in
 * a publication: https://github.com/Medium/medium-api-docs
 *
 * Requires the current access token to have the publishPost scope.
 *
 * @param {{
 *  userId: string,
 *  publicationId: string,
 *  title: string,
 *  contentFormat: PostContentFormat,
 *  content: string,
 *  tags: Array.<string>,
 *  canonicalUrl: string,
 *  publishStatus: PostPublishStatus,
 *  license: PostLicense
 * }} options
 * @param {NodeCallback} callback
 */
MediumClient.prototype.createPostInPublication = function (options, callback) {
  this._enforce(options, ['publicationId'])
  this._makeRequest({
    method: 'POST',
    path: '/v1/publications/' + options.publicationId + '/posts',
    data: {
      title: options.title,
      content: options.content,
      contentFormat: options.contentFormat,
      tags: options.tags,
      canonicalUrl: options.canonicalUrl,
      publishStatus: options.publishStatus,
      license: options.license
    }
  }, callback)
}


/**
 * Acquires an access token for the Medium API.
 *
 * Sets the access token on the client on success.
 *
 * @param {Object} params
 * @param {NodeCallback} callback
 */
MediumClient.prototype._acquireAccessToken = function (params, callback) {
  this._makeRequest({
    method: 'POST',
    path: '/v1/tokens',
    contentType: 'application/x-www-form-urlencoded',
    data: qs.stringify(params)
  }, function (err, data) {
    if (!err) {
      this._accessToken = data.access_token
    }
    callback(err, data)
  }.bind(this))
}


/**
 * Enforces that given options object (first param) defines
 * all keys requested (second param). Raises an error if any
 * is missing.
 *
 * @param {Object} options
 * @param {keys} requiredKeys
 */
MediumClient.prototype._enforce = function (options, requiredKeys) {
  if (!options) {
    throw new MediumError('Parameters for this call are undefined', DEFAULT_ERROR_CODE)
  }
  requiredKeys.forEach(function (requiredKey) {
    if (!options[requiredKey]) throw new MediumError('Missing required parameter "' + requiredKey + '"', DEFAULT_ERROR_CODE)
  })
}



/**
 * Makes a request to the Medium API.
 *
 * @param {Object} options
 * @param {NodeCallback} callback
 */
MediumClient.prototype._makeRequest = function (options, callback) {
  var requestParams = {
    host: 'api.medium.com',
    port: 443,
    method: options.method,
    path: options.path
  }
  var req = https.request(requestParams, function (res) {
    var body = []

    res.setEncoding('utf-8')
    res.on('data', function (data) {
      body.push(data)
    })
    res.on('end', function () {
      var payload
      var responseText = body.join('')
      try {
        payload = JSON.parse(responseText)
      } catch (err) {
        callback(new MediumError('Failed to parse response', DEFAULT_ERROR_CODE), null)
        return
      }

      var statusCode = res.statusCode
      var statusType = Math.floor(res.statusCode / 100)

      if (statusType == 4 || statusType == 5) {
        var err = payload.errors[0]
        callback(new MediumError(err.message, err.code), null)
      } else if (statusType == 2) {
        callback(null, payload.data || payload)
      } else {
        callback(new MediumError('Unexpected response', DEFAULT_ERROR_CODE), null)
      }
    })
  }).on('error', function (err) {
    callback(new MediumError(err.message, DEFAULT_ERROR_CODE), null)
  })

  req.setHeader('Content-Type', options.contentType || 'application/json')
  req.setHeader('Authorization', 'Bearer ' + this._accessToken)
  req.setHeader('Accept', 'application/json')
  req.setHeader('Accept-Charset', 'utf-8')

  req.setTimeout(DEFAULT_TIMEOUT_MS, function () {
    // Aborting a request triggers the 'error' event.
    req.abort()
  })

  if (options.data) {
    var data = options.data
    if (typeof data == 'object') {
      data = JSON.stringify(data)
    }
    req.write(data)
  }
  req.end()
}

// Exports

module.exports = {
  MediumClient: MediumClient,
  MediumError: MediumError,
  Scope: Scope,
  PostPublishStatus: PostPublishStatus,
  PostLicense: PostLicense,
  PostContentFormat: PostContentFormat
}
