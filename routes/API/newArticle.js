const express = require('express');
const router = express.Router();
const cors = require('cors');
router.use(cors());

const db = require('../../models/index');
const { Op } = require("sequelize");
const ash = require('express-async-handler');

const Joi = require('joi');

const articleSchema = Joi.object({
  title: Joi.string().min(4).max(16).required(),
  description: Joi.string().min(4).max(255).required(),
  price: Joi.number().integer().min(1).max(1000).required(),
  geolocation: Joi.string(),
  categories: Joi.string()
});

router.post('/', ash(async (req, res, next) => {
  const user = await db.User.findOne({
    where: {
      sessionTokens: {
        [Op.substring]: req.session.id
      }
    }
  });

  if (!user)
  {
    res.send({ error: "You are not connected." });
    return;
  }
  console.log('salut');

  let article = {
    title: req.body.title,
    description: req.body.description,
    price: parseInt(req.body.price),
    geolocation: req.body.geolocation,
    categories: req.body.categories
  }

  let images = [];
  if (req.body)
  {
    let { image1, image2, image3 } = req.body;
    images = [image1, image2, image3];
  }


  const validateArticleSchema = articleSchema.validate(article);

  if (validateArticleSchema.error)
  {
    res.send({ error: validateArticleSchema.error.details[0].message });
    return;
  }

  article = await db.Article.create(article);
  await user.addArticle(article);

  let image;
  for(let i=0; i < images.length; i++)
  {
    image = images[i];
    if (image)
    {
      image = await db.Image.create({ data: new Buffer(req.body.image1).toString('base64') });
      await article.addImage(image);
    }
  }

  res.send({ image: new Buffer(req.body.image1).toString('base64'), data: image.dataValues.data });
}));

module.exports = router;
