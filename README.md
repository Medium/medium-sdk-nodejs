**Warning:** This sdk is no longer supported or maintained by Medium.


# Medium SDK for NodeJS

This repository contains the open source SDK for integrating [Medium](https://medium.com)'s OAuth2 API into your NodeJs app.

View the full [documentation here](https://github.com/Medium/medium-api-docs).

Install
-------

    npm install medium-sdk

Usage
-----

Create a client, then call commands on it.

```javascript
var medium = require('medium-sdk')

var client = new medium.MediumClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
})

var redirectURL = 'https://yoursite.com/callback/medium'; 

var url = client.getAuthorizationUrl('secretState', redirectURL, [
  medium.Scope.BASIC_PROFILE, medium.Scope.PUBLISH_POST
])

// (Send the user to the authorization URL to obtain an authorization code.)

client.exchangeAuthorizationCode('YOUR_AUTHORIZATION_CODE', redirectURL, function (err, token) {
  client.getUser(function (err, user) {
    client.createPost({
      userId: user.id,
      title: 'A new post',
      contentFormat: medium.PostContentFormat.HTML,
      content: '<h1>A New Post</h1><p>This is my new post.</p>',
      publishStatus: medium.PostPublishStatus.DRAFT
    }, function (err, post) {
      console.log(token, user, post)
    })
  })
})
```

Contributing
------------

Questions, comments, bug reports, and pull requests are all welcomed. If you haven't contributed to a Medium project before please head over to the [Open Source Project](https://github.com/Medium/opensource#note-to-external-contributors) and fill out an OCLA (it should be pretty painless).

Authors
-------

[Jamie Talbot](https://github.com/majelbstoat)

License
-------

Copyright 2015 [A Medium Corporation](https://medium.com)

Licensed under Apache License Version 2.0.  Details in the attached LICENSE
file.
