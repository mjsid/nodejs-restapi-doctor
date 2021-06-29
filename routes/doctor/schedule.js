var express = require("express");
var db = require("../../database");
var router = express.Router();

router.get("/", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT * FROM schedules where doctor_id=? limit 1`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.JSON({
          code: 100,
          message: "Unable to fetch schedule",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/days", function (req, res, next) {
  var doctor_id = req.query.doctor_id;
  var schedule_id = req.query.schedule_id;

  db.query(
    `SELECT * FROM schedule_days WHERE doctor_id=?  && schedule_id=?`,
    [doctor_id, schedule_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.JSON({
          code: 100,
          message: "Unable to fetch schedule days",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

module.exports = router;
