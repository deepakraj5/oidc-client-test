import express from 'express';
import { BaseClient, generators, Issuer } from 'openid-client';
import path from 'path';
import session from 'express-session';
import { readFileSync } from 'fs';
import https from 'https';

const app = express();

const options = {
    key: readFileSync('server.key', 'utf-8'),
    cert: readFileSync('server.cert', 'utf-8')
}

app.use(express.json());

app.use(session({
    secret: 'some-secret',
    resave: false,
    saveUninitialized: true
}));

let client: BaseClient;
const redirectUri = ["https://localhost:3000/api/auth/callback/aveon"];

(async () => {
    const issuer = await Issuer.discover("https://id-qa.aveon.io");
    client = new issuer.Client({
        client_id: '',
        client_secret: '',
        redirect_uris: redirectUri,
        response_types: ['code']
    })
})();

const codeVerifier = generators.codeVerifier();

app.get('/login', (req, res) => {

    const state = generators.state();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const url = client.authorizationUrl({
        scope: "openid profile manage:fees manage:identity offline_access roles",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });
    res.redirect(url);
})

app.get('/api/auth/callback/aveon', async (req, res) => {
    const params = client.callbackParams(req);
    console.log(params);
    const tokenSet: any = await client.callback(redirectUri[0], params, {
        code_verifier: codeVerifier,
        state: params.state
    });
    console.log(tokenSet);
    const userinfo = await client.userinfo(tokenSet.access_token);

    console.log(userinfo);

    res.send(`<h1>Hello, ${userinfo.name}</h1><a href="/logout">Logout</a>`);
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
})


// app.listen(3000, () => console.log('server upon port: 3000'));
https.createServer(options, app).listen(3000, () => console.log('server upon port: 3000'));
