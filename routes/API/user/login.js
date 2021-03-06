const express = require('express');
const router = express.Router();
const cors = require('cors');
router.use(cors());

const db = require('../../../models/index');
const { Op } = require("sequelize");
const ash = require('express-async-handler');

const bcrypt = require('bcrypt');

const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string().min(4).max(16).required(),
  password: Joi.string().min(8).max(256).required()
});

router.post('/', ash(async (req, res, next) => {
  let user = {
    username: req.body.username,
    password: req.body.password
  }

  const validateUserSchema = userSchema.validate(user);

  if (validateUserSchema.error)
  {
    res.send({ error: validateUserSchema.error.details[0].message });
    return;
  }

  user = await db.User.findOne({
    where: {
      username: user.username
    },
    include: [
      { model: db.Avatar }
    ]
  });

  if (!user)
  {
    res.send( { error: "User don't exists." });
    return;
  }

  if (user.Avatar && user.Avatar.data)
  {
    user.Avatar.data = user.Avatar.data.toString('base64');
  }

  let secret = await user.getUserSecret();

  let test = await bcrypt.compare(req.body.password, secret.dataValues.password);

  if (!test)
  {
    res.send( { error: "Password is wrong." });
    return;
  }

  //Destroy other possible tokens
  // const secretList = await db.UserSecret.findAll({
  //   where: {
  //     sessionTokens: {
  //       [Op.substring]: req.session.id
  //     }
  //   }
  // });
  //
  // for (let lostSecret of secretList)
  // {
  //   let sessionTokens = JSON.parse(lostSecret.dataValues.sessionTokens);
  //   delete sessionTokens[req.session.id];
  //   lostSecret.sessionTokens = JSON.stringify(sessionTokens);
  //   await lostSecret.save();
  // }

  let sessionTokens = JSON.parse(secret.dataValues.sessionTokens);
  sessionTokens[req.session.id] = true;
  secret.sessionTokens = JSON.stringify(sessionTokens);
  await secret.save();

  res.send({ user: user, sessionToken: req.session.id });
}));

module.exports = router;
