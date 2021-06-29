var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var db = require("../../database");
var { getCurrentTime } = require("../utils");

const AMBULANCE_IMAGE = "http://dotrx.in/public/images/ambulance/";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";

router.get("/pending", function (req, res, next) {
  //route to get pending bookings for ambulance
  //query params : user_id

  var user_id = req.query.user_id;

  db.query(
    `SELECT ac.id as booking_id, a.vehicle_model as vehicle_model, a.vehicle_number as vehicle_number, a.image as image, ac.date as date, ac.amount as amount, ac.from_loc as from_loc, ac.to_loc  as to_loc
    FROM ambulance_calls as ac, ambulances as a, users as u WHERE a.user_id=? && a.user_id=u.id && ac.ambulance_id=a.id && ac.status=? order by ac.date`,
    [user_id, 0],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get pending bookings : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get pending bookings",
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          var img = results[i].image;
          if (img) {
            results[i].image = AMBULANCE_IMAGE + "/" + img;
          } else {
            results[i].image = NO_IMAGE;
          }
        }
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/accept", function (req, res, next) {
  console.log(req.query);

  var booking_id = req.query.booking_id;
  var current_date_time = getCurrentTime();
  // var status = req.body.status;

  db.query(
    `UPDATE ambulance_calls SET status=? WHERE id=?`,
    [2, booking_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to accept booking : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to accept booking",
        });
      } else if (results.affectedRows > 0) {
        console.log(results);
        db.query(
          `SELECT ambulance_id, date, patient_id
          FROM ambulance_calls
          WHERE id = ?`,
          [booking_id],
          (err, results, fields) => {
            if (err) {
              console.log(
                "Ambulance booking confirmed, Unknown error ocurred : ",
                err
              );
              res.status(500).json({
                code: 100,
                message: "Ambulance booking confirmed, Unknown error ocurred",
              });
            } else if (results.length > 0) {
              console.log(results);
              var ambulance_id = results[0].ambulance_id;
              var ambulance_date = results[0].date
                .toISOString()
                .replace("T", " ")
                .substr(0, 19);
              var ambulance_patient_id = results[0].patient_id;
              db.query(
                `SELECT vehicle_number, vehicle_model 
                FROM ambulances
                WHERE id = ?`,
                [ambulance_id],
                (err, results, fields) => {
                  if (err) {
                    console.log(
                      "Ambulance booking confirmed, failed to get ambulance name and number : ",
                      err
                    );
                    res.status(500).json({
                      code: 100,
                      message:
                        "Ambulance booking confirmed, failed to get ambulance name and number :",
                    });
                  } else if (results.length > 0) {
                    console.log(results);
                    var ambulance_name = results[0].vehicle_model;
                    var ambulance_number = results[0].vehicle_number;
                    var ambulance_message = `${ambulance_name} - ${ambulance_number} has been confirmed for ${ambulance_date}. Kindly make the payment`;
                    console.log(`Ambulance booked. ${ambulance_message} `);

                    db.query(
                      `SELECT u.id FROM users as u, patients as p
                      WHERE p.id = ? && p.user_id = u.id`,
                      [ambulance_patient_id],
                      (err, results, fields) => {
                        if (err) {
                          console.log(
                            "Ambulance confirmed, error in fetching user details : ",
                            err
                          );
                          res.status(500).json({
                            code: 100,
                            message:
                              "Ambulance confirmed, error in fetching user details ",
                          });
                        } else if (results.length > 0) {
                          var user_id = results[0].id;
                          console.log(results);
                          db.query(
                            `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
                            VALUES (?, ?, ?, ?, ?)`,
                            [
                              user_id,
                              "ambulance_booking",
                              ambulance_message,
                              current_date_time,
                              current_date_time,
                            ],
                            (err, results, fields) => {
                              if (err) {
                                console.log(
                                  "Ambulance confirmed, error in notification : ",
                                  err
                                );
                                res.status(500).json({
                                  code: 100,
                                  message:
                                    "Ambulance confirmed, error in notification",
                                });
                              } else if (results.insertId > 0) {
                                console.log(
                                  "Ambulance booked, notification sent successfully"
                                );
                                res.status(200).json({
                                  code: 200,
                                  message: ambulance_message,
                                });
                              } else {
                                console.log(results);
                                console.log(
                                  "Ambulance booked, unable to add notification"
                                );
                                res.status(200).json({
                                  code: 100,
                                  message:
                                    "Ambulance booked, unable to add notification",
                                });
                              }
                            }
                          );
                        } else {
                          console.log(results);
                          console.log(
                            "Ambulance booked, error in getting user details"
                          );
                          res.status(200).json({
                            code: 100,
                            message:
                              "Ambulance booked, error in getting user details",
                          });
                        }
                      }
                    );
                  } else {
                    console.log(results);
                    console.log(
                      "Ambulance booking confirmed, failed to get ambulance name and number"
                    );
                    res.status(200).json({
                      code: 100,
                      message:
                        "Ambulance booking confirmed, failed to get ambulance name and number :",
                    });
                  }
                }
              );
            } else {
              console.log(results);
              console.log(
                "Ambulance booking confirmed, failed to get ambulance details"
              );
              res.status(200).json({
                code: 100,
                message:
                  "Ambulance booking confirmed, failed to get ambulance details",
              });
            }
          }
        );
      } else {
        res.status(404).json({
          code: 100,
          message: "Booking not available",
        });
      }
    }
  );
});

