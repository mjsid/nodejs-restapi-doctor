var express = require("express");
var db = require("../../database");
var { getRatings } = require("../utils");
var router = express.Router();

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];
const BRAND_IMAGE = "http://dotrx.in/public/";

router.get("/", function (req, res, next) {
  console.log("*******All Brands************");

  db.query(
    `SELECT id, name, image FROM 
     brands`,
    [],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find brands : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch brands",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.brand_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].id);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;
        }

        res.status(200).json({
          code: 200,
          data: data,
        });
      }
    }
  );
});

router.get("/top", function (req, res, next) {
  console.log("*******Top Brands************");

  db.query(
    `SELECT id, name, image FROM 
       brands WHERE top=?`,
    [1],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find top brands : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch top brands",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = BRAND_IMAGE + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].id);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;
        }

        res.status(200).json({
          code: 200,
          data: data,
        });
      }
    }
  );
});

module.exports = router;
