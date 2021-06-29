var express = require("express");
var router = express.Router();
var db = require("../../database");

router.get("/", (req, res, next) => {
  console.log("*********GET COUPON API***********");

  db.query(`SELECT * from coupon`, [], function (err, results, fields) {
    if (err) {
      res.status(500).json({
        code: 100,
        message: "Unable to get coupon list",
      });
    } else if (results.length == 0) {
      res.status(200).json({
        code: 200,
        data: [],
      });
    } else {
      console.log(results);
      var current_date_time = new Date();
      console.log(current_date_time);
      let response = results.filter(
        (data) => data.end_date > current_date_time
      );
      res.status(200).json({
        code: 200,
        data: response,
      });
    }
  });
});

module.exports = router;
