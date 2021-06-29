var express = require("express");
var db = require("../../database");
var router = express.Router();

function getRatings(doctor_id, cb) {
  db.query(
    `SELECT sum(rating) as rating_sum, count(*) as total_rating FROM reviews WHERE doctor_id=?`,
    [doctor_id],
    function (err, results, fields) {
      if (results.length > 0) {
        var rating = (results[0].rating_sum * 1.0) / results[0].total_rating;
        cb(rating, results[0].total_rating );
      } else {
        cb(null);
      }
    }
  );
}

function getAppointmentsCount(doctor_id, cb) {
  db.query(
    `SELECT count(id) as count FROM appointments WHERE doctor_id=?`,
    [doctor_id],
    function (err, results, fields) {
      if (results.length > 0) {
        cb(results[0].count);
      } else {
        cb(null);
      }
    }
  );
}

function getRatingsByStar(doctor_id, cb) {
  db.query(
    `SELECT rating, count(*) as count FROM reviews WHERE doctor_id=? GROUP BY rating`,
    [doctor_id],
    function (err, results, fields) {
        var star_ratings = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
        
        console.log(results);
      if (err) {
          console.log(err);
          cb(star_ratings);
      }
      else {
        
        for (var i = 0; i < results.length; i++) {
          star_ratings[results[i].rating.toString()] = results[i].count;
        }
        cb(star_ratings);
      } 
    }
  );
}

router.get("/", function (req, res, next) {
  var doctor_id = req.query.doctor_id;
  var review_data = {};
  db.query(
    `SELECT r.id as review_id, r.rating, r.description, 
            r.updated_at, u.first_name, u.last_name FROM reviews as r, 
            patients as p, users as u WHERE r.doctor_id=? 
            && r.patient_id=p.id && p.user_id=u.id`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to fetch review",
        });
      } else {
        console.log(results);
        review_data.reviews = results;
        getRatingsByStar(doctor_id, function (star_ratings) {
          console.log("Star_ratings : ", star_ratings);
          review_data.star_ratings = star_ratings;
          getAppointmentsCount(doctor_id, function (appointments_booked) {
            console.log("Appointments_booked : ", appointments_booked);
            review_data.appointments_booked = appointments_booked;
            getRatings(doctor_id, function (total_ratings, people_rated) {
              console.log("Total Ratings : ", total_ratings);
              review_data.total_ratings = total_ratings || 0;
              review_data.people_rated = people_rated;
              res.status(200).json({
                code: 200,
                data: review_data,
              });
            });
          });
        });
      }
    }
  );
});

router.post("/delete", function (req, res, next) {
  var review_id = req.query.review_id;

  db.query(`DELETE FROM reviews WHERE id=?`, [review_id], function (
    err,
    results,
    fields
  ) {
    if (err) {
      console.log("ERROR fetching query : ");
      console.log(err);
      res.status(500);
      res.json({
        code: 100,
        message: "Unable to delete review ",
      });
    } else {
      if (results.affectedRows == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: `No such review exist`,
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: `Review deleted successfully`,
        });
      }
    }
  });
});

module.exports = router;