router.get("/complete", function (req, res, next) {
  console.log(req.query);

  var booking_id = req.query.booking_id;
  // var status = req.body.status;

  db.query(
    `UPDATE ambulance_calls SET status=? WHERE id=?`,
    [1, booking_id],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to completed booking : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to completed booking",
        });
      } else if (results.affectedRows > 0) {
        try {
          var pres_amount = await db.query(
            `SELECT amount FROM ambulance_calls WHERE id = ? `,
            [booking_id]
          );
          pres_amount = pres_amount[0].amount;
          console.log(pres_amount);

          var ambulance_commission = await db.query(
            `SELECT ambulance_commission 
            FROM users_commission 
            LIMIT 1`
          );
          ambulance_commission = ambulance_commission[0].ambulance_commission;
          console.log(ambulance_commission);

          var payable_amount =
            pres_amount - (pres_amount * ambulance_commission) / 100;

          var booking_data = await db.query(
            `SELECT patient_id, ambulance_id FROM ambulance_calls WHERE id = ?`,
            [booking_id]
          );
          var patient_id = booking_data[0].patient_id;
          var ambulance_id = booking_data[0].ambulance_id;
          var commissionData = await db.query(
            `INSERT INTO commission_history (model_id, department_id,	patient_id,
              relevant_table_id, total_amount, commission_percentage, payable_amount, 
              created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ambulance_id,
              4,
              patient_id,
              booking_id,
              pres_amount,
              ambulance_commission,
              payable_amount,
              getCurrentTime(),
            ]
          );
          console.log(commissionData);
          res.status(200).json({
            code: 200,
            message: "Booking completed",
          });
        } catch (err) {
          console.log(" Unknown error occurred. :", err);
          res.status(200).json({
            code: 100,
            message: "Booking completion failed",
          });
        }
      } else {
        res.status(404).json({
          code: 100,
          message: "Booking not available",
        });
      }
    }
  );
});
router.get("/reject", function (req, res, next) {
  console.log(req.body);

  var booking_id = req.query.booking_id;
  // var status = req.body.status;

  db.query(
    `UPDATE ambulance_calls SET status=? WHERE id=?`,
    [3, booking_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to reject booking : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to reject booking",
        });
      } else if (results.affectedRows > 0) {
        res.status(200).json({
          code: 200,
          message: "Booking rejected",
        });
      } else {
        res.status(404).json({
          code: 100,
          message: "Booking not available",
        });
      }
    }
  );
});

router.get("/confirm", function (req, res, next) {
  var user_id = req.query.user_id;

  db.query(
    `SELECT ac.id as booking_id, a.vehicle_model as vehicle_model, a.vehicle_number as vehicle_number, a.image as image, ac.date as date, ac.amount as amount, ac.from_loc as from_loc, ac.to_loc  as to_loc
    FROM ambulance_calls as ac, ambulances as a, users as u WHERE a.user_id=? && a.user_id=u.id && ac.ambulance_id=a.id && ac.status=? order by ac.date`,
    [user_id, 4],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get confirmed bookings : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get confirmed bookings",
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          var img = results[i].image;
          if (img) {
            results[i].image = AMBULANCE_IMAGE + "/" + img;
          } else {
            results[i].image = NO_IMAGE;
          }
        }
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/history", function (req, res, next) {
  var user_id = req.query.user_id;

  db.query(
    `SELECT ac.id as booking_id, a.vehicle_model as vehicle_model, a.vehicle_number as vehicle_number, a.image as image, ac.date as date, ac.amount as amount, ac.from_loc as from_loc, ac.to_loc  as to_loc
    FROM ambulance_calls as ac, ambulances as a, users as u WHERE a.user_id=? && a.user_id=u.id && ac.ambulance_id=a.id && ac.status=? order by ac.date`,
    [user_id, 1],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get booking history : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get booking history",
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          var img = results[i].image;
          if (img) {
            results[i].image = AMBULANCE_IMAGE + "/" + img;
          } else {
            results[i].image = NO_IMAGE;
          }
        }
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});
module.exports = router;
