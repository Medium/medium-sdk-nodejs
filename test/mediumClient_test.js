var medium = require("../")
var nock = require("nock")
var qs = require('querystring')
var should = require("should")
var url = require('url')


describe('MediumClient - constructor', function () {

  it('should throw a MediumError when options are undefined', function (done) {
    (function () { new medium.MediumClient() }).should.throw(medium.MediumError)
    done()
  })

  it('should throw a MediumError when options are empty', function (done) {
    (function () { new medium.MediumClient({}) }).should.throw(medium.MediumError)
    done()
  })

  it('should throw a MediumError when only clientId is provided', function (done) {
    (function () { new medium.MediumClient({clientId: 'xxx'}) }).should.throw(medium.MediumError)
    done()
  })

  it('should throw a MediumError when only clientSecret is provided', function (done) {
    (function () { new medium.MediumClient({clientSecret: 'yyy'}) }).should.throw(medium.MediumError)
    done()
  })

  it('should succeed when both clientId and clientSecret are provided', function (done) {
    var client = new medium.MediumClient({clientId: 'xxx', clientSecret: 'yyy'})
    done()
  })
})


describe('MediumClient - methods', function () {

  var clientId = 'xxx'
  var clientSecret = 'yyy'
  var client

  beforeEach(function () {
    client = new medium.MediumClient({clientId: clientId, clientSecret: clientSecret})
    nock.disableNetConnect()
  })

  afterEach(function () {
    nock.enableNetConnect();
    delete client
  })

  describe('#setAccessToken', function () {

    it ('sets the access token', function (done) {
      var token = "new token"
      client.setAccessToken(token)
      client._accessToken.should.be.String().and.equal(token)
      done()
    })
  })

  describe('#getAuthorizationUrl', function () {

    it ('returns a valid URL for fetching', function (done) {
      var state = "state"
      var redirectUrl = "https://example.com/callback"
      var scope = [medium.Scope.BASIC_PROFILE, medium.Scope.LIST_PUBLICATIONS, medium.Scope.PUBLISH_POST]
      var authUrlStr = client.getAuthorizationUrl(state, redirectUrl, scope)
      var authUrl = url.parse(authUrlStr, true)
      authUrl.protocol.should.equal('https:')
      authUrl.hostname.should.equal('medium.com')
      authUrl.pathname.should.equal('/m/oauth/authorize')
      authUrl.query.should.deepEqual({
        client_id: clientId,
        scope: scope.join(','),
        response_type: 'code',
        state: state,
        redirect_uri: redirectUrl
      })
      done()
    })
  })

  describe('#exchangeAuthorizationCode', function () {

    it ('makes a request for authorization_code and sets the access token from response', function (done) {
      var code = '12345'
      var grantType = 'authorization_code'
      var redirectUrl = 'https://example.com/callback'

      var requestBody = qs.stringify({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
        redirect_uri: redirectUrl
      })
      // the response might have other parameters. this test only considers the ones called out
      // in the Medium Node SDK documentation
      var accessToken = 'abcdef'
      var refreshToken = 'ghijkl'
      var responseBody = {
        access_token: accessToken,
        refresh_token: refreshToken
      }
      var request = nock('https://api.medium.com/', {
          'Content-Type': 'application/x-www-form-urlencoded'
        })
        .post('/v1/tokens', requestBody)
        .reply(201, responseBody)

      client.exchangeAuthorizationCode(code, redirectUrl, function (err, data) {
        if (err) throw err
        data.access_token.should.equal(accessToken)
        data.refresh_token.should.equal(refreshToken)
        done()
      })
      request.done()
    })
  })

  describe('#exchangeRefreshToken', function () {

    it ('makes a request for authorization_code and sets the access token from response', function (done) {
      var refreshToken = 'fedcba'
      var accessToken = 'lkjihg'

      var requestBody = qs.stringify({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
      // the response might have other parameters. this test only considers the ones called out
      // in the Medium Node SDK documentation
      var responseBody = {
        access_token: accessToken,
        refresh_token: refreshToken
      }
      var request = nock('https://api.medium.com/', {
          'Content-Type': 'application/x-www-form-urlencoded'
        })
        .post('/v1/tokens', requestBody)
        .reply(201, responseBody)

      client.exchangeRefreshToken(refreshToken, function (err, data) {
        if (err) throw err
        data.access_token.should.equal(accessToken)
        data.refresh_token.should.equal(refreshToken)
        done()
      })
      request.done()
    })
  })

  describe('#getUser', function () {
    it ('gets the information from expected URL and returns contents of data envelope', function (done) {
      var response = { data: 'response data' }

      var request = nock('https://api.medium.com')
        .get('/v1/me')
        .reply(200, response)

      client.getUser(function (err, data) {
        if (err) throw err
        data.should.deepEqual(response['data'])
        done()
      })
      request.done()
    })
  })

  describe('#getPublicationsForUser', function () {

    it ('throws a MediumError when no user ID is provided', function (done) {
      (function () { client.getPublicationsForUser({}) }).should.throw(medium.MediumError)
      done()
    })

    it ('makes a proper GET request to the Medium API and returns contents of data envelope when valid options are provided', function (done) {
      var userId = '123456'
      var response = { data: 'response data' }

      var request = nock('https://api.medium.com/')
        .get('/v1/users/' + userId + '/publications')
        .reply(200, response)

      client.getPublicationsForUser({userId: userId}, function (err, data) {
        if (err) throw err
        data.should.deepEqual(response['data'])
        done()
      })
      request.done()
    })
  })

  describe('#getContributorsForPublication', function () {

    it ('throws a MediumError when no publication ID is provided', function (done) {
      (function () { client.getContributorsForPublication({}) }).should.throw(medium.MediumError)
      done()
    })

    it ('makes a proper GET request to the Medium API and returns contents of data envelope', function (done) {
      var options = { publicationId: 'abcdef' }
      var response = { data: 'response data' }
      var request = nock('https://api.medium.com/')
        .get('/v1/publications/' + options.publicationId + '/contributors')
        .reply(200, response)

      client.getContributorsForPublication(options, function (err, data) {
        if (err) throw err
        data.should.deepEqual(response['data'])
        done()
      })
      request.done()
    })
  })

  describe('#createPost', function () {

    it ('makes a proper POST request to the Medium API and returns contents of data envelope', function (done) {
      var options = {
        userId: '123456',
        title: 'new post title',
        content: '<h1>New Post!</h1>',
        contentFormat: 'html',
        tags: ['js', 'unit tests'],
        canonicalUrl: 'http://example.com/new-post',
        publishStatus: 'draft',
        license: 'all-rights-reserved'
      }
      var response = { data: 'response data' }
      var request = nock('https://api.medium.com/')
        .post('/v1/users/' + options.userId + '/posts', {
            title: options.title,
            content: options.content,
            contentFormat: options.contentFormat,
            tags: options.tags,
            canonicalUrl: options.canonicalUrl,
            publishStatus: options.publishStatus,
            license: options.license
        })
        .reply(200, response)

      client.createPost(options, function (err, data) {
        if (err) throw err
        data.should.deepEqual(response['data'])
        done()
      })
      request.done()
    })
  })

  describe('#createPostInPublication', function () {

    it ('should throw an error when no publication ID is provided', function (done) {
      (function () { client.createPostInPublication({}) }).should.throw(medium.MediumError)
      done()
    })

    it ('makes a proper POST request to the Medium API and returns contents of data envelope', function (done) {
      var options = {
        publicationId: 'abcdef',
        title: 'new post title',
        content: '<h1>New Post!</h1>',
        contentFormat: 'html',
        tags: ['js', 'unit tests'],
        canonicalUrl: 'http://example.com/new-post',
        publishStatus: 'draft',
        license: 'all-rights-reserved'
      }
      var response = { data: 'response data' }
      var request = nock('https://api.medium.com/')
        .post('/v1/publications/' + options.publicationId + '/posts', {
            title: options.title,
            content: options.content,
            contentFormat: options.contentFormat,
            tags: options.tags,
            canonicalUrl: options.canonicalUrl,
            publishStatus: options.publishStatus,
            license: options.license
        })
        .reply(200, response)

      client.createPostInPublication(options, function (err, data) {
        if (err) throw err
        data.should.deepEqual(response['data'])
        done()
      })
      request.done()
    })
  })
})
