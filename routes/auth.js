var express = require('express');
var passport = require('passport');
var db = require('../db');

var router = express.Router();

router.get('/google', passport.authenticate('google'));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    assignProperty: 'federatedUser',
    failureRedirect: '/login',
  }),
  (req, res, next) => {
    db.get(
      'SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?',
      ['https://accounts.google.com', req.federatedUser.id],
      (err, row) => {
        if (err) {
          return next(err);
        }
        if (!row) {
          db.run(
            'INSERT INTO users (name) VALUES (?)',
            [req.federatedUser.displayName],
            (err) => {
              if (err) return next(err);

              const id = this.lastID;
              db.run(
                'INSERT INTO federated_credentials (provider, subject, user_id) VALUES (?, ?, ?)',
                ['https://accounts.google.com', req.federatedUser.id, id],
                (err) => {
                  if (err) return next(err);

                  const user = {
                    id: id.toString(),
                    displayName: req.federatedUser.displayName,
                  };
                  req.login(user, (err) => {
                    if (err) return next(err);

                    res.redirect('/');
                  });
                }
              );
            }
          );
        } else {
          db.get(
            'SELECT rowid AS id, username, name FROM users WHERE rowid = ?',
            [row.user_id],
            function (err, row) {
              if (err) return next(err);

              // TODO: Handle undefined row.
              const user = {
                id: row.id.toString(),
                username: row.username,
                displayName: row.name,
              };
              req.login(user, (err) => {
                if (err) return next(err);

                res.redirect('/');
              });
            }
          );
        }
      }
    );
  }
);

module.exports = router;
