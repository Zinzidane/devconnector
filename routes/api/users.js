const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const User = require('../../models/User');
const keys = require('../../config/keys');

const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

// @route GET api/users/test
// @desc Tests user route
// @access Public
router.get('/test', (req, res) => res.json({
  message: 'users works'
}));

// @route POST api/users/register
// @desc Registers user
// @access Public
router.post('/register', (req, res) => {
  const {errors, isValid} = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({email: req.body.email}).then(user => {
    if (user) {
      errors.email = 'Email already exists';
      return res.status(400).json(errors);
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        avatar: avatar,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrupt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser.save()
            .then(user => res.json(user))
            .catch(error => console.log(error));
        });
      });
    }
  })
});

// @route POST api/users/login
// @desc Login user / Returning JWT Token
// @access Public
router.post('/login', (req, res) => {
  const {errors, isValid} = validateLoginInput(req.body);

  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email})
    .then(user => {
      if (!user) {
        errors.email = 'User not found';
        return res.status(404).json(errors);
      }

      bcrypt.compare(password, user.password)
        .then(isMatch => {
          if (isMatch) {
            // User match
            const payload = {id: user.id, name: user.name, avatar: user.avatar}
            // Sign token
            jwt.sign(payload, keys.secretOrKey, { expiresIn: 60 * 60}, (err, token) => {
              res.json({
                success: true,
                token: 'Bearer ' + token
              });
            });
          } else {
            errors.password = 'Password incorrect';
            return res.status(400).json(errors);
          }
        });
    });
});

// @route GET api/users/current
// @desc  Returns current user
// @access Private
router.get('/current', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  });
})


module.exports = router;