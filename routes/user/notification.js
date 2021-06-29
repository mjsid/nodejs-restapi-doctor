var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime } = require("../utils");

router.get("/all", function (req, res, next) {
  //route to get pending bookings for ambulance
  //query params : user_id

  var userId = req.query.userId;

  db.query(
    `SELECT n.*
    FROM notifications as n, patients as p
    WHERE n.user_id = p.user_id && p.id = ?
    order by n.updated_at desc`,
    [userId],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get notifications for user : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get notifications for user ",
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
