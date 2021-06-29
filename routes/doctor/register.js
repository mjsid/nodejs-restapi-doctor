var express = require("express");
var router = express.Router();
var db = require("../../database");
var bcrypt = require("bcrypt");

//POST request
router.get("/", function (req, res, next) {
  res.render("registration");
});

// Current date time in YYYY-MM-DD hh:mm:ss format e.g. 2020-10-15 18:10:27
function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

//Registration request
router.post("/", async function (req, res, next) {
  var department_id = req.body["department_id"] || 2;
  var first_name = req.body["first_name"];
  var last_name = req.body["last_name"];
  var email = req.body["email"];
  var password = await bcrypt.hash(req.body["password"], 10);
  var designation = req.body["designation"] || "Doctor";
  var phone = req.body["phone"];
  var gender = req.body["gender"];
  var doctor_department_id = req.body["doctor_department_id"];
  var owner_id = 1;
  var owner_type = "App\\Models\\Doctor";
  var status = 0;
  var language = "en";
  var device_id = req.body["device_id"] || "";
  var lat = req.body["lat"] || "";
  var lng = req.body["lng"] || "";
  var address1 = req.body["address1"] || "";
  var address2 = req.body["address2"] || "";
  var zip = req.body["zip"] || "";
  var city = req.body["city"] || "";
  var state = req.body["state"] || "";
  var created_at = getCurrentTime();
  var updated_at = getCurrentTime();

  if (
    !department_id ||
    !first_name ||
    !last_name ||
    !email ||
    !password ||
    !designation ||
    !phone ||
    !gender ||
    !doctor_department_id ||
    !owner_id ||
    !owner_type ||
    !device_id ||
    !language ||
    !created_at ||
    !updated_at
  ) {
    console.log("Please provide the missing fields");
    res.status(400);
    res.json({ status: 100, message: "Please provide the missing fields" });
  } else {
    // Register new User
    db.query(
      "INSERT INTO `users` (`department_id`, `first_name`, `last_name`, `email`, `password`, `designation`, `phone`, `gender`, `owner_id`, `owner_type`, `status`, `language`, `created_at`, `updated_at`, `device_id`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ",
      [
        department_id,
        first_name,
        last_name,
        email,
        password,
        designation,
        phone,
        gender,
        owner_id,
        owner_type,
        status,
        language,
        created_at,
        updated_at,
        device_id,
      ],
      async function (err, results, fields) {
        if (err) {
          console.log("ERROR fetching query : ");

          if (err["code"] == "ER_DUP_ENTRY") {
            console.log(err);
            var message = "";

            if (err["sqlMessage"].match(/@/g)) {
              const qResult = await db.query(
                `Select designation FROM users WHERE email=?`,
                [email]
              );
              console.log(qResult);

              if (qResult[0].designation == designation) {
                message =
                  "This Email is already in use, please sign in or use a different email";
              } else {
                message =
                  "This Email is already in use with different role. Please try with different email";
              }

              res.status(200);
              res.json({ code: 100, message: message });
            } else if (err["sqlMessage"].match(/'phone'/g)) {
              const qResult = await db.query(
                `Select designation FROM users WHERE phone=?`,
                [phone]
              );
              console.log(qResult);

              if (qResult[0].designation == designation) {
                message =
                  "This Phone Number is already in use, please sign in or use a different phone number";
              } else {
                message =
                  "This Phone Number is already in use with different role. Please try with different phone number";
              }
              res.status(200);
              res.json({
                code: 100,
                message: message,
              });
            } else {
              res.status(200);
              res.json({
                code: 100,
                message: `Unknown Error ${err["sqlMessage"]}`,
              });
            }
          } else {
            res.status(500);
            res.json({ code: 100, message: "Unknown Error Occurred" });
            console.log(err);
          }
        } else {
          var userId = results.insertId;
          var currentTime = getCurrentTime();
          db.query(
            "INSERT INTO `doctors` (`user_id`, `doctor_department_id`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?)",
            [userId, doctor_department_id, currentTime, currentTime],
            async function (err, results, fields) {
              if (err) {
                console.error("ERROR in updating doctors table");
                res.status(500);
                res.json({ code: 100, message: "Unknown Error Occurred " });
              } else {
                console.log("Doctor tables updated successfully");
                console.log(results);
                var doctorId = results.insertId;
                var currentTime = getCurrentTime();
                try {
                  response = await db.query(
                    "INSERT INTO `addresses` (`owner_id`, `owner_type`, `address1`, `address2`, `city`, `zip`, `lat`, `lng`, `state`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      doctorId,
                      "App\\Models\\Doctor",
                      address1,
                      address2,
                      city,
                      zip,
                      lat,
                      lng,
                      state,
                      currentTime,
                      currentTime,
                    ]
                  );
                } catch (err) {
                  console.log("Error while updating address");
                }
                db.query(
                  "UPDATE `users` SET `owner_id`=?, `updated_at`=? WHERE id=?",
                  [doctorId, currentTime, userId],
                  function (err, results, fields) {
                    if (err) {
                      console.error(
                        "ERROR in updating users table with owner id"
                      );
                      res.status(500);
                      res.json({
                        code: 100,
                        message: "Unknown Error Occurred ",
                      });
                    } else {
                      console.log(
                        "Users tables updated successfully with doctor id"
                      );
                      console.log(results);

                      db.query(
                        "INSERT INTO `schedules` (doctor_id, updated_at) VALUES (?, ?)",
                        [doctorId, currentTime],
                        function (err, results, fields) {
                          if (err) {
                            console.error("ERROR in updating schedules table");
                            res.status(500).json({
                              code: 100,
                              message: "Unknown Error Occurred ",
                            });
                          } else {
                            console.log(results);
                            console.log("schedules updated successfully");

                            schedule_id = results.insertId;

                            weekDays = [
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                              "Sunday",
                            ];
                            weekDays.forEach(updateSchedule);

                            function updateSchedule(item, index) {
                              db.query(
                                `INSERT INTO schedule_days (doctor_id, schedule_id, available_on, created_at, updated_at) 
                                VALUES(?, ?, ?, ?, ?)`,
                                [
                                  doctorId,
                                  schedule_id,
                                  item,
                                  currentTime,
                                  currentTime,
                                ],
                                function (err, results, fields) {
                                  if (err) {
                                    console.error(
                                      "ERROR in getting data from schedule days"
                                    );
                                    res.status(500).json({
                                      code: 100,
                                      message:
                                        "Unknown Error Occurred in schedule days",
                                    });
                                  } else {
                                    console.log(results);
                                    console.log(
                                      "schedule days updated successfully"
                                    );
                                  }
                                }
                              );
                            }
                          }
                        }
                      );
                    }

                    console.log(userId);
                    db.query(
                      `INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?) `,
                      [2, "App\\Models\\User", userId],
                      function (err, results, fields) {
                        if (err) {
                          console.log(
                            "ERROR inserting into model_has_roles : ",
                            err
                          );
                          res.status(500).json({
                            code: 100,
                            message:
                              "Doctor registered with errors : model_has_roles",
                          });
                        } else {
                          console.log(results);
                          res.status(200).json({
                            code: 200,
                            message: "New User registered Successfully",
                            user_id: userId,
                          });
                        }
                      }
                    );
                  }
                );
              }
            }
          );
        }
      }
    );
  }
});

module.exports = router;
