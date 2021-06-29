var express = require("express");
var db = require("../../database");
var router = express.Router();

router.get("/", function (req, res, next) {
  var token = req.query.token;
  var id = req.query.id;

  // Current date time in YYYY-MM-DD hh:mm:ss format e.g. 2020-10-15 18:10:27
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);

  db.query(
    `UPDATE users SET status=1, updated_at=?, email_verified_at=? where id=? and token=?`,
    [current_date_time, current_date_time, id, token],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to verify User",
        });
      } else {
        console.log(results);
        if (results.affectedRows == 1) {
          res.status(200).json({
            code: 200,
            message: "Email verification Successful",
          });
        } else {
          res.status(200).json({
            code: 100,
            message: "Email verification Unsuccessful",
          });
        }
      }
    }
  );
});

module.exports = router;
