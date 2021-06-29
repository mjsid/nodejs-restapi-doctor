var express = require("express");
var db = require("../../database");
var router = express.Router();

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];

router.get("/", function (req, res, next) {
  console.log("*************Category API*************");

  db.query(
    `SELECT id as category_id, name, image FROM categories WHERE is_active=?`,
    [1],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to find categories : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch categories",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.category_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
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
