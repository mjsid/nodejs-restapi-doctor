console.log("CALLING ROUTER/DOCTOR/USER.JS");
var express = require("express");
var db = require("../../database");
var router = express.Router();

console.log(db);

/* GET users listing. */
router.get("/", function (req, res, next) {
  db.query("SELECT * from users ", function (err, results, fields) {
    if (err) {
      console.log("ERROR fetching query : ");
      console.log(err);
      res.status(500);
      res.json({ code: 100, message: "Unable to get users" });
    } else {
      console.log(results);
      res.status(200);
      res.json({
        code: 200,
        data: results,
      });
    }
  });
});

router.get("/:id", function (req, res, next) {
  let id = req.params.id;
  db.query("SELECT * from `users` where `id` = ?", [id], function (
    err,
    results,
    fields
  ) {
    if (err) {
      console.log("ERROR fetching query : ");
      console.log(err);
      res.status(500);
      res.json({ status: 100, message: "Unable to get users" });
    } else {
      console.log(results);
      res.status(200);
      res.json({ code: 200, data: results });
    }
  });
});

module.exports = router;
