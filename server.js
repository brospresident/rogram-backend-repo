require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'test',
      database : 'rogram'
    }
});

app.get('/', (req, res) => {
    res.send('<h1>Hello World!</h1>');
});

app.post('/signin', (req, res) => {
    const {email, pass} = req.body;

    if (!email || !pass) return res.status(400).json('bad form submission');

    db.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(data => {
            const validPass = bcrypt.compareSync(pass, data[0].hash);
            if (validPass) {
                return db.select('*').from('users')
                .where('email', '=', email)
                .then(user => {
                    res.json(user[0]);
                })
                .catch(err => res.status(400).json('bad call'));
            }
            else res.status(400).json('wrong data');
        })
        .catch(err => res.status(400).json('wrong data'));
});

app.post('/register', (req, res) => {
    const {email, name, pass} = req.body;

    if (!email || !name || !pass) return res.status(400).json('bad form submission');

    const hash = bcrypt.hashSync(pass);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users').returning('*').insert({
                email: loginEmail[0],
                name: name,
            }).then(user => {
                res.json(user[0]);
            }).catch(err => res.status(400).json('unable to register'));
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(err => res.status(400).json('unable to register'));
});

app.listen(3001, () => {
    console.log(`rogram backend listening to port 3001`)
});

/**
 * -> res = this is working
 * -> /signin = POST success / fail
 * -> /register = POST user
 **/