var express = require("express");
var db = require("../../database");
var router = express.Router();

/* Provide all the Departments */
router.get("/", function (req, res, next) {
  db.query(
    "SELECT id, title FROM `doctor_departments` order by title",
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500).json({
          code: 100,
          message: "Error fetching departments",
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

router.get("/doctor", function (req, res, next) {
  db.query(
    "SELECT id,title FROM `doctor_departments` order by title",
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500).json({
          code: 100,
          message: "Error fetching departments",
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
