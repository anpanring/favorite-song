const express = require('express');
const path = require('path');
const axios = require('axios').default;
var request = require('request'); // "Request" library - DEPRECATED
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
require("dotenv").config({ path: "./config.env" });

app = express();
const port = process.env.PORT || 3000;

app.use(cors())
   .use(cookieParser());

var client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
var client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
var redirect_uri = "http://localhost:3000/callback";

// ROUTES

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

app.get("/about", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "pages", "about.html"));
});

app.get("/spinny", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "assets", "spinnylogo.gif"));
});

app.get("/favicon", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "assets", "favicon.ico"));
});

app.get("/styles", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "style.css"));
});


// SPOTIFY AUTH

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

app.get('/login', function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = "streaming user-read-email playlist-modify-public playlist-read-private playlist-modify-private user-read-recently-played user-top-read user-read-private";

    var auth_query_parameters = new URLSearchParams({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    })

    res.redirect('https://accounts.spotify.com/authorize?' + auth_query_parameters.toString());
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            json: true
        };

        var access_token;

        /*axios.post(authOptions.url, authOptions.form.grant_type, authOptions.headers)
            .then(function(response) {
                access_token=response;
                console.log(access_token);
            })
            .catch(function (error) {
                console.log(error);
            });*/

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;
                var data;

                var options = {
                    url: 'https://api.spotify.com/v1/playlists/1qIU0iwmgXVyxU4okPGVhp',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    data = body;
                    console.log(body);
                });

                //res.json(data);

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

app.listen(port, () => {
    console.log("Server running at port " + client_id);
    console.log("Server running at port " + client_secret);
    console.log("Server running at port " + port);
});