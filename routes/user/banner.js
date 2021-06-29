var express = require("express");
var router = express.Router();
var db = require("../../database");

const BANNER_PATH = "http://dotrx.in/public/images/banners/";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";

router.get("/", (req, res, next) => {
  console.log("***********************BANNER API****************");
  var type = req.query.type;
  db.query(
    `SELECT mobile_image FROM banners WHERE type=?`,
    [type],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to fetch banner images : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch banners",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          if (data[i].mobile_image) {
            data[i].image = BANNER_PATH + data[i].mobile_image;
          } else {
            data[i].image = NO_IMAGE;
          }
          delete data[i].mobile_image;
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
